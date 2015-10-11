import assert from 'assert';
import * as ghir from '../src/helper';

assert(ghir.hasVote('I agree, +1!'));
assert(! ghir.hasVote('I agree, 2+1!'));
assert(! ghir.hasVote('I agree!'));

assert(ghir.hasVote(' \uD83D\uDC4D '));
assert(ghir.hasVote(' \uD83D\uDC4D b '));
assert(ghir.hasVote('a \uD83D\uDC4D b'));
assert(ghir.hasVote('a 👍'));
assert(ghir.hasVote('👍 b'));
