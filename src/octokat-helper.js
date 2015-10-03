import async from 'async';

class OctokatHelper {
  constructor(octokat) {
    this.octokat = octokat;
  }

  getComments(owner, repo, issue, done) {
    var cacheKey = 'comments:' + owner + '/' + repo + '/' + issue;

    var requester = () => {
      return this.octokat
        .repos(owner, repo)
        .issues(issue)
        .comments
        .fetch();
    };

    this.fetchAll(cacheKey, requester, done);
  }

  getIssues(owner, repo, done) {
    var cacheKey = 'issues:' + owner + '/' + repo;

    var requester = () => {
      return this.octokat
        .repos(owner, repo)
        .issues
        .fetch();
    };

    this.fetchAll(cacheKey, requester, done);
  }

  getIssuesThenComments(owner, repo, each, done) {
    done = done || () => {};

    var cancelled = false;
    var cancel = () => {
      cancelled = true;
    };

    this.getIssues(
      owner, repo,
      (err, issues) => {
        console.log(err, issues);

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
            if (issue.comments) {
              this.getComments(
                owner, repo, issue.number,
                (err, comments) => {
                  result.comments = comments;
                  memo.push(result);
                  each(err, memo, cancel, issue, comments);
                  cb(err, memo);
                }
              );
            }
            else {
              memo.push(result);
              each(null, memo, issue, null);
              cb(err, memo);
            }
          },
          (err, results) => {
            if (err) return done(err);
            done(err, results);
          }
        );
      }
    );
  }

  fetchAll(cacheKey, requester, done) {
    var octokat = this.octokat;
    var promiser = () => { return requester(); };
    var allData = [];

    async.doWhilst(
      function (cb) {
        promiser().then(
          function (data) {
            allData = allData.concat(data);
            promiser = data.nextPage;
            cb();
          },
          function (err) {
            cb(err);
          }
        );
      },
      function () {
        return promiser;
      },
      function (err) {
        if (err) throw err;

        done(err, allData);
      }
    );
  }

};

export {OctokatHelper};
