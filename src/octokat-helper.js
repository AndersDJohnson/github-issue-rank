import _ from 'lodash';
import async from 'async';

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
        each(null, cached, cancel, progress);
      });
      done(null, cached, cancel, progress);
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
      (err, data, cancel, progress) => {
        if (err) return done(this.parseError(err));
        data.forEach(d => {
          d.owner = owner;
          d.repo = repo;
        });
        each(err, data, cancel, progress);
      },
      (err, data, cancel, progress) => {
        this.octokatMemoryCache.add(cacheKey, data);
        done(err, data, cancel, progress);
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
        each(null, cached, cancel, progress);
      });
      done(null, cached, cancel, progress);
      return;
    }

    var requester = () => {
      return this.octokat
        .repos(owner, repo)
        .issues
        .fetch();
    };

    this.fetchAll(cacheKey, requester,
      (err, data, cancel, progress) => {
        if (err) return done(this.parseError(err));
        data.forEach(d => {
          d.owner = owner;
          d.repo = repo;
        });
        each(err, data, cancel, progress);
      },
      (err, data, cancel, progress) => {
        this.octokatMemoryCache.add(cacheKey, data);
        done(err, data, cancel, progress);
      }
    );
  }

  getIssuesThenComments(
    owner, repo, eachIssues, eachComments, eachIssueComments, done
  ) {
    done = done || () => {};

    var cancelled = false;
    var cancel = () => {
      cancelled = true;
    };

    var totalProgress = {
      value: 0,
      max: null
    };

    this.getIssues(
      owner, repo,
      (err, issues, cancel, progress) => {
        if (err) return done(this.parseError(err));
        issues = issues.map(issue => ({issue}));
        eachIssues(err, issues, cancel, progress);
      },
      (err, issues, cancel, progress) => {
        if (err) return done(this.parseError(err));

        var numIssues = issues.length;

        totalProgress.max = numIssues;

        async.reduce(issues,
          [],
          (memo, issue, cb) => {
            if (cancelled) {
              cb(null, memo);
              return;
            }
            var result = {
              issue
            };
            var m2 = () => {};
            if (issue.comments) {
              this.getComments(
                owner, repo, issue.number,
                (err, comments, cancel2, progress) => {
                  if (err) return done(this.parseError(err));
                  totalProgress.value += (1 / (progress.max));
                  var cancel1and2 = () => {
                    cancel();
                    cancel2();
                  };
                  result.comments = comments;
                  memo.push(result);
                  eachComments(err, memo, cancel1and2, totalProgress, issue);
                },
                (err, comments, cancel2, progress) => {
                  if (err) return done(this.parseError(err));
                  var cancel1and2 = () => {
                    cancel();
                    cancel2();
                  };
                  result.comments = comments;
                  eachIssueComments(err, memo, cancel1and2, totalProgress, issue);
                  cb(err, memo);
                }
              );
            }
            else {
              totalProgress.value += 1;
              eachComments(null, m2, cancel, totalProgress, issue, null);
              cb(err, memo);
            }
          },
          (err, results) => {
            // if (err) return done(this.parseError(err));
            done(err, results, cancel, totalProgress);
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
      cancelled = true;
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
            each(null, allData, cancel, progress);
            promiser = data.nextPage;
            cb();
          },
          (err) => {
            if (err) return cb(this.parseError(err));
            each(err, null, cancel, progress);
            cb(err, null);
          }
        );
      },
      () => {
        return promiser;
      },
      (err) => {
        if (err) return done(this.parseError(err));

        done(err, allData, cancel, progress);
      }
    );
  }

};

export {OctokatHelper};
