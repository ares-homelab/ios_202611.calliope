import { router } from 'expo-router';
import { Alert } from 'react-native';
import { api, type Audiobook, type Mix } from './api';
import { nd, type Album, type Song } from './navidrome';
import { bookTracks, current, getPlayer, play, playQueue, songTrack, type Context } from './player';

const shuffled = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function playSongs(songs: Song[], index = 0, ctx?: Context, shuffle = false) {
  if (!songs.length) return;
  const list = shuffle ? shuffled(songs) : songs;
  playQueue(list.map(songTrack), shuffle ? 0 : index, 0, ctx);
}

export const albumContext = (a: Album): Context => ({ kind: 'album', id: a.id, title: a.name, sub: a.artist, coverArt: a.coverArt });

export async function playAlbum(a: Album, index = 0, shuffle = false) {
  const full = a.song ? a : await nd.album(a.id);
  playSongs(full.song ?? [], index, albumContext(full), shuffle);
}

export async function playMix(m: Mix, shuffle = false) {
  const ids = m.sections.flatMap((s) => s.songs.map((x) => x.id));
  const songs = await songsById(ids);
  playSongs(songs, 0, { kind: 'mix', id: m.id, title: m.title, sub: m.sub }, shuffle);
}

const songCache = new Map<string, Song>();
let cachedAt = 0;
export async function songsById(ids: string[]): Promise<Song[]> {
  const missing = ids.filter((id) => !songCache.has(id));
  if (missing.length && Date.now() - cachedAt > 60000) {
    cachedAt = Date.now();
    const all = await nd.songs(5000);
    all.forEach((s) => songCache.set(s.id, s));
  }
  return ids.map((id) => songCache.get(id)).filter((s): s is Song => !!s);
}

/** plays a book from where it stands: this iphone's own position when it is the loaded book, else kosync's (the kindle's) */
export async function playBook(id: number, from?: { track: number; seconds: number }) {
  const s = getPlayer();
  const t = current(s);
  if (!from && t?.kind === 'book' && t.bookId === id) return play();
  let b: Audiobook;
  try {
    b = await api.audiobook(id);
  } catch (e) {
    Alert.alert("can't start the audiobook", (e as Error).message);
    return;
  }
  const tracks = bookTracks(b);
  if (!tracks.length) return;
  const at = from ?? (b.resume ? { track: b.resume.track, seconds: b.resume.seconds } : { track: 1, seconds: 0 });
  playQueue(tracks, Math.max(0, Math.min(tracks.length - 1, at.track - 1)), at.seconds, { kind: 'book', id: String(id), title: b.title, sub: b.authors.join(', '), bookId: id });
}

export async function listen(id: number) {
  await playBook(id);
  router.push('/player');
}

export function openContext(h: Context) {
  if (h.kind === 'album') router.push({ pathname: '/album/[id]', params: { id: h.id } });
  else if (h.kind === 'playlist') router.push({ pathname: '/playlist/[id]', params: { id: h.id } });
  else if (h.kind === 'mix') router.push({ pathname: '/mix/[id]', params: { id: h.id } });
  else if (h.kind === 'artist') router.push({ pathname: '/artist/[id]', params: { id: h.id } });
  else if (h.kind === 'book' && h.bookId) router.push({ pathname: '/audiobook/[id]', params: { id: String(h.bookId) } });
}
