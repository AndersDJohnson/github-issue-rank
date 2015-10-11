import Octokat from 'octokat';
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

  static githubAccessToken;

  static wait() {
    return promise;
  }

  static check(params) {
    var options = assign({}, Options, params);

    var githubAccessToken = localStorage.getItem(cacheKey, githubAccessToken);

    console.log('githubAccessToken', githubAccessToken);

    if (githubAccessToken) {
      return this.withToken(githubAccessToken);
    }

    if (options.noAnonymous) {
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

    return this.check(params).then(
      (result => {
        console.log('result', result);

        return Promise.resolve(result);
      }),
      (err => {

        console.log('err', err);

        OAuth.initialize(options.oAuthIoKey);

        return OAuth.popup('github')
          .done(result => {
              var githubAccessToken = Auth.githubAccessToken = result.access_token;

              localStorage.setItem(cacheKey, githubAccessToken);

              return this.withToken(githubAccessToken);
          })
          .fail(err => {
              console.error(err);
          });
      })
    );
  }

  /**
   * @param  {[type]} githubAccessToken GitHub access token, else null for guest.
   * @return {[type]}                   [description]
   */
  static withToken(githubAccessToken) {
    var octokatCacheHandler = new OctokatCacheHandler();

    octokat(new Octokat({
      token: githubAccessToken,
      cacheHandler: octokatCacheHandler
    }));

    octokatHelper(new OctokatHelper(octokat()));

    var res = { githubAccessToken };

    executor.resolve(res);

    return Promise.resolve(res);
  }

  static signOut(params) {
    var options = assign({}, Options, params);

    localStorage.removeItem(cacheKey);

    return Promise.resolve(true);
  }

}
