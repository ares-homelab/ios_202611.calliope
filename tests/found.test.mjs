import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addNote, bytes, canPick, foundLine, isWork, langBadge, mergeFound, partOf, pickedLine, releaseLine, releaseSource, requestLine, requestSource, sourceLine } from '../src/found.ts';

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
  assert.equal(requestLine({ kind: 'books', status: 'wanted', detail: 'looking for an edition' }), 'looking for an edition');
});

test('a late music answer keeps what comics need', () => {
  const now = mergeFound({ results: [], pending: ['music'], needs: { comics: 'needs comicvine key' } }, 'music', { results: [], pending: ['music'] });
  assert.deepEqual([now.pending, now.needs], [['music'], { comics: 'needs comicvine key' }]);
});

test('a release says its size, peers and quality', () => {
  assert.equal(releaseLine({ size: 4_200_000_000, seeders: 12, leechers: 3, quality: 'web 1080p' }), '4.2 GB · 12 seeding · 3 leeching · web 1080p');
  assert.equal(releaseLine({ size: 350_000_000, seeders: 0, leechers: 0, quality: null }), '350 MB · 0 seeding · 0 leeching');
  assert.equal(bytes(null), 'size unknown');
  assert.equal(releaseSource({ indexer: 'x', age_days: 0 }), 'x · today');
  assert.equal(releaseSource({ indexer: 'x', age_days: 800 }), 'x · 2 years');
});

test('the badge is only for portuguese', () => {
  assert.deepEqual([null, undefined, 'pt-br', 'dublado', 'legendado'].map(langBadge), [null, null, 'pt-br', 'pt-br dublado', 'pt-br legendado']);
});

test('an episode needs its season', () => {
  assert.deepEqual(partOf('', ''), {});
  assert.deepEqual(partOf('', '2'), {});
  assert.deepEqual(partOf('0', ''), { season: 0 });
  assert.deepEqual(partOf(' 1 ', '2'), { season: 1, episode: 2 });
  assert.deepEqual(partOf('1a', '2'), {});
});

test('only tv, movies and music have releases to pick', () => {
  assert.deepEqual(['tv', 'movies', 'music', 'books', 'comics'].filter((kind) => canPick({ kind })), ['tv', 'movies', 'music']);
});

test('a picked release shows how the import queue is doing', () => {
  assert.equal(pickedLine({ status: 'queued' }), 'release queued');
  assert.equal(pickedLine({ status: 'add_failed', error: 'add_failed' }), 'release failed: add failed');
  assert.equal(pickedLine({ status: 'failed' }), 'release failed: failed');
});
