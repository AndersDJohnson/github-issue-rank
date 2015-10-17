import Octokat from 'octokat';
import { OAuth } from 'oauthio-web';
import assign from 'object-assign';
import { OctokatCacheHandler } from './octokat-cache-handler';
import { OctokatHelper } from './octokat-helper';
import { octokat, octokatHelper } from './factory';
import Options from './options';
import { Promise } from 'es6-promise';

var cacheKey = 'ghir-github-access-token';

var executor = {};
var promise = new Promise((resolve, reject) => {
  executor = {resolve, reject};
});

export default class Auth {

  static gitHubAccessToken;

  static wait() {
    return promise;
  }

  static check(params) {
    var options = assign({}, Options, params);
    console.log('check auth', options);

    var gitHubAccessToken = localStorage.getItem(cacheKey, gitHubAccessToken);

    console.log('cached gitHubAccessToken', gitHubAccessToken);

    if (gitHubAccessToken) {
      return this.withToken(gitHubAccessToken);
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
              var gitHubAccessToken = Auth.gitHubAccessToken = result.access_token;
              console.log('github auth success', result);

              executor.resolve(this.setToken(gitHubAccessToken));
          })
          .fail(err => {
              console.error('github auth err', err);
              executor.reject(err);
          });

        return promise;
      })
    );
  }

  static setToken(gitHubAccessToken) {
    try {
      localStorage.setItem(cacheKey, gitHubAccessToken);
    }
    catch (e) {}
    return this.withToken(gitHubAccessToken);
  }

  /**
   * @param  {[type]} gitHubAccessToken GitHub access token, else null for guest.
   * @return {[type]}                   [description]
   */
  static withToken(gitHubAccessToken) {
    console.log('with token', gitHubAccessToken);
    var octokatCacheHandler = new OctokatCacheHandler();

    octokat(new Octokat({
      token: gitHubAccessToken,
      cacheHandler: octokatCacheHandler
    }));

    octokatHelper(new OctokatHelper(octokat()));

    var res = { gitHubAccessToken };

    executor.resolve(res);

    return Promise.resolve(res);
  }

  static signOut(params) {
    var options = assign({}, Options, params);

    localStorage.removeItem(cacheKey);

    return this.anonymous();
  }

}
