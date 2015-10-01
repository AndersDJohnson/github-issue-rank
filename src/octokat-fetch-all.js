import async from 'async';

var fetchAll = function (cacheKey, octokat, requester, done) {
  var promiser = function () { return requester(octokat); };
  var allData = [];

  async.doWhilst(
    function (cb) {
      promiser().then(
        function (data) {
          allData = allData.concat(data);
          promiser = data.nextPage;
          cb();
        },
        function (err) {
          cb(err);
        }
      );
    },
    function () {
      return promiser;
    },
    function (err) {
      if (err) throw err;

      done(err, allData);
    }
  );
};

export {fetchAll};
