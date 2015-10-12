import async from 'async';

class OctokatHelper {
  constructor(octokat) {
    this.octokat = octokat;
  }

  parseError(err) {
    try {
      err = JSON.parse(err.message);
    }
    catch (e) {}
    return err;
  }

  getComments(owner, repo, issue, each, done) {
    var cacheKey = 'comments:' + owner + '/' + repo + '/' + issue;

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
      done
    );
  }

  getIssues(owner, repo, each, done) {
    var cacheKey = 'issues:' + owner + '/' + repo;

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
      done
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
                  totalProgress.value += (1 / (progress.max));
                  if (err) return done(this.parseError(err));
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
