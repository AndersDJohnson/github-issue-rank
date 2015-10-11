import Octokat from 'octokat';
import React from 'react';
import ReactDOM from 'react-dom';
import async from 'async';
import _ from 'lodash';
// import OAuth from 'oauth-js';
// import OAuth from 'oauthio';
// import OAuth from '../bower_components/oauth-js/dist/oauth.js';
import {OctokatCacheHandler} from './octokat-cache-handler';
import {OctokatHelper} from './octokat-helper';

import { octokat, octokatHelper } from './factory';

import * as helper from './helper';

import {RouterComponent} from './components';


var GitHubIssueRank = (function () {

  var out = {};


  // TODO: Use a global promise to queue work until Octokat instantiated.
  var githubAccessToken;


  out.render = function () {
    ReactDOM.render(
      <RouterComponent/>,
      document.getElementById('app')
    );
  };


  out.run = function (options) {

    options = options || {};

    OAuth.initialize(options.oAuthIoKey);

    OAuth.popup('github')
      .done(function(result) {
          githubAccessToken = result.access_token;

          console.log('githubAccessToken', githubAccessToken);

          var octokatCacheHandler = new OctokatCacheHandler();

          octokat(new Octokat({
            // username: "USER_NAME",
            // password: "PASSWORD"
            //
            token: githubAccessToken,
            cacheHandler: octokatCacheHandler
          }));

          octokatHelper(new OctokatHelper(octokat()));

          out.render();
      })
      .fail(function (err) {
          console.error(arguments);
      });
  };


  return out;

})();

export {GitHubIssueRank};
