import _ from 'lodash';

import React from 'react';
import { Link } from 'react-router';
import Griddle from 'griddle-react';
import Loader from 'react-loader';
import { octokat, octokatHelper } from '../factory';
import * as helper from '../helper';
import Auth from '../auth';
import { dispatcher } from '../dispatcher';

import {
  Alert,
  Button,
  CollapsibleNav,
  Input,
  MenuItem,
  Modal,
  Nav,
  Navbar,
  NavBrand,
  NavDropdown,
  NavItem
} from 'react-bootstrap';



export class AppRoute extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      error: null,
      user: null,
      authed: false,
      gitHubAccessToken: null,
      inputGitHubAccessToken: null,
      rateLimit: {},
      reset: new Date(),
      repos: [
        'oauth-io/oauth-js',
        'isaacs/github'
      ],
      showingAuthModal: false
    };

    dispatcher.register(payload => {
      if(payload.actionType === dispatcher.actionTypes.ERROR) {
        var error = payload.data;
        this.setState({error});
      }
    });
  }

  componentDidMount() {
    this.checkAuth();

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
        (err) => {
          console.error(err);
        }
      );
    };
    checkRateLimit();
  }

  onClickSignIn() {
    this.showAuthModal();
  }

  onClickAuth() {
    this.showAuthModal();
  }

  showAuthModal() {
    this.setState({showingAuthModal: true});
  }

  setGitHubAccessToken(gitHubAccessToken) {
    this.setState({
      gitHubAccessToken: gitHubAccessToken,
      inputGitHubAccessToken: gitHubAccessToken
    });
  }

  signIn() {
    Auth.signIn().then(d => {
      console.log('sign in data', d);
      this.setGitHubAccessToken(d.gitHubAccessToken);
      this.onSignedIn();
    });
  }

  onClickSignOut() {
    console.log('onClickSignOut');
    Auth.signOut().
      then(d => {
        this.setState({
          authed: false,
          user: null
        });
        this.setGitHubAccessToken(null);
      });
  }

  checkAuth(options) {
    Auth.check(options).
      then(d => {
        console.log('authed', d);
        this.setGitHubAccessToken(d.gitHubAccessToken);
        this.onSignedIn();
      });
  }

  checkSignIn(gitHubAccessToken) {
    octokat().user.fetch().then(
      user => {
        this.setState({user});
        Auth.setToken(gitHubAccessToken).
          then(data => {
            var {gitHubAccessToken} = data;
            console.log('auth set token', gitHubAccessToken);
            this.setGitHubAccessToken(gitHubAccessToken);
            this.onSignedIn();
          });
      },
      err => {
        console.error('sign in error', err);
        // TODO: Show in UI.
      }
    )
  }

  onSignedIn() {
    this.setState({authed: true});

    octokat().user.fetch().then(user => {
      this.setState({user});
    });
  }

  signInFromAlert() {
    this.dismissAlert();
    this.signIn();
  }

  dismissAlert() {
    this.setState({error: null});
  }

  closeAuthModal() {
    this.setState({showingAuthModal: false});
  }

  onChangeInputGitHubAccessToken(e) {
    var inputGitHubAccessToken = e.target.value;
    this.setState({inputGitHubAccessToken});
    this.checkSignIn(inputGitHubAccessToken);
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

    var errorCmp;
    var error = this.state.error;
    if (this.state.error) {
      var message = error.message || error;
      errorCmp =
        <Alert bsStyle="danger" onDismiss={this.dismissAlert.bind(this)}>
          <h4>Oh snap! You got an error!</h4>
          <p>{message}</p>
          <p>
            <Button onClick={this.onClickSignIn.bind(this)} bsStyle="success">Sign In</Button>
            <span> or </span>
            <Button onClick={this.dismissAlert.bind(this)}>Hide Alert</Button>
          </p>
        </Alert>;
    }

    var authModalSignInCmp;
    if (! this.state.user) {
      authModalSignInCmp = (
        <Button
          bsStyle="success"
          onClick={this.signIn.bind(this)}
        >
          Sign In to GitHub via OAuth.io
        </Button>
      );
    }
    else {
      authModalSignInCmp = (
        <div>
          <div>
            <a
              href={this.state.user.htmlUrl}
              target="_blank"
            >
              <img src={this.state.user.avatarUrl}
                className="ghir-auth-user-avatar"
              ></img>
            </a>
          </div>
          <div>
            <a
              href={this.state.user.htmlUrl}
              target="_blank"
            >
              @{this.state.user.login}
            </a>
          </div>
          <div>
            <Button
              bsStyle="success"
              onClick={this.onClickSignOut.bind(this)}
            >
              <i className="fa fa-sign-out"></i> Sign Out
            </Button>
          </div>
        </div>
      );
    }

    var authBarCmp;
    if (! this.state.user) {
      /*
       * https://github.com/react-bootstrap/react-bootstrap/issues/1404
       */
      authBarCmp = (
        <button type="button"
          className="btn btn-success navbar-btn navbar-right"
          onClick={this.onClickSignIn.bind(this)}
        >
          Sign In
        </button>
      );
    }
    else {
      var avatar = (
        <img src={this.state.user.avatarUrl}
          className="ghir-navbar-user-avatar"
        ></img>
      );
      authBarCmp = (
        <Nav navbar right>
          <NavDropdown eventKey={2}
            title={avatar}
            id="ghir-navbar-user-dropdown"
          >
            <MenuItem eventKey={5}
              onSelect={this.onClickAuth.bind(this)}
            >
              <i className="fa fa-user"></i> Authentication
            </MenuItem>
            <MenuItem eventKey={5}
              onSelect={this.onClickSignOut.bind(this)}
            >
              <i className="fa fa-sign-out"></i> Sign Out
            </MenuItem>
          </NavDropdown>
        </Nav>
      );
    }

    return (
      <div>

        <Navbar fixedTop fluid toggleNavKey={0}>
          <NavBrand>
            <Link to="/">GitHub Issue Rank</Link>
          </NavBrand>
          <CollapsibleNav eventKey={0}>

            <Nav navbar right>

              <NavDropdown eventKey={3}
                title={<i className="fa fa-bars"></i>}
                id="ghir-navbar-more-dropdown"
              >
                <MenuItem eventKey={1}>
                  <i className="fa fa-gear"></i> Settings
                </MenuItem>
                <MenuItem divider />
                <MenuItem eventKey={4}
                  href="https://github.com/AndersDJohnson/github-issue-rank"
                  target="_blank"
                >
                  <i className="fa fa-code"></i> Source Code
                </MenuItem>
              </NavDropdown>

            </Nav>

            {authBarCmp}

          </CollapsibleNav>
        </Navbar>

        <Modal show={this.state.showingAuthModal} onHide={this.closeAuthModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Authentication</Modal.Title>
          </Modal.Header>
          <Modal.Body>

            {authModalSignInCmp}

            <hr />

            <p>Or provide an access token:</p>

            <Input
              type="text"
              value={this.state.inputGitHubAccessToken}
              onChange={this.onChangeInputGitHubAccessToken.bind(this)}
            />

          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={this.closeAuthModal.bind(this)}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {errorCmp}

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


export class NoRoute extends React.Component {
  componentDidMount() {
    console.log(this.props.params);
  }

  render() {
    return (
      <h1>404</h1>
    )
  }
};


export class LinkComponent extends React.Component {
  render() {
    var data = this.data();
    var {owner, repo, number} = this.props.rowData;
    var href = '#/' + owner + '/' + repo + '/' + number;
    return (
      <a href={href}>
        {data}
      </a>
    );
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

export class RepoRoute extends React.Component {
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
      columns,
      showingIssueModal: false,
      commentsWithVotes: [],
      issue: {},
      progress: {
        value:0,
        max: 0
      }
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

  refresh() {
    this.showRepo({
      refresh: true
    })
  }

  showRepo(opts) {
    opts = opts || {};

    var {owner, repo} = this.props.params;

    var {refresh} = opts;

    if (!refresh && this.sameState(owner, repo)) return;

    if (refresh) {
      if (_.isFunction(this.cancel)) this.cancel();
    }

    this.setState({
      loaded: false,
      owner: owner,
      repo: repo,
      rows: []
    });

    Auth.wait().then(() => {
      helper.showRepo(owner, repo,
        (err, rows, cancel, progress) => {
          this.cancel = cancel;
          if (err) {
            return dispatcher.error(err);
          }
          if ( ! this.sameState(owner, repo)) return cancel();
          this.showRows(err, rows);
          this.setState({
            anyLoaded: true,
            progress
          });
        },
        (err, rows, cancel, progress) => {
          this.cancel = cancel;
          // console.log('progress', progress);
          if (err) {
            this.setState({loaded: true, anyLoaded: true})
            return dispatcher.error(err);
          }
          if ( ! this.sameState(owner, repo)) return cancel();
          this.showRows(err, rows);
          this.setState({
            loaded: true,
            progress
          });
        }
      );
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
    var children = this.props.children;

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

        <button onClick={this.refresh.bind(this)}>refresh</button>

        <progress
          value={this.state.progress.value}
          max={this.state.progress.max}
        ></progress>

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

        {children}

      </div>
    )
  }
};


export class IssueRoute extends React.Component {

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

    Auth.wait().then(() => {
      octokat()
        .repos(owner, repo)
        .issues(number)
        .fetch()
        .then(issue => {
          // console.log('issue', issue);
          this.setState({issue});
        }, (err) => {
          if (err) throw err;
        });

      octokatHelper().getComments(
        owner, repo, number,
        (err, comments, cancel) => {
          if (err) {
            return dispatcher.error(err);
          }

          // console.log('each', err, comments, cancel);
          comments = helper.mapCommentsHaveVotes(comments);
          this.setState({comments});
          var commentsWithVotes = comments.filter(c => {
            return c.hasVote;
          });
          this.setState({commentsWithVotes});
        },
        (err, comments) => {
          if (err) {
            return dispatcher.error(err);
          }
          // console.log('done', comments);
        }
      );
    });
  }

  closeIssueModal() {
    var {owner, repo} = this.props.params;
    history.pushState(null, '/' + owner + '/' + repo);
  }

  render() {
    var {owner, repo, number} = this.props.params;
    return (
      <div className="ghir-route-issue">

        <Modal show={true} onHide={this.closeIssueModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>

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

            </Modal.Title>
          </Modal.Header>
          <Modal.Body>

            <h3>
              {this.state.issue.title}
            </h3>

            <div>
              {this.state.commentsWithVotes.length} votes
            </div>

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

          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={this.closeIssueModal.bind(this)}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
    );
  }
};
