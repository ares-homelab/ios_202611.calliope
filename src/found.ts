import type { FindKind, FindStatus, Found, FoundRequest, FoundResults } from './api';

export const FIND_KINDS: FindKind[] = ['tv', 'movies', 'music', 'books', 'comics', 'manga'];

const SOURCE: Record<string, string> = { gutenberg: 'gutenberg', standardebooks: 'standard ebooks', openlibrary: 'open library' };
const typeName = (t?: string | null) => (t ? (SOURCE[t] ?? t) : null);

/** music says what it is; a book's type is its source, shown on its own line */
export const foundLine = (f: Pick<Found, 'kind' | 'type' | 'year' | 'creator'>) =>
  [f.kind === 'music' ? f.type : null, f.creator, f.year].filter(Boolean).join(' · ');

export const sourceLine = (f: Pick<Found, 'type' | 'source' | 'detail'>) => [f.detail, f.source ?? typeName(f.type)].filter(Boolean).join(' · ');

/** a book found as a work: adding it picks the edition */
export const isWork = (f: Pick<Found, 'kind' | 'type'>) => f.kind === 'books' && (f.type === 'openlibrary' || f.type === 'hardcover');

const STATUS: Record<FindStatus, string> = {
  new: 'not added',
  wanted: 'waiting for a release',
  downloading: 'downloading',
  partial: 'partly in library',
  done: 'in library',
  failed: 'failed',
  removed: 'removed',
  unknown: "can't tell right now",
};

export const requestLine = (r: Pick<FoundRequest, 'kind' | 'status' | 'progress' | 'detail'>) => {
  if (r.status === 'downloading' && r.progress != null) return `downloading, ${Math.round(r.progress * 100)}%`;
  if (r.kind === 'books' && r.status === 'wanted') return r.detail === 'looking for an edition' ? r.detail : 'queued';
  if (r.kind === 'manga' && r.status === 'wanted') return 'waiting for chapters';
  return STATUS[r.status] ?? r.status;
};

/** what adding does, for the confirm */
export const addNote = (f: Pick<Found, 'kind' | 'type'>) => {
  if (f.kind === 'tv') return 'sonarr follows the whole series and looks for every missing episode.';
  if (f.kind === 'movies') return 'radarr follows the movie and looks for it.';
  if (f.type === 'shelfmark') return 'shelfmark downloads this edition and puts it in the calliope library.';
  if (f.kind === 'comics') return 'kapowarr follows the volume and looks for every issue.';
  if (f.kind === 'manga') return 'suwayomi looks for it in its sources and downloads every chapter.';
  if (isWork(f)) return 'ares takes the free edition when there is one, else the best one on shelfmark.';
  if (f.kind === 'books') return 'ares downloads it and puts it in the calliope library.';
  if (f.type === 'song') return 'lidarr follows the album this song is on and looks for it.';
  return f.type === 'artist' ? 'lidarr follows the artist and looks for every album.' : 'lidarr follows only this album and looks for it.';
};

/** where a request came from: the book source, else its kind */
export const requestSource = (r: Pick<FoundRequest, 'kind' | 'type'>) => (r.kind === 'books' ? (typeName(r.type) ?? r.kind) : r.kind);

/** a later answer for one kind replaces that kind's results and errors */
export function mergeFound(old: FoundResults, kind: FindKind, next: FoundResults): FoundResults {
  return {
    results: [...old.results.filter((f) => f.kind !== kind), ...next.results],
    errors: { ...old.errors, [kind]: next.errors?.[kind] },
    pending: [...(old.pending ?? []).filter((k) => k !== kind), ...(next.pending ?? [])],
    needs: old.needs,
  };
}
