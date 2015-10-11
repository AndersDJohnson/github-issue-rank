import _ from 'lodash';

import React from 'react';
import { Router, Route, Link } from 'react-router';
import Griddle from 'griddle-react';
import Loader from 'react-loader';
import { octokat, octokatHelper } from '../factory';
import * as helper from '../helper';


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
      if (!octokat()) {
        setTimeout(checkRateLimit, 2000);
        return;
      }
      octokat().rateLimit.fetch().then(
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
              <li key={r}>
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
          <label htmlFor="gh-api-limit">
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
    var {owner, repo, number} = this.props.rowData;
    var href = '/' + owner + '/' + repo + '/' + number;
    return <Link to={href} target="_blank">{data}</Link>;
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
        columnName: 'owner',
        visible: false
      },
      {
        columnName: 'repo',
        visible: false
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

    this.state = {
      owner: null,
      repo: null,
      rows: [],
      loaded: false,
      anyLoaded: false,
      columnMetadata,
      columns
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
    var {owner, repo} = this.props.params;

    if (this.sameState(owner, repo)) return;

    this.setState({
      loaded: false,
      owner: owner,
      repo: repo,
      rows: []
    });

    helper.showRepo(owner, repo,
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
    var {owner, repo} = this.props.params;

    return (
      <div className="ghir-route-repo">
        <h2>
          <Link to={'/' + owner + '/' + repo}>
            {owner}/{repo}
          </Link>
          <a href={'https://github.com/' + owner + '/' + repo}
            target="_blank"
            className="ghir-link-github"
          >
            <i className="fa fa-github"></i>
          </a>
        </h2>

        <Loader loaded={this.state.loaded}></Loader>

        <Loader loaded={this.state.anyLoaded}>
          <div># issues: {this.state.rows.length}</div>
          <Griddle
            results={this.state.rows}
            columnMetadata={this.state.columnMetadata}
            columns={this.state.columns}
            resultsPerPage={10}
            showSettings={true}
            showFilter={true}
          />
        </Loader>
      </div>
    )
  }
};


class IssueRoute extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      owner: null,
      repo: null,
      number: null,
      issue: {},
      comments: [],
      commentsWithVotes: [],
      loaded: false
    };
  }

  componentDidMount() {
    this.unmounting = false;
    this.showComments();
  }

  showComments() {
    var {owner, repo, number} = this.props.params;

    octokat()
      .repos(owner, repo)
      .issues(number)
      .fetch()
      .then((issue) => {
        // console.log('issue', issue);
        this.setState({issue});
      }, (err) => {
        console.error(err);
      });

    octokatHelper().getComments(
      owner, repo, number,
      (err, comments, cancel) => {
        // console.log('each', err, comments, cancel);
        comments = helper.mapCommentsHaveVotes(comments);
        this.setState({comments});
        var commentsWithVotes = comments.filter(c => {
          return c.hasVote;
        });
        this.setState({commentsWithVotes});
      },
      (err, comments) => {
        // console.log('done', comments);
      }
    );
  }

  render() {
    var {owner, repo, number} = this.props.params;
    return (
      <div className="ghir-route-issue">
        <h2>
          <Link to={'/' + owner + '/' + repo}>
            {owner}/{repo}
          </Link>
          <a href={'https://github.com/' + owner + '/' + repo}
            target="_blank"
            className="ghir-link-github"
          >
            <i className="fa fa-github"></i>
          </a>
          &nbsp;
          <Link to={'/' + owner + '/' + repo + '/' + number}>
            #{number}
          </Link>
          <a href={'https://github.com/' + owner + '/' + repo
            + '/issues/' + number}
            target="_blank"
            className="ghir-link-github"
          >
            <i className="fa fa-github"></i>
          </a>
        </h2>

        <h3>
          {this.state.issue.title}
        </h3>

        <ul className="ghir-issue-votes list-unstyled list-inline">
          {this.state.commentsWithVotes.map(c => {
            return (
              <li key={c.id} className="ghir-issue-vote">
                <a href={c.htmlUrl} target="_blank">
                  <img className="ghir-issue-vote-avatar"
                    src={c.user.avatarUrl + '&s=32'} />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
};


export class RouterComponent extends React.Component {
  render() {
    return (
      <Router>
        <Route path="/" component={AppRoute}>
          <Route path=":owner/:repo" component={RepoRoute}/>
          <Route path=":owner/:repo/:number" component={IssueRoute}/>
          <Route path="*" component={NoRoute}/>
        </Route>
      </Router>
    );
  }
};
