import type { FindKind, FindStatus, Found, FoundRequest } from './api';

export const FIND_KINDS: FindKind[] = ['tv', 'movies', 'music', 'books'];

const SOURCE: Record<string, string> = { gutenberg: 'gutenberg', standardebooks: 'standard ebooks' };

export const foundLine = (f: Pick<Found, 'kind' | 'type' | 'year' | 'creator'>) =>
  [f.year, f.creator, f.type ? (SOURCE[f.type] ?? f.type) : null].filter(Boolean).join(' · ');

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

export const requestLine = (r: Pick<FoundRequest, 'kind' | 'status' | 'progress'>) => {
  if (r.status === 'downloading' && r.progress != null) return `downloading, ${Math.round(r.progress * 100)}%`;
  if (r.kind === 'books' && r.status === 'wanted') return 'queued';
  return STATUS[r.status] ?? r.status;
};

/** what adding does, for the confirm */
export const addNote = (f: Pick<Found, 'kind' | 'type'>) => {
  if (f.kind === 'tv') return 'sonarr follows the whole series and looks for every missing episode.';
  if (f.kind === 'movies') return 'radarr follows the movie and looks for it.';
  if (f.kind === 'books') return 'ares downloads it and puts it in the calliope library.';
  return f.type === 'artist' ? 'lidarr follows the artist and looks for every album.' : 'lidarr follows only this album and looks for it.';
};
