import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addNote, foundLine, mergeFound, requestLine, requestSource } from '../src/found.ts';

test('foundLine leaves out what is missing and names book sources', () => {
  assert.equal(foundLine({ kind: 'tv', year: 2017, creator: 'Netflix' }), '2017 · Netflix');
  assert.equal(foundLine({ kind: 'music', type: 'album', year: null, creator: 'Portishead' }), 'Portishead · album');
  assert.equal(foundLine({ kind: 'books', type: 'standardebooks', creator: 'Mary Shelley' }), 'Mary Shelley · standard ebooks');
});

test('requestLine shows progress only when there is one', () => {
  assert.equal(requestLine({ kind: 'tv', status: 'downloading', progress: 0.425 }), 'downloading, 43%');
  assert.equal(requestLine({ kind: 'tv', status: 'downloading', progress: null }), 'downloading');
  assert.equal(requestLine({ kind: 'movies', status: 'wanted' }), 'waiting for a release');
  assert.equal(requestLine({ kind: 'books', status: 'wanted' }), 'queued');
  assert.equal(requestLine({ kind: 'tv', status: 'something newer' }), 'something newer');
});

test('the confirm says how much of the music is followed', () => {
  assert.match(addNote({ kind: 'music', type: 'artist' }), /every album/);
  assert.match(addNote({ kind: 'music', type: 'ep' }), /only this album/);
});

test('a book says where it comes from', () => {
  assert.equal(foundLine({ kind: 'books', type: 'shelfmark', year: 2021, creator: 'Andy Weir' }), '2021 · Andy Weir · shelfmark');
  assert.match(addNote({ kind: 'books', type: 'shelfmark' }), /shelfmark/);
  assert.equal(requestSource({ kind: 'books', type: 'standardebooks' }), 'standard ebooks');
  assert.equal(requestSource({ kind: 'music', type: 'album' }), 'music');
});

test('a late book answer replaces only the books', () => {
  const tv = { kind: 'tv', id: '1' };
  const old = { results: [tv, { kind: 'books', id: 'weak' }], errors: { books: 'gutenberg down', music: 'lidarr down' }, pending: ['books'] };
  const now = mergeFound(old, 'books', { results: [{ kind: 'books', id: 'shelfmark:a/1' }], errors: {}, pending: [] });
  assert.deepEqual(now.results.map((f) => f.id), ['1', 'shelfmark:a/1']);
  assert.deepEqual(now.pending, []);
  assert.equal(now.errors.books, undefined);
  assert.equal(now.errors.music, 'lidarr down');
});
