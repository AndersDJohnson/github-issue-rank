
var assert = require('assert');
var ghir = require('../dist');

assert.ok(true);

assert(ghir.hasVote('I agree, +1!'));
assert(! ghir.hasVote('I agree, 2+1!'));
assert(! ghir.hasVote('I agree!'));

// assert(ghir.hasVote(' \uD83D\uDC4Db '));
// assert(ghir.hasVote('a\uD83D\uDC4Db'));
// assert(ghir.hasVote('a👍'));
// assert(ghir.hasVote('👍b'));
