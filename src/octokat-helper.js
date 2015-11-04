import _ from 'lodash';
import async from 'async';
import compose from './compose';

class OctokatMemoryCache {
  constructor() {
    this.cache = {};
  }

  add(key, value) {
    return; // disabling cache for now.
    console.log(key, value);
    this.cache[key] = value;
  }

  get(key) {
    return this.cache[key];
  }
}


class OctokatHelper {
  constructor(octokat) {
    this.octokat = octokat;
    window.octokatMemoryCache = this.octokatMemoryCache = new OctokatMemoryCache();
  }

  parseError(err) {
    // console.log('original err', err, err.status);
    try {
      var parsed = JSON.parse(err.message);
      err.message = parsed.message;
    }
    catch (e) {}
    // console.log('parsed err', err, err.status);
    return err;
  }

  getComments(owner, repo, issue, each, done) {
    var cacheKey = 'comments:' + owner + '/' + repo + '/' + issue;

    var cached = this.octokatMemoryCache.get(cacheKey);
    if (cached) {
      var cancel = () => {};
      var progress = {value: 1, max: 1};
      cached.forEach(() => {
        each(null, {data: cached, cancel, progress});
      });
      done(null, {data: cached, cancel, progress});
      return;
    }

    var requester = () => {
      return this.octokat
        .repos(owner, repo)
        .issues(issue)
        .comments
        .fetch();
    };

    this.fetchAll(cacheKey, requester,
      (err, result) => {
        if (err) return done(this.parseError(err));
        var {data, cancel, progress} = result;
        data.forEach(d => {
          d.owner = owner;
          d.repo = repo;
        });
        each(err, {data, cancel, progress});
      },
      (err, result) => {
        if (err) return done(this.parseError(err));
        var {data, cancel, progress} = result;
        this.octokatMemoryCache.add(cacheKey, data);
        done(err, {data, cancel, progress});
      }
    );
  }

  getIssues(owner, repo, each, done) {
    var cacheKey = 'issues:' + owner + '/' + repo;

    var cached = this.octokatMemoryCache.get(cacheKey);
    if (cached) {
      var cancel = () => {};
      var progress = {value: 1, max: 1};
      cached.forEach(() => {
        each(null, {data: cached, cancel, progress});
      });
      done(null, {data: cached, cancel, progress});
      return;
    }

    var requester = () => {
      return this.octokat
        .repos(owner, repo)
        .issues
        .fetch();
    };

    this.fetchAll(cacheKey, requester,
      (err, result) => {
        if (err) return done(this.parseError(err));
        var {data, cancel, progress} = result;
        data.forEach(d => {
          d.owner = owner;
          d.repo = repo;
        });
        each(err, {data, cancel, progress});
      },
      (err, result) => {
        if (err) return done(this.parseError(err));
        var {data, cancel, progress} = result;
        this.octokatMemoryCache.add(cacheKey, data);
        done(err, {data, cancel, progress});
      }
    );
  }

  getIssuesThenComments(
    owner, repo, onProgress, done
  ) {
    done = done || () => {};

    var cancelled = false;
    var cancel = () => {
      cancelled = true; // i then c
    };

    var totalProgress = {
      value: 0,
      max: null
    };

    this.getIssues(
      owner, repo,
      (err, result) => {
        if (err) return done(this.parseError(err));
        var {data: issues, cancel, progress} = result || {};
        issues = issues.map(issue => ({issue}));
        onProgress(err, {
          type: 'issue',
          data: issues,
          cancel,
          progress
        });
      },
      (err, result) => {
        if (err) return done(this.parseError(err));
        var {data: issues, cancel: cancel2, progress} = result;

        var numIssues = issues.length;

        totalProgress.max = numIssues;

        async.reduce(issues,
          [],
          (memo, issue, cb) => {
            if (cancelled) {
              cb(null, memo);
              return;
            }
            var memoResult = {
              issue
            };
            var m2 = () => {};
            if (issue.comments) {
              this.getComments(
                owner, repo, issue.number,
                (err, result) => {
                  if (err) return done(this.parseError(err));
                  var {data: comments, cancel: cancel3, progress} = result;
                  totalProgress.value += (1 / (progress.max));
                  memoResult.comments = comments;
                  memo.push(memoResult);
                  onProgress(err, {
                    type: 'comments',
                    data: memo,
                    cancel: compose(cancel, cancel2, cancel3),
                    progress: totalProgress
                  });
                },
                (err, result) => {
                  if (err) return done(this.parseError(err));
                  var {data: comments, cancel: cancel3, progress} = result;
                  memoResult.comments = comments;
                  onProgress(err, {
                    type: 'issue-comments',
                    data: memo,
                    cancel: compose(cancel, cancel2, cancel3),
                    progress: totalProgress
                  });
                  cb(err, memo);
                }
              );
            }
            else {
              totalProgress.value += 1;
              onProgress(null, {
                type: 'comments',
                data: memo,
                cancel,
                progress: totalProgress
              });
              cb(err, memo);
            }
          },
          (err, results) => {
            // if (err) return done(this.parseError(err));
            done(this.parseError(err), {
              data: results,
              cancel: compose(cancel, cancel2),
              progress: totalProgress
            });
          }
        );
      }
    );
  }

  fetchAll(cacheKey, requester, each, done) {
    var octokat = this.octokat;
    var promiser = () => { return requester(); };
    var allData = [];

    var cancelled = false;
    var cancel = () => {
      cancelled = true; // fetchall
    };

    var progress = {
      value: 0,
      max: null
    };

    async.doWhilst(
      (cb) => {
        promiser().then(
          (data) => {
            progress.value += 1;
            var max;
            if (data.lastPageUrl) {
              max = data.lastPageUrl.match(/page=(\d+)/);
              max = max[1];
              max = parseFloat(max);
              progress.max = progress.max || max;
            }
            else {
              progress.max = 1;
            }
            allData = allData.concat(data);
            each(null, {
              data: allData,
              cancel,
              progress
            });
            promiser = data.nextPage;
            cb();
          },
          (err) => {
            if (err) return cb(this.parseError(err));
            each(err, {data: null, cancel, progress});
            cb(err, null);
          }
        );
      },
      () => {
        return (! cancelled) && promiser;
      },
      (err) => {
        if (err) return done(this.parseError(err));

        done(err, {data: allData, cancel, progress});
      }
    );
  }

};

export {OctokatHelper};
