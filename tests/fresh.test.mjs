import assert from 'node:assert/strict';
import { test } from 'node:test';
import { refreshQueue, staleDownloads } from '../src/fresh.ts';

test('a download is stale when navidrome now has a different file', () => {
  const saved = { 's:a': { bytes: 100 }, 's:b': { bytes: 200 }, 's:c': { bytes: 300 }, 'b:1:2': { bytes: 5 } };
  const songs = [{ id: 'a', size: 100 }, { id: 'b', size: 250 }, { id: 'c' }];
  assert.deepEqual(staleDownloads(saved, songs), ['s:b']);
});

test('queued songs pick up the new length, books and unchanged songs stay', () => {
  const q = [
    { kind: 'song', duration: 180, song: { id: 'a', size: 1, duration: 180 } },
    { kind: 'song', duration: 200, song: { id: 'b', size: 1, duration: 200 } },
    { kind: 'book', duration: 900 },
  ];
  const byId = new Map([['a', { id: 'a', size: 2, duration: 239 }], ['b', { id: 'b', size: 1, duration: 200 }]]);
  const next = refreshQueue(q, byId);
  assert.equal(next[0].duration, 239);
  assert.equal(next[0].song.size, 2);
  assert.equal(next[1], q[1]);
  assert.equal(next[2], q[2]);
  assert.equal(refreshQueue(q.slice(1), byId), null);
});
