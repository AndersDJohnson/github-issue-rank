import Octokat from 'octokat';
import React from 'react';
import ReactDOM from 'react-dom';
import async from 'async';
import _ from 'lodash';
import assign from 'object-assign';
import { OctokatCacheHandler } from './octokat-cache-handler';
import { OctokatHelper } from './octokat-helper';

import { octokat, octokatHelper } from './factory';

import * as helper from './helper';

import { RouterComponent } from './components/router';

import Options from './options';


var GitHubIssueRank = (function () {

  var out = {};


  // TODO: Use a global promise to queue work until Octokat instantiated.
  var gitHubAccessToken;


  out.render = function () {
    ReactDOM.render(
      <RouterComponent/>,
      document.getElementById('app')
    );
  };


  out.run = function (options) {
    options = options || {};

    assign(Options, options);

    out.render();
  };

  return out;
})();

export {GitHubIssueRank};
