import { getConfig, type Nd } from './config';
import { OfflineError } from './api';

export type Song = {
  id: string;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  coverArt?: string;
  duration?: number;
  track?: number;
  year?: number;
  genre?: string;
  starred?: string;
  suffix?: string;
  bitRate?: number;
  size?: number;
};
export type Album = {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  year?: number;
  genre?: string;
  created?: string;
  starred?: string;
  song?: Song[];
};
export type Artist = { id: string; name: string; albumCount?: number; coverArt?: string; artistImageUrl?: string; album?: Album[] };
export type Playlist = { id: string; name: string; songCount?: number; duration?: number; coverArt?: string; owner?: string; comment?: string; entry?: Song[] };
export type Lyrics = { synced: boolean; lines: { start?: number; value: string }[] };

const auth = (nd: Nd) => `u=${encodeURIComponent(nd.user)}&t=${nd.token}&s=${nd.salt}&v=1.16.1&c=calliope&f=json`;

const url = (method: string, params: Record<string, string | number | boolean | undefined> = {}, nd = getConfig().nd) =>
  `${nd.url}/rest/${method}?${auth(nd)}` +
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `&${k}=${encodeURIComponent(String(v))}`)
    .join('');

async function call<T>(method: string, params: Record<string, string | number | boolean | undefined> = {}, nd?: Nd): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(method, params, nd));
  } catch {
    throw new OfflineError("can't reach navidrome");
  }
  const body = (await res.json())['subsonic-response'];
  if (body?.status !== 'ok') throw new Error(body?.error?.message ?? `navidrome ${res.status}`);
  return body as T;
}

export const nd = {
  ready: () => !!getConfig().nd.token,
  ping: (cfg: Nd) => call<{ serverVersion?: string }>('ping', {}, cfg),
  streamUrl: (id: string, maxBitRate?: number) => url('stream', { id, maxBitRate }),
  downloadUrl: (id: string) => url('download', { id }),
  coverUrl: (id: string | undefined, size = 300) => (id ? url('getCoverArt', { id, size }) : undefined),
  albums: (type: 'newest' | 'recent' | 'frequent' | 'random' | 'alphabeticalByName' | 'starred', size = 40, offset = 0) =>
    call<{ albumList2: { album?: Album[] } }>('getAlbumList2', { type, size, offset }).then((r) => r.albumList2.album ?? []),
  album: (id: string) => call<{ album: Album }>('getAlbum', { id }).then((r) => r.album),
  artists: () =>
    call<{ artists: { index?: { artist: Artist[] }[] } }>('getArtists').then((r) => (r.artists.index ?? []).flatMap((i) => i.artist)),
  artist: (id: string) => call<{ artist: Artist }>('getArtist', { id }).then((r) => r.artist),
  playlists: () => call<{ playlists: { playlist?: Playlist[] } }>('getPlaylists').then((r) => r.playlists.playlist ?? []),
  playlist: (id: string) => call<{ playlist: Playlist }>('getPlaylist', { id }).then((r) => r.playlist),
  starred: () => call<{ starred2: { song?: Song[]; album?: Album[] } }>('getStarred2').then((r) => r.starred2),
  songs: (size = 500, offset = 0) =>
    call<{ searchResult3: { song?: Song[] } }>('search3', { query: '', songCount: size, songOffset: offset, albumCount: 0, artistCount: 0 }).then(
      (r) => r.searchResult3.song ?? [],
    ),
  search: (query: string) =>
    call<{ searchResult3: { song?: Song[]; album?: Album[]; artist?: Artist[] } }>('search3', { query, songCount: 20, albumCount: 10, artistCount: 6 }).then(
      (r) => r.searchResult3,
    ),
  random: (size = 50, genre?: string) => call<{ randomSongs: { song?: Song[] } }>('getRandomSongs', { size, genre }).then((r) => r.randomSongs.song ?? []),
  similar: (id: string, count = 20) =>
    call<{ similarSongs2: { song?: Song[] } }>('getSimilarSongs2', { id, count }).then((r) => r.similarSongs2.song ?? []).catch(() => [] as Song[]),
  addToPlaylist: (playlistId: string, songId: string) => call('updatePlaylist', { playlistId, songIdToAdd: songId }),
  createPlaylist: (name: string, songId: string) => call('createPlaylist', { name, songId }),
  star: (id: string, on: boolean) => call(on ? 'star' : 'unstar', { id }),
  scrobble: (id: string, submission: boolean) => call('scrobble', { id, submission, time: Date.now() }).catch(() => {}),
  lyrics: async (id: string): Promise<Lyrics | null> => {
    try {
      const r = await call<{ lyricsList?: { structuredLyrics?: { synced: boolean; line: { start?: number; value: string }[] }[] } }>('getLyricsBySongId', { id });
      const l = r.lyricsList?.structuredLyrics?.find((x) => x.synced) ?? r.lyricsList?.structuredLyrics?.[0];
      return l?.line?.length ? { synced: l.synced, lines: l.line } : null;
    } catch {
      return null;
    }
  },
};

/** LRCLIB, when the file's tags carry no lyrics */
export async function lrclib(s: Song): Promise<Lyrics | null> {
  if (!s.artist || !s.title) return null;
  const q = `artist_name=${encodeURIComponent(s.artist)}&track_name=${encodeURIComponent(s.title)}` + (s.album ? `&album_name=${encodeURIComponent(s.album)}` : '') + (s.duration ? `&duration=${s.duration}` : '');
  try {
    const res = await fetch(`https://lrclib.net/api/get?${q}`, { headers: { 'User-Agent': 'calliope (personal music app)' } });
    if (!res.ok) return null;
    const j = await res.json();
    if (j.syncedLyrics) {
      const lines = (j.syncedLyrics as string).split('\n').flatMap((l) => {
        const m = l.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s?(.*)$/);
        return m ? [{ start: Math.round((Number(m[1]) * 60 + Number(m[2])) * 1000), value: m[3] }] : [];
      });
      if (lines.length) return { synced: true, lines };
    }
    return j.plainLyrics ? { synced: false, lines: (j.plainLyrics as string).split('\n').map((value) => ({ value })) } : null;
  } catch {
    return null;
  }
}
