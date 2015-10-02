import Octokat from 'octokat';
import React from 'react';
import async from 'async';
import _ from 'lodash';
// import OAuth from 'oauth-js';
// import OAuth from 'oauthio';
// import OAuth from '../bower_components/oauth-js/dist/oauth.js';
import {OctokatCacheHandler} from './octokat-cache-handler';
import {fetchAll} from './octokat-fetch-all';
import Griddle from 'griddle-react';
import { Router, Route, Link } from 'react-router';


var GitHubIssueRank = (function () {

  var out = {};

  var hasVote = out.hasVote = function (str) {

    var lines = str.split('\n');

    var found = false;

    lines.forEach(function (line) {
      if (found) return;
      var isBlockQuote = line.match(/^\s*>/);
      if (isBlockQuote) return;
      found = found || line.match(/(^|[\W\b])(\+1|:\+1:|:thumbsup:|\uD83D\uDC4D)([\W\b]|$)/g);
      // TODO: Ignore +1's within quotation marks?
    });

    return found;
  };



  var octokat;
  var githubAccessToken;




  var withComments = function (comments) {
    getVoteCountForComment(comments);
  };


  var getVoteCountForComment = function (comments) {

    var voteCount = 0;

    var alreadyUsers = {};

    comments.forEach(function (comment) {
      var body = comment.body;

      var login = comment.user.login;

      if (alreadyUsers[login]) {
        return;
      }

      var thisHasVote = hasVote(body);
      if (thisHasVote) {

        alreadyUsers[login] = true;

        voteCount += 1;
      }
    });

    return voteCount;
  };


  var postAuth = function (options) {

  };


  var showRepo = function (owner, repo, callback) {

    getIssuesThenComments(
      owner,
      repo,
      function (err, issue, comments) {
        // console.log('eachIssueComment', issue, comments);
      },
      function (err, results) {
        withIssuesAndComments(err, results, callback);
      }
    );

  };


  var withIssuesAndComments = function (err, results, callback) {

    results.forEach(function (result) {
      var voteCount = 0;
      if (result.comments) {
        voteCount = getVoteCountForComment(result.comments);
      }
      result.voteCount = voteCount;
    });

    results = _.sortBy(results, function (result) {
      return -1 * result.voteCount;
    });

    var components = [];

    var rows = [];

    results.forEach(function (result) {
      var issue = result.issue;
      var voteCount = result.voteCount;

      // var ratio = voteCount / issue.comments;

      rows.push({
        number: issue.number||'',
        title: issue.title||'',
        htmlUrl: issue.htmlUrl||'',
        voteCount: voteCount ||'',
        // comments: issue.comments||'',
        // ratio:ratio ||''
      });
    });

    callback(err, rows);
  };


  out.render = function () {
    var AppRoute = React.createClass({
      componentDidMount() {
        console.log(this.props.params);
      },

      render() {
        return (
          <div>
            <h1><Link to="/">GitHub Issue Rank</Link></h1>

            <ul>
              <li>
                <Link to={`/oauth-io/oauth-js`}>/oauth-io/oauth-js</Link>
              </li>
            </ul>

            {this.props.children}
          </div>
        )
      }
    });


    var NoRoute = React.createClass({
      componentDidMount() {
        console.log(this.props.params);
      },

      render() {
        return (
          <h1>404</h1>
        )
      }
    });

    var LinkComponent = React.createClass({
      render: function () {
        return <a href={this.props.rowData.htmlUrl} target="_blank">{this.props.data}</a>;
      }
    });

    var RepoRoute = React.createClass({

      getInitialState() {
        return {};
      },

      componentDidMount() {
        var params = this.props.params;
        var owner = params.owner;
        var repo = params.repo;
        console.log('RepoRoute', this.props.params);

        showRepo(owner, repo, (err, rows) => {
          this.setState({rows})
        });
      },

      render() {

          var columnMetadata = [
          {
            columnName: 'number',
            displayName: '#',
            customComponent: LinkComponent,
            cssClassName: 'griddle-column-number'
          },
          {
            columnName: 'title',
            displayName: 'Title',
            customComponent: LinkComponent,
            cssClassName: 'griddle-column-title'
          },
          {
            columnName: 'voteCount',
            displayName: '# Votes',
            customComponent: LinkComponent,
            cssClassName: 'griddle-column-voteCount'
          }
        ];

        var columns = [
          'number',
          'title',
          'voteCount'
        ];

        return (
          <div>
            <h2>{this.props.params.owner}/{this.props.params.repo}</h2>

            <Griddle
              results={this.state.rows}
              columnMetadata={columnMetadata}
              columns={columns}
              resultsPerPage={25}
            />
          </div>
        )
      }
    });


    React.render((
      <Router>
        <Route path="/" component={AppRoute}>
          <Route path=":owner/:repo" component={RepoRoute}/>
          <Route path="*" component={NoRoute}/>
        </Route>
      </Router>
    ), document.getElementById('app'));
  };


  out.run = function (options) {

    options = options || {};

    OAuth.initialize(options.oAuthIoKey);

    OAuth.popup('github')
      .done(function(result) {
          githubAccessToken = result.access_token;

          console.log('githubAccessToken', githubAccessToken);

          var octokatCacheHandler = new OctokatCacheHandler();

          octokat = new Octokat({
            // username: "USER_NAME",
            // password: "PASSWORD"
            //
            token: githubAccessToken,
            cacheHandler: octokatCacheHandler
          });

          postAuth(options);

          out.render();
      })
      .fail(function (err) {
          console.error(arguments);
      });
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

  function getComments(owner, repo, issue, done) {

    var cacheKey = 'comments:' + owner + '/' + repo + '/' + issue;

    var requester = function (octokat) {
      return octokat
        .repos(owner, repo)
        .issues(issue)
        .comments
        .fetch();
    };

    fetchAll(cacheKey, octokat, requester, done);
  };


  function getIssues(owner, repo, done) {

    var cacheKey = 'issues:' + owner + '/' + repo;

    var requester = function (octokat) {
      return octokat
        .repos(owner, repo)
        .issues
        .fetch();
    };

    fetchAll(cacheKey, octokat, requester, done);
  };

  return out;

})();

export {GitHubIssueRank};
