import assert from 'assert';
import {GitHubIssueRank as ghir} from '../src';

assert(ghir.hasVote('I agree, +1!'));
assert(! ghir.hasVote('I agree, 2+1!'));
assert(! ghir.hasVote('I agree!'));

assert(ghir.hasVote(' \uD83D\uDC4D '));
assert(ghir.hasVote(' \uD83D\uDC4D b '));
assert(ghir.hasVote('a \uD83D\uDC4D b'));
assert(ghir.hasVote('a 👍'));
assert(ghir.hasVote('👍 b'));
