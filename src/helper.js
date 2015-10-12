import _ from 'lodash';
import { octokatHelper } from './factory';


export var hasVote = function (str) {

  var lines = str.split('\n');

  var found = false;

  lines.forEach(function (line) {
    if (found) return;
    var isBlockQuote = line.match(/^\s*>/);
    if (isBlockQuote) return;
    found = found || line.match(/(^|[\W\b])(\+1|:\+1:|:thumbsup:|\uD83D\uDC4D)([\W\b]|$)/g);
    // TODO: Ignore +1's within quotation marks?
  });

  return found;
};


export var mapCommentsHaveVotes = function (comments) {
  return comments.map(c => {
    c.hasVote = hasVote(c.body);
    return c;
  });
};


export var getVoteCountForComments = function (comments) {

  if (! comments) return 0;

  var voteCount = 0;

  var alreadyUsers = {};

  comments = mapCommentsHaveVotes(comments);

  comments.forEach(c => {

    var login = c.user.login;

    if (alreadyUsers[login]) {
      return;
    }

    if (c.hasVote) {
      alreadyUsers[login] = true;
      voteCount += 1;
    }
  });

  return voteCount;
};


export var showRepo = function (owner, repo, each, callback) {

  var merged = {};

  var merge = function (results) {
    if (! results) return results;
    var keyed = _.chain(results)
      .filter(r => r.issue)
      .groupBy(r => r.issue.number)
      .map(r => r[0])
      .value();
    _.extend(merged, keyed);
    return _.values(merged);
  };

  if (! octokatHelper()) return;

  octokatHelper().getIssuesThenComments(
    owner,
    repo,
    (err, results, cancel, progress) => {
      each(err, mapResultsToRows(merge(results)), cancel, progress);
    },
    (err, results, cancel, progress, issue) => {
      each(err, mapResultsToRows(merge(results)), cancel, progress, issue);
    },
    (err, results, cancel, progress, issue, comments) => {
      each(err, mapResultsToRows(merge(results)), cancel, progress, issue, comments);
    },
    (err, results, cancel, progress) => {
      callback(err, mapResultsToRows(merge(results)), cancel, progress);
    }
  );

};


export var mapResultsToRows = function (results) {

  if (! results) return;

  results.forEach(function (result) {
    var voteCount = 0;
    if (result.comments) {
      voteCount = getVoteCountForComments(result.comments);
    }
    result.voteCount = voteCount;
  });

  results = _.sortBy(results, function (result) {
    return -1 * result.voteCount;
  });

  var components = [];

  var rows = [];

  results.forEach(function (result) {
    var issue = result.issue;
    var voteCount = result.voteCount;

    // var ratio = voteCount / issue.comments;

    rows.push({
      number: issue.number || '',
      title: issue.title || '',
      htmlUrl: issue.htmlUrl || '',
      owner: issue.owner || '',
      repo: issue.repo || '',
      voteCount: voteCount || ''
      // comments: issue.comments||'',
      // ratio:ratio ||''
    });
  });

  return rows;
};
