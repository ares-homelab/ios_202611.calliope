import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addNote, foundLine, requestLine } from '../src/found.ts';

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
