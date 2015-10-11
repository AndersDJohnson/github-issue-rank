import Octokat from 'octokat';
import assign from 'object-assign';
import { OctokatCacheHandler } from './octokat-cache-handler';
import { OctokatHelper } from './octokat-helper';
import { octokat, octokatHelper } from './factory';
import Options from './options';

export default class Auth {

  static githubAccessToken;

  static auth(params) {
    var options = assign({}, Options, params);

    OAuth.initialize(options.oAuthIoKey);

    return OAuth.popup('github')
      .done(result => {
          var githubAccessToken = Auth.githubAccessToken = result.access_token;

          var octokatCacheHandler = new OctokatCacheHandler();

          octokat(new Octokat({
            token: githubAccessToken,
            cacheHandler: octokatCacheHandler
          }));

          octokatHelper(new OctokatHelper(octokat()));

          return { githubAccessToken };
      })
      .fail(err => {
          console.error(err);
      });
  }
}
