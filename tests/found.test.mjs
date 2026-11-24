import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addNote, foundLine, isWork, mergeFound, requestLine, requestSource, sourceLine } from '../src/found.ts';

test('foundLine leaves out what is missing and says what music is', () => {
  assert.equal(foundLine({ kind: 'tv', year: 2017, creator: 'Netflix' }), 'Netflix · 2017');
  assert.equal(foundLine({ kind: 'music', type: 'album', year: 2020, creator: 'Taylor Swift' }), 'album · Taylor Swift · 2020');
  assert.equal(foundLine({ kind: 'music', type: 'artist', creator: null }), 'artist');
  assert.equal(foundLine({ kind: 'books', type: 'openlibrary', creator: 'Mary Shelley' }), 'Mary Shelley');
});

test('every result names its source', () => {
  assert.equal(sourceLine({ source: 'musicbrainz', type: 'song', detail: 'on folklore' }), 'on folklore · musicbrainz');
  assert.equal(sourceLine({ source: 'shelfmark', type: 'shelfmark', detail: 'epub · en' }), 'epub · en · shelfmark');
  assert.equal(sourceLine({ type: 'standardebooks' }), 'standard ebooks');
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

test('works are added by picking an edition, editions are not', () => {
  assert.ok(isWork({ kind: 'books', type: 'openlibrary' }) && isWork({ kind: 'books', type: 'hardcover' }));
  assert.ok(!isWork({ kind: 'books', type: 'shelfmark' }) && !isWork({ kind: 'music', type: 'album' }));
  assert.match(addNote({ kind: 'books', type: 'hardcover' }), /free edition/);
  assert.match(addNote({ kind: 'music', type: 'song' }), /album this song is on/);
  assert.match(addNote({ kind: 'comics' }), /kapowarr/);
  assert.match(addNote({ kind: 'manga' }), /suwayomi/);
  assert.equal(requestLine({ kind: 'manga', status: 'wanted' }), 'waiting for chapters');
  assert.equal(requestLine({ kind: 'books', status: 'wanted', detail: 'looking for an edition' }), 'looking for an edition');
});

test('a late music answer keeps what comics need', () => {
  const now = mergeFound({ results: [], pending: ['music'], needs: { comics: 'needs comicvine key' } }, 'music', { results: [], pending: ['music'] });
  assert.deepEqual([now.pending, now.needs], [['music'], { comics: 'needs comicvine key' }]);
});
