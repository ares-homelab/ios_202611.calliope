import assert from 'node:assert/strict';
import { test } from 'node:test';
import { count, hm } from '../src/format.ts';

test('count picks singular or plural', () => {
  assert.equal(count(1, 'book'), '1 book');
  assert.equal(count(0, 'book'), '0 books');
  assert.equal(count(12, 'song'), '12 songs');
  assert.equal(count(1, 'match', 'matches'), '1 match');
  assert.equal(count(3, 'match', 'matches'), '3 matches');
});

test('count shows a dash for a missing number, not zero', () => {
  assert.equal(count(undefined, 'song'), '— songs');
  assert.equal(count(null, 'album'), '— albums');
});

test('hm is the one duration format', () => {
  assert.equal(hm(0.75), '45m');
  assert.equal(hm(1 + 5 / 60), '1h 05m');
});
