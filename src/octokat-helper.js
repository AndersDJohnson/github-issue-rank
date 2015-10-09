import async from 'async';

class OctokatHelper {
  constructor(octokat) {
    this.octokat = octokat;
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

    this.fetchAll(cacheKey, requester, each, done);
  }

  getIssues(owner, repo, each, done) {
    var cacheKey = 'issues:' + owner + '/' + repo;

    var requester = () => {
      return this.octokat
        .repos(owner, repo)
        .issues
        .fetch();
    };

    this.fetchAll(cacheKey, requester, each, done);
  }

  getIssuesThenComments(
    owner, repo, eachIssues, eachComments, eachIssueComments, done
  ) {
    done = done || () => {};

    var cancelled = false;
    var cancel = () => {
      cancelled = true;
    };

    this.getIssues(
      owner, repo,
      function (err, issues) {
        issues = issues.map(issue => ({issue}));
        eachIssues(err, issues, cancel);
      },
      (err, issues) => {
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
                (err, comments, cancel2) => {
                  var cancel1and2 = () => {
                    cancel();
                    cancel2();
                  };
                  result.comments = comments;
                  memo.push(result);
                  eachComments(err, memo, cancel1and2, issue);
                },
                (err, comments, cancel2) => {
                  var cancel1and2 = () => {
                    cancel();
                    cancel2();
                  };
                  result.comments = comments;
                  eachIssueComments(err, memo, cancel1and2, issue);
                  cb(err, memo);
                }
              );
            }
            else {
              eachComments(null, m2, cancel, issue, null);
              cb(err, memo);
            }
          },
          (err, results) => {
            if (err) return done(err);
            done(err, results, cancel);
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

    async.doWhilst(
      function (cb) {
        promiser().then(
          function (data) {
            allData = allData.concat(data);
            each(null, allData, cancel);
            promiser = data.nextPage;
            cb();
          },
          function (err) {
            each(err, null, cancel);
            cb(err, null, cancel);
          }
        );
      },
      function () {
        return promiser;
      },
      function (err) {
        if (err) throw err;

        done(err, allData, cancel);
      }
    );
  }

};

export {OctokatHelper};
