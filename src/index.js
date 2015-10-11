import Octokat from 'octokat';
import React from 'react';
import async from 'async';
import _ from 'lodash';
// import OAuth from 'oauth-js';
// import OAuth from 'oauthio';
// import OAuth from '../bower_components/oauth-js/dist/oauth.js';
import {OctokatCacheHandler} from './octokat-cache-handler';
import {OctokatHelper} from './octokat-helper';
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


  // TODO: Use a global promise to queue work until Octokat instantiated.
  var octokat;
  var octokatHelper;
  var githubAccessToken;




  var withComments = function (comments) {
    getVoteCountForComment(comments);
  };


  var getVoteCountForComment = function (comments) {

    if (! comments) return 0;

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

    var merged = {};

    var merge = function (results) {
      if (! results) return results;
      var keyed = _.chain(results)
        .filter(r => r.issue)
        .groupBy(r => r.issue.number)
        .map(r => r[0])
        .value();
      _.extend(merged, keyed);
      return _.values(merged);
    };

    octokatHelper.getIssuesThenComments(
      owner,
      repo,
      function (err, results, cancel) {
        each(err, mapResultsToRows(merge(results)), cancel);
      },
      function (err, results, cancel, issue) {
        each(err, mapResultsToRows(merge(results)), cancel, issue);
      },
      function (err, results, cancel, issue, comments) {
        each(err, mapResultsToRows(merge(results)), cancel, issue, comments);
      },
      (err, results, cancel) => {
        callback(err, mapResultsToRows(merge(results)), cancel);
      }
    );

  };


  var mapResultsToRows = function (results) {

    if (! results) return;

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
        voteCount: voteCount ||''
        // comments: issue.comments||'',
        // ratio:ratio ||''
      });
    });

    return rows;
  };


  out.render = function () {
    class AppRoute extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          rateLimit: {},
          reset: new Date(),
          repos: [
            'oauth-io/oauth-js',
            'isaacs/github'
          ]
        };
      }

      componentDidMount() {
        var checkRateLimit = () => {
          if (!octokat) {
            setTimeout(checkRateLimit, 2000);
            return;
          }
          octokat.rateLimit.fetch().then(
            (data) => {
              var rateLimit = data.resources.core;
              var reset = data.resources.core.reset;
              var date = new Date(reset*1000);
              var state = {rateLimit, reset: date};
              this.setState(state);
              setTimeout(checkRateLimit, 2000);
            },
            () => {
              console.error(arguments);
            }
          );
        };
        checkRateLimit();
      }

      render() {
        var children = this.props.children;

        if (! children) {
          children = (
            <ul>
              {this.state.repos.map(r => {
                return (
                  <li>
                    <Link to={'/' + r}>{r}</Link>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div>
            <h1><Link to="/">GitHub Issue Rank</Link></h1>

            <div>
              <progress id="gh-api-limit"
                title="API Limit"
                value={this.state.rateLimit.remaining}
                max={this.state.rateLimit.limit} />
              <label for="gh-api-limit">
                API Limit {this.state.rateLimit.remaining} / {this.state.rateLimit.limit}
                &nbsp;(resets {this.state.reset.toString()})
              </label>
            </div>

            {children}
          </div>
        )
      }
    };


    class NoRoute extends React.Component {
      componentDidMount() {
        console.log(this.props.params);
      }

      render() {
        return (
          <h1>404</h1>
        )
      }
    };


    class LinkComponent extends React.Component {
      render() {
        var data = this.data();
        return <a href={this.props.rowData.htmlUrl} target="_blank">{data}</a>;
      }
      data() {
        return this.props.data;
      }
    };

    class IssueNumberComponent extends LinkComponent {
      data() {
        var data = this.props.data;
        return data ? '#' + data : '';
      }
    };

    class RepoRoute extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          rows:[],
          loaded: false,
          anyLoaded: false
        };
      }

      componentDidUpdate() {
        this.unmounting = false;
        this.showRepo();
      }

      componentDidMount() {
        this.unmounting = false;
        this.showRepo();
      }

      componentWillUnmount () {
        // allows us to ignore an inflight request in scenario 4
        this.unmounting = true;
        this.owner = null;
        this.repo = null;
      }

      sameState(owner, repo) {
        return (! this.unmounting) && (owner && (owner === this.state.owner)) && (repo && (repo === this.state.repo));
      }

      showRepo() {
        var params = this.props.params;
        var owner = params.owner;
        var repo = params.repo;

        if (this.sameState(owner, repo)) return;

        this.setState({
          loaded: false,
          owner: owner,
          repo: repo,
          rows: []
        });

        showRepo(owner, repo,
          (err, rows, cancel) => {
            if ( ! this.sameState(owner, repo)) return cancel();
            this.showRows(err, rows);
            this.setState({
              anyLoaded: true
            });
          },
          (err, rows, cancel) => {
            if ( ! this.sameState(owner, repo)) return cancel();
            this.showRows(err, rows);
            this.setState({
              loaded: true
            });
          });
      }

      showRows(err, rows) {
        if (! this.unmounting) {
          this.setState({
            rows
          });
        }
      }

      render() {

        var columnMetadata = [
          {
            columnName: 'number',
            displayName: '#',
            customComponent: IssueNumberComponent,
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
          },
          {
            columnName: 'htmlUrl',
            visible: false
          }
        ];

        columnMetadata = _.each(columnMetadata, (md, i) => { md.order = i; })

        var columns =_.chain(columnMetadata)
          .sortBy('order')
          .filter((md) => {
            return md.visible == null ? true : false;
          })
          .pluck('columnName')
          .value();

        var {repo, owner, number} = this.props.params;
        return (
          <div>
            <h2>
              <a href={'https://github.com/' + owner + '/' + repo}
                target="_blank"
              >
                {owner}/{repo}
              </a>
            </h2>

            <Loader loaded={this.state.loaded}></Loader>

            <Loader loaded={this.state.anyLoaded}>
              <div># issues: {this.state.rows.length}</div>
              <Griddle
                results={this.state.rows}
                columnMetadata={columnMetadata}
                columns={columns}
                resultsPerPage={10}
                showSettings={true}
              />
            </Loader>
          </div>
        )
      }
    };


    class IssueRoute extends React.Component {
      render() {
        var {repo, owner, number} = this.props.params;
        return (
          <div>
            <h2>
              <a href={'https://github.com/' + owner + '/' + repo
                + '/issues/' + number}
                target="_blank"
              >
                {owner}/{repo} #{number}
              </a>
            </h2>
          </div>
        );
      }
    };


    React.render((
      <Router>
        <Route path="/" component={AppRoute}>
          <Route path=":owner/:repo" component={RepoRoute}/>
          <Route path=":owner/:repo/:number" component={IssueRoute}/>
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

          octokatHelper = new OctokatHelper(octokat);

          postAuth(options);

          out.render();
      })
      .fail(function (err) {
          console.error(arguments);
      });
  };


  return out;

})();

export {GitHubIssueRank};
