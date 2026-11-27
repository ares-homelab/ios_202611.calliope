import assert from 'node:assert/strict';
import { test } from 'node:test';
import { afterEnd, nextIndex, nextRepeat, shuffleRest, startShuffled, unshuffle } from '../src/queue.ts';

const q = ['a', 'b', 'c', 'd', 'e'].map((key) => ({ key }));
const keys = (xs) => xs.map((x) => x.key).join('');
const rev = () => 0.999;

test('repeat cycles off, all, one', () => {
  assert.equal(nextRepeat('off'), 'all');
  assert.equal(nextRepeat('all'), 'one');
  assert.equal(nextRepeat('one'), 'off');
});

test('shuffle keeps what has played and the current song in place', () => {
  const s = shuffleRest(q, 1, rev);
  assert.equal(keys(s.slice(0, 2)), 'ab');
  assert.equal(keys([...s].sort((x, y) => x.key.localeCompare(y.key))), 'abcde');
});

test('starting shuffled puts the chosen song first', () => {
  const s = startShuffled(q, 3);
  assert.equal(s[0].key, 'd');
  assert.equal(s.length, 5);
  assert.deepEqual(startShuffled([], 0), []);
});

test('unshuffle returns to the original order at the same song', () => {
  assert.deepEqual(unshuffle(q, { key: 'c' }), { queue: q, index: 2 });
  const lost = unshuffle(q, { key: 'z' });
  assert.equal(keys(lost.queue), 'zabcde');
  assert.equal(lost.index, 0);
});

test('repeat one replays on finish but a manual next still skips', () => {
  assert.equal(afterEnd(2, 5, 'one'), 2);
  assert.equal(nextIndex(2, 5, 'one'), 3);
  assert.equal(nextIndex(4, 5, 'one'), 0);
});

test('the end of the queue stops unless repeat all', () => {
  assert.equal(afterEnd(4, 5, 'off'), null);
  assert.equal(afterEnd(4, 5, 'all'), 0);
  assert.equal(afterEnd(1, 5, 'off'), 2);
  assert.equal(afterEnd(0, 0, 'all'), null);
});
