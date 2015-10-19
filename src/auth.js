import Octokat from 'octokat';
import { OAuth } from 'oauthio-web';
import assign from 'object-assign';
import { Promise } from 'es6-promise';
import { OctokatCacheHandler } from './octokat-cache-handler';
import { OctokatHelper } from './octokat-helper';
import { octokat, octokatHelper } from './factory';
import Options from './options';
import { dispatcher } from './dispatcher';

var cacheKey = 'ghir-github-access-token';

var executor = {};
var promise = new Promise((resolve, reject) => {
  executor = {resolve, reject};
});

var _gitHubAccessToken;

export default class Auth {

  static gitHubAccessToken(value) {
    if (value) _gitHubAccessToken = value;
    return _gitHubAccessToken;
  }

  static wait() {
    return promise;
  }

  static check(params) {
    var options = assign({}, Options, params);
    console.log('check auth', options);

    var cachedGitHubAccessToken = localStorage.getItem(cacheKey);

    console.log('cached gitHubAccessToken', cachedGitHubAccessToken);

    // TODO: Validate token.
    if (cachedGitHubAccessToken) {
      return this.setToken(cachedGitHubAccessToken);
    }

    if (! options.noAnonymous) {
      return this.anonymous();
    }

    executor.reject('Not logged in.');

    return Promise.reject('Not logged in.');
  }

  static anonymous() {
    return this.withToken(null);
  }

  static signIn(params) {
    var options = assign({}, Options, params, {
      noAnonymous: true
    });

    return this.check(options).then(
      (result => {
        console.log('result', result);

        return Promise.resolve(result);
      }),
      (err => {

        console.log('err', err);

        OAuth.initialize(options.oAuthIoKey);

        var executor = {};
        var promise = new Promise((resolve, reject) => {
          executor = {resolve, reject};
        });

        OAuth.popup('github')
          .done(result => {
              var resultGitHubAccessToken = result.access_token;
              console.log('github auth success', result);

              dispatcher.auth();

              executor.resolve(this.setToken(resultGitHubAccessToken));
          })
          .fail(err => {
              console.error('github auth err', err);
              executor.reject(err);
          });

        return promise;
      })
    );
  }

  static setToken(paramGitHubAccessToken) {
    Auth.gitHubAccessToken(paramGitHubAccessToken);
    try {
      localStorage.setItem(cacheKey, paramGitHubAccessToken);
    }
    catch (e) {
      console.warn(e);
    }
    return this.withToken(paramGitHubAccessToken);
  }

  /**
   * @param  {[type]} paramGitHubAccessToken GitHub access token, else null for guest.
   * @return {[type]}                   [description]
   */
  static withToken(paramGitHubAccessToken) {
    console.log('with token', paramGitHubAccessToken);

    paramGitHubAccessToken = paramGitHubAccessToken || Auth.gitHubAccessToken();

    var octokatCacheHandler = new OctokatCacheHandler();

    octokat(new Octokat({
      token: paramGitHubAccessToken,
      cacheHandler: octokatCacheHandler
    }));

    octokatHelper(new OctokatHelper(octokat()));

    var res = { gitHubAccessToken: paramGitHubAccessToken };

    executor.resolve(res);

    return Promise.resolve(res);
  }

  static signOut(params) {
    var options = assign({}, Options, params);

    localStorage.removeItem(cacheKey);

    return this.anonymous();
  }

}
