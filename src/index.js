(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['octokat', 'react'], function (Octokat, React) {
            return (root.githubIssueRank = factory(Octokat, React));
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(require('octokat'), require('react'));
    } else {
        // Browser globals
        root.githubIssueRank = factory(Octokat, React);
    }
}(this, function (Octokat, React) {

  var out = {};

  var hasVote = out.hasVote = function (str) {

    var lines = str.split('\n');

    var found = false;

    lines.forEach(function (line) {
      if (found) return;
      var isQuote = line.match(/^\s*>/);
      if (isQuote) return;
      // found = line.match(/(^|[\W\b])(\+1|:\+1:|:thumbsup:|👍)([\W\b]|$)/g);
      found = found || line.match(/(^|[\W\b])(\+1|:\+1:|:thumbsup:|\uD83D\uDC4D)([\W\b]|$)/g);
    });

    return found;

    // return !! str.match(/(^|[\b])(\+1|:\+1:|:thumbsup:|👍)([\b]|$)/g);
    // return !! str.match(/(^|[\W\b])(\+1|:\+1:|:thumbsup:|👍)([\W\b]|$)/g);
    // return 
  };

  // return out;



  var IssueComponent = React.createClass({
    render: function () {
      var issue = this.props.issue;
      var voteCount = this.props.voteCount;
      return (
        <div>
          <a target="_blank"
            href={issue.htmlUrl}
          >
            {issue.number}: {issue.title}
          </a>
          &nbsp;
          (+{voteCount} / {issue.comments})
        </div>
      );
    }
  });



  var octo = new Octokat({
    // username: "USER_NAME",
    // password: "PASSWORD"
    //
    // token: 'XXXXXXXX'
  });


  var withComments = function (comments) {
    getVoteCountForComment(comments);
  };


  var getVoteCountForComment = function (comments) {
    // console.log(comments);

    var voteCount = 0;

    var alreadyUsers = {};

    comments.forEach(function (comment) {
      var body = comment.body;

      var login = comment.user.login;

      // console.log('comment', comment);

      if (alreadyUsers[login]) {
        return;
      }

      var thisHasVote = hasVote(body);
      if (thisHasVote) {
        // console.log('has vote', thisHasVote, body);
        // if (comment.issueUrl.match(/\/2$/)) {
        //   console.log('comment', login, comment.body);
        // }

        alreadyUsers[login] = true;

        voteCount += 1;
      }
    });

    return voteCount;
  };


  out.run = function () {
    // getComments(
    //   //'AndersDJohnson', 'magnificent.js', 32,
    //   'isaacs', 'github', 9,
    //   function (err, comments) {
    //     if (err) throw err;
    //     withComments(comments);
    //   }
    // );
    // getIssues(
    //   'AndersDJohnson', 'magnificent.js',
    //   function (err, issues) {
    //     console.log(err, issues);
    //   }
    // );
    getIssuesThenComments(
      'isaacs', 'github', 
      function (err, issue, comments) {
        // console.log('eachIssueComment', issue, comments);
      },
      function (err, results) {
        results = _.sortBy(results, function (r) { return r.issue.number; });
        console.log('results', results);

        results.forEach(function (result) {
          var voteCount = 0;
          if (result.comments) {
            voteCount = getVoteCountForComment(result.comments);
          }
          result.voteCount = voteCount;
        });

        var components = [];

        results.forEach(function (result) {
          components.push(
            <IssueComponent issue={result.issue} voteCount={result.voteCount} />
          );
        });

        React.render(
          <div>{components}</div>
          ,
          document.getElementById('wrap')
        );
      }
    );
  };


  function getIssuesThenComments(owner, repo, eachIssueComments, done) {
    done = done || function () {};
    getIssues(
      owner, repo,
      function (err, issues) {
        console.log(err, issues);
        
        async.map(issues,
          function (issue, cb) {
            if (issue.comments) {   
              getComments(
                owner, repo, issue.number,
                function (err, comments) {
                  // console.log(err, comments);
                  eachIssueComments(err, issue, comments);
                  cb(err, {
                    issue: issue,
                    comments: comments
                  });
                }
              );
            }
            else {
              eachIssueComments(null, issue, null);
              cb(null, {
                issue: issue
              });
            }
          },
          function (err, results) {
            if (err) return done(err);
            done(err, results);
          }
        );
      }
    );
  };


  function getData(cacheKey, onOcto, done) {
    // console.log(cacheKey);

    var cached = localStorage.getItem(cacheKey);

    // console.log(cached);

    if (cached) {
      done(null, JSON.parse(cached));
      return;
    }

    var promiser = function () { return onOcto(octo); };
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

        localStorage.setItem(cacheKey, JSON.stringify(allData));

        done(err, allData);
      }
    );
  };


  function getComments(owner, repo, issue, done) {

    var cacheKey = 'comments:' + owner + '/' + repo + '/' + issue;

    var onOcto = function (octo) {
      return octo
        .repos(owner, repo)
        .issues(issue)
        .comments
        .fetch();
    };

    getData(cacheKey, onOcto, done);
  };


  function getIssues(owner, repo, done) {

    var cacheKey = 'issues:' + owner + '/' + repo;

    var onOcto = function (octo) {
      return octo
        .repos(owner, repo)
        .issues
        .fetch();
    };

    getData(cacheKey, onOcto, done);
  };


  return out;

}));
