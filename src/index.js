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
import Loader from 'react-loader';
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


  var showRepo = function (owner, repo, each, callback) {

    getIssuesThenComments(
      owner,
      repo,
      function (err, results, issue, comments) {
        each(err, mapResultsToRows(results), issue, comments);
      },
      function (err, results) {
        callback(err, mapResultsToRows(results));
      }
    );

  };


  var mapResultsToRows = function (results) {

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

    return rows;
  };


  out.render = function () {
    var AppRoute = React.createClass({

      getInitialState() {
        return {rateLimit: {}};
      },

      componentDidMount() {
        console.log(this.props.params);

        var checkRateLimit = () => {
          if (!octokat) {
            setTimeout(checkRateLimit, 2000);
            return;
          }
          octokat.rateLimit.fetch().then(
            (data) => {
              var rateLimit = data.resources.core;
              this.setState({rateLimit});
              setTimeout(checkRateLimit, 2000);
            },
            () => {
              console.error(arguments);
            }
          );
        };
        checkRateLimit();
      },

      render() {
        return (
          <div>
            <h1><Link to="/">GitHub Issue Rank</Link></h1>

            <div>
              <progress id="gh-api-limit"
                title="API Requests Left"
                value={this.state.rateLimit.remaining}
                max={this.state.rateLimit.limit} />
              <label for="gh-api-limit">
                API Requests Left {this.state.rateLimit.remaining} / {this.state.rateLimit.limit}
              </label>
            </div>

            <ul>
              <li>
                <Link to="/oauth-io/oauth-js">/oauth-io/oauth-js</Link>
              </li>
              <li>
                <Link to="/isaacs/github">/isaacs/github</Link>
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
        return {
          rows:[],
          loaded: false
        };
      },

      componentDidUpdate() {
        this.unmounting = false;
        console.log('RepoRoute update', arguments, this);
        this.showRepo();
      },

      componentDidMount() {
        this.unmounting = false;
        console.log('RepoRoute mount');
        this.showRepo();
      },

      componentWillUnmount () {
        // allows us to ignore an inflight request in scenario 4
        this.unmounting = true;
      },

      showRepo() {
        var params = this.props.params;
        var owner = params.owner;
        var repo = params.repo;

        if (owner === this.owner && repo === this.repo) {
          return;
        }

        this.setState({loaded: false});

        this.owner = owner;
        this.repo = repo;

        showRepo(owner, repo,
          (err, rows) => {
            this.showRows(err, rows);
          },
          (err, rows) => {
            this.showRows(err, rows);
          });
      },

      showRows(err, rows) {
        if (! this.unmounting) {
          this.setState({
            rows,
            loaded: true
          });
        }
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

            <Loader loaded={this.state.loaded}>
              <Griddle
                results={this.state.rows}
                columnMetadata={columnMetadata}
                columns={columns}
                resultsPerPage={25}
              />
            </Loader>
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
        
        async.reduce(issues,
          [],
          function (memo, issue, cb) {
            var result = {
              issue
            };
            if (issue.comments) {
              getComments(
                owner, repo, issue.number,
                function (err, comments) {
                  result.comments = comments;
                  memo.push(result);
                  eachIssueComments(err, memo, issue, comments);
                  cb(err, memo);
                }
              );
            }
            else {
              memo.push(result);
              eachIssueComments(null, memo, issue, null);
              cb(err, memo);
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
