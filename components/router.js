import _ from 'lodash';
import React from 'react';
import { Router, Route } from 'react-router';
import { createHashHistory } from 'history';
import * as routes from '.';
import {
  AppRoute,
  RepoRoute,
  IssueRoute,
  AuthRoute,
  NoRoute
} from '.';

export var history = createHashHistory();

let unlisten = history.listen(function (location) {
  console.log('history', location.pathname)
})


export var paths = {
  github: 'g',
  auth: 'auth'
};

export var linker = {};

_.each(paths, (p, k) => {
  linker[k] = ((sp, pf) => { return `${pf === false ? '' : '/'}${p}${sp ? sp : ''}` });
});

export class RouterComponent extends React.Component {
  render() {
    var repoPath = linker.github('/:owner/:repo', false);
    console.log('repoPath', repoPath);
    return (
      <Router history={history}>
        <Route path="/" component={AppRoute}>
          <Route path={repoPath} component={RepoRoute}>
            <Route path=":number" component={IssueRoute}/>
          </Route>
          <Route path="auth" component={AuthRoute}/>
          <Route path="*" component={NoRoute}/>
        </Route>
      </Router>
    );
  }
};
