import _ from 'lodash';

/**
 * https://github.com/philschatz/gh-board/blob/master/src/github-client.js#L7-L66
 */
class OctokatCacheHandler {
  constructor() {
    // Pull data from `sessionStorage`
    // this.storage = window.sessionStorage;
    this.storage = window.localStorage;
  }
  get(method, path) {
    var key = method + ' ' + path;
    var ret = this.storage.getItem(key);
    if (! ret) return null;
    ret = JSON.parse(ret);
    var {data, linkRelations} = ret;
    _.each(linkRelations, (value, key) => {
      if (value) {
        data[key] = value;
      }
    });
    return ret;
  }
  add(method, path, eTag, data, status) {
    var linkRelations = {};
    // if data is an array, it contains additional link relations (to other pages)
    if (_.isArray(data)) {
      _.each(['next', 'previous', 'first', 'last'], (name) => {
        var key = name + '_page_url';
        if (data[key]) {
          linkRelations[key] = data[key];
        }
      });
    }

    var key = method + ' ' + path;
    var cached = {eTag, data, status, linkRelations};
    cached = JSON.stringify(cached);

    try {
      this.storage.setItem(key, cached);
    } catch (e) {
      console.warn(e);
    }
  }
};

export {OctokatCacheHandler};
