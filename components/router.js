import React from 'react';
import { Router, Route } from 'react-router';
import { createHashHistory } from 'history';
import * as routes from '.';
import {
  AppRoute,
  RepoRoute,
  IssueRoute,
  NoRoute
} from '.';

var history = createHashHistory();

export class RouterComponent extends React.Component {
  render() {
    return (
      <Router history={history}>
        <Route path="/" component={AppRoute}>
          <Route path=":owner/:repo" component={RepoRoute}>
            <Route path=":number" component={IssueRoute}/>
          </Route>
          <Route path="*" component={NoRoute}/>
        </Route>
      </Router>
    );
  }
};
