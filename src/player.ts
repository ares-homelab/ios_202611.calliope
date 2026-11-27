import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { api, authHeaders } from './api';
import { localFile } from './downloads';
import { readJson, writeJson } from './files';
import { nd, type Song } from './navidrome';
import { afterEnd, nextIndex as nextAt, shuffleRest, startShuffled, unshuffle, type Repeat } from './queue';
import { perform } from './store';
import { getPrefs } from './theme';

export type Track = {
  key: string;
  kind: 'book' | 'song';
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bookId?: number;
  n?: number;
  song?: Song;
  smart?: boolean;
  ext?: string;
};

export type Context = { kind: 'album' | 'playlist' | 'book' | 'mix' | 'artist' | 'songs'; id: string; title: string; sub?: string; coverArt?: string; bookId?: number };

let history: Context[] = readJson<Context[]>('history.json', []);
const historyListeners = new Set<() => void>();
export const useHistory = () =>
  useSyncExternalStore(
    (fn) => {
      historyListeners.add(fn);
      return () => {
        historyListeners.delete(fn);
      };
    },
    () => history,
  );
function remember(ctx: Context) {
  history = [ctx, ...history.filter((h) => !(h.kind === ctx.kind && h.id === ctx.id))].slice(0, 20);
  writeJson('history.json', history);
  historyListeners.forEach((fn) => fn());
}

export type Sleep = { until: number } | { endOfTrack: true } | null;

export type PlayerState = {
  queue: Track[];
  index: number;
  playing: boolean;
  buffering: boolean;
  time: number;
  duration: number;
  rate: number;
  sleep: Sleep;
  label: string;
  smart: boolean;
  repeat: Repeat;
  shuffle: boolean;
  /** the queue in its original order while shuffle is on */
  order: Track[];
};

const saved = readJson<Partial<PlayerState>>('player.json', {});
let state: PlayerState = {
  queue: saved.queue ?? [],
  index: saved.index ?? 0,
  playing: false,
  buffering: false,
  time: saved.time ?? 0,
  duration: 0,
  rate: saved.rate ?? 1,
  sleep: null,
  label: saved.label ?? '',
  smart: saved.smart ?? false,
  repeat: saved.repeat === 'all' || saved.repeat === 'one' ? saved.repeat : 'off',
  shuffle: saved.shuffle ?? false,
  order: saved.order ?? [],
};

const listeners = new Set<() => void>();
const set = (next: Partial<PlayerState>) => {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
};
const persist = () => {
  const { queue, index, time, rate, label, smart, repeat, shuffle, order } = state;
  writeJson('player.json', { queue, index, time, rate, label, smart, repeat, shuffle, order });
};

export const getPlayer = () => state;
export const usePlayer = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state,
  );
export const current = (s = state): Track | undefined => s.queue[s.index];

const players = [createAudioPlayer(null, { updateInterval: 500 }), createAudioPlayer(null, { updateInterval: 500 })];
let player = players[0];
let fade: { from: AudioPlayer; timer: ReturnType<typeof setInterval> } | null = null;
let userVolume = 1;
let loadedKey: string | null = null;
let pendingSeek: number | null = null;
let playWhenReady = false;
let listened = 0;
let lastTick = 0;
let lastSave = 0;
let scrobbled = false;
let heard = 0;
let startedAt = '';

let unsent = readJson<{ id: string; at: string; seconds: number; title?: string; artist?: string; album?: string }[]>('plays.json', []);
function logPlay() {
  const t = current();
  if (t?.kind === 'song' && heard >= 30) {
    unsent = [...unsent, { id: t.song!.id, at: startedAt || new Date().toISOString(), seconds: Math.round(heard), title: t.title, artist: t.artist, album: t.album }];
    writeJson('plays.json', unsent);
    const batch = unsent;
    api
      .played(batch)
      .then(() => {
        unsent = unsent.filter((x) => !batch.includes(x));
        writeJson('plays.json', unsent);
      })
      .catch(() => {});
  }
  heard = 0;
}

/** playback mode; voice notes switch recording on and call this when they stop */
export const playbackMode = () =>
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix', allowsRecording: false }).catch(() => {});
playbackMode();

function source(t: Track) {
  const local = localFile(t.key);
  if (local) return { uri: local };
  if (t.kind === 'book') return { uri: api.trackUrl(t.bookId!, t.n!), headers: authHeaders() };
  const q = getPrefs()[cellular ? 'cellular' : 'wifi'];
  return { uri: nd.streamUrl(t.song!.id, q === 'original' ? undefined : Number(q)) };
}

let cellular = false;
const watchNet = (n: Network.NetworkState) => {
  cellular = n.type === Network.NetworkStateType.CELLULAR;
};
Network.getNetworkStateAsync().then(watchNet).catch(() => {});
Network.addNetworkStateListener(watchNet);

async function bookArt(id: number) {
  const f = new File(Paths.cache, `art-${id}.jpg`);
  if (f.exists) return f.uri;
  try {
    return (await File.downloadFileAsync(api.coverUrl(id), f, { headers: authHeaders() })).uri;
  } catch {
    return undefined;
  }
}

async function lockScreen(t: Track) {
  const meta = { title: t.title, artist: t.artist, albumTitle: t.album };
  const book = t.kind === 'book';
  player.setActiveForLockScreen(true, meta, { showSeekForward: book, showSeekBackward: book });
  const artworkUrl = book ? await bookArt(t.bookId!) : nd.coverUrl(t.song?.coverArt, 600);
  if (artworkUrl && current()?.key === t.key) player.updateLockScreenMetadata({ ...meta, artworkUrl });
}

/** sends the book position to ares (kosync + listening time); kept in the outbox while ares is away */
function saveBook(force = false) {
  const t = current();
  if (!t || t.kind !== 'book') return;
  if (!force && Date.now() - lastSave < 15000) return;
  lastSave = Date.now();
  const p = { kind: 'position' as const, book_id: t.bookId!, title: t.album ?? t.title, track: t.n!, seconds: Math.round(state.time), listened: Math.round(listened) };
  listened = 0;
  perform(p).catch(() => {});
}

function endFade() {
  if (!fade) return;
  clearInterval(fade.timer);
  fade.from.pause();
  fade.from.volume = userVolume;
  fade = null;
  player.volume = userVolume;
}

/** spotify-style crossfade: only on automatic song-to-song changes, never for books or manual skips */
function crossfade(index: number, seconds: number) {
  const t = state.queue[index];
  const from = player;
  const to = players[0] === player ? players[1] : players[0];
  logPlay();
  startedAt = new Date().toISOString();
  set({ index, time: 0, duration: t.duration, buffering: true });
  loadedKey = t.key;
  pendingSeek = null;
  scrobbled = false;
  to.volume = 0;
  to.replace(source(t));
  to.setPlaybackRate(1);
  to.play();
  player = to;
  lockScreen(t);
  nd.scrobble(t.song!.id, false);
  persist();
  const start = Date.now();
  fade = {
    from,
    timer: setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / (seconds * 1000));
      from.volume = userVolume * (1 - k);
      to.volume = userVolume * k;
      if (k >= 1) endFade();
    }, 100),
  };
}

const nextIndex = () => nextAt(state.index, state.queue.length, state.repeat);

function load(index: number, at: number, play: boolean) {
  const t = state.queue[index];
  if (!t) return;
  endFade();
  if (current()?.kind === 'book' && loadedKey) saveBook(true);
  if (loadedKey) logPlay();
  startedAt = new Date().toISOString();
  set({ index, time: at, duration: t.duration, buffering: true });
  loadedKey = t.key;
  pendingSeek = at > 0 ? at : null;
  playWhenReady = play;
  scrobbled = false;
  player.replace(source(t));
  player.setPlaybackRate(t.kind === 'book' ? state.rate : 1);
  if (play && !pendingSeek) player.play();
  lockScreen(t);
  if (t.kind === 'song' && play) nd.scrobble(t.song!.id, false);
  persist();
}

function onStatus(s: AudioStatus) {
  const t = current();
  if (!t) return;
  const now = Date.now();
  if (s.playing && lastTick) {
    const d = Math.min((now - lastTick) / 1000, 2);
    if (t.kind === 'book') listened += d;
    else heard += d;
  }
  lastTick = s.playing ? now : 0;
  if (s.isLoaded && pendingSeek != null) {
    const at = pendingSeek;
    pendingSeek = null;
    player.seekTo(at).then(() => playWhenReady && player.play());
  }
  set({ playing: s.playing, buffering: s.isBuffering, time: pendingSeek ?? s.currentTime, duration: s.duration || t.duration });
  if (t.kind === 'song' && !scrobbled && s.currentTime > Math.min(240, (s.duration || t.duration) / 2)) {
    scrobbled = true;
    nd.scrobble(t.song!.id, true);
  }
  if (s.playing) saveBook();
  const sl = state.sleep;
  const cf = getPrefs().crossfade;
  const ni = nextIndex();
  const dur = s.duration || t.duration;
  if (cf && !fade && s.playing && t.kind === 'song' && state.repeat !== 'one' && ni != null && state.queue[ni]?.kind === 'song' && !(sl && 'endOfTrack' in sl) && dur > cf * 2 && dur - s.currentTime <= cf) {
    crossfade(ni, cf);
    return;
  }
  if (sl && 'until' in sl && now >= sl.until) {
    set({ sleep: null });
    pause();
  }
  if (s.didJustFinish) {
    logPlay();
    if (sl && 'endOfTrack' in sl) {
      set({ sleep: null });
      if (state.index + 1 < state.queue.length) load(state.index + 1, 0, false);
      return;
    }
    const after = afterEnd(state.index, state.queue.length, state.repeat);
    if (after == null) {
      set({ playing: false });
      saveBook(true);
    } else load(after, 0, true);
  }
}
for (const p of players) p.addListener('playbackStatusUpdate', (s: AudioStatus) => p === player && onStatus(s));

AppState.addEventListener('change', (a) => {
  if (a !== 'active') {
    saveBook(true);
    persist();
  }
});

/** starts a new queue; songs follow the shuffle setting (`shuffle` turns it on or off first) */
export function playQueue(queue: Track[], index = 0, at = 0, ctx?: Context, shuffle?: boolean) {
  if (ctx) remember(ctx);
  const mix = queue[index]?.kind === 'song' && (shuffle ?? state.shuffle);
  if (mix) set({ queue: startShuffled(queue, index), order: queue, label: ctx?.title ?? '', shuffle: true });
  else set({ queue, order: [], label: ctx?.title ?? '', shuffle: shuffle === false ? false : state.shuffle });
  load(mix ? 0 : index, at, true);
}

export function play() {
  const t = current();
  if (!t) return;
  if (loadedKey !== t.key) return load(state.index, state.time, true);
  player.play();
}

export function pause() {
  endFade();
  player.pause();
  saveBook(true);
  persist();
}

export const toggle = () => (state.playing ? pause() : play());

export function next() {
  const i = nextIndex();
  if (i != null) load(i, 0, true);
}

export function prev() {
  if (state.time > 3 || state.index === 0) return seek(0);
  load(state.index - 1, 0, true);
}

export function jump(index: number) {
  load(index, 0, true);
}

export function seek(seconds: number) {
  const t = current();
  if (!t) return;
  const at = Math.max(0, Math.min(seconds, (state.duration || t.duration) - 1));
  if (loadedKey !== t.key) {
    set({ time: at });
    return;
  }
  set({ time: at });
  player.seekTo(at);
}

export const skip = (delta: number) => seek(state.time + delta);

export function setRate(rate: number) {
  set({ rate });
  if (current()?.kind === 'book') player.setPlaybackRate(rate);
  persist();
}

export function setSleep(sleep: Sleep) {
  set({ sleep });
}

export function setRepeat(repeat: Repeat) {
  set({ repeat });
  persist();
}

/** shuffles the up-next part; turning it off goes back to the original order at the current song */
export function setShuffle(on: boolean) {
  const t = current();
  if (on === state.shuffle && (!on || state.order.length)) return;
  if (on) set({ shuffle: true, order: state.queue, queue: shuffleRest(state.queue, state.index) });
  else if (state.order.length) set({ shuffle: false, order: [], ...unshuffle(state.order, t) });
  else set({ shuffle: false });
  persist();
  if (!on && state.smart) setSmart(true);
}

const orderAt = () => {
  const t = current();
  const i = t ? state.order.findIndex((x) => x.key === t.key) : -1;
  return i < 0 ? state.order.length - 1 : i;
};

export function addNext(tracks: Track[]) {
  const q = [...state.queue];
  q.splice(state.index + 1, 0, ...tracks);
  const order = [...state.order];
  if (order.length) order.splice(orderAt() + 1, 0, ...tracks);
  set({ queue: q, order });
  persist();
}

export function addLast(tracks: Track[]) {
  set({ queue: [...state.queue, ...tracks], order: state.order.length ? [...state.order, ...tracks] : [] });
  persist();
}

export function removeAt(i: number) {
  if (i === state.index) return;
  const gone = state.queue[i];
  const q = state.queue.filter((_, j) => j !== i);
  const k = state.order.findIndex((x) => x.key === gone?.key);
  set({ queue: q, index: i < state.index ? state.index - 1 : state.index, order: k < 0 ? state.order : state.order.filter((_, j) => j !== k) });
  persist();
}

export function clearUpNext() {
  set({ queue: state.queue.slice(0, state.index + 1), order: state.order.length ? state.order.slice(0, orderAt() + 1) : [] });
  persist();
}

/** smart shuffle: after every two songs of the queue, one similar song from the library */
export async function setSmart(on: boolean) {
  set({ smart: on });
  persist();
  const t = current();
  if (!on || !t?.song) {
    set({ queue: state.queue.filter((x, i) => i <= state.index || !x.smart) });
    return;
  }
  const have = new Set(state.queue.map((x) => x.song?.id));
  const similar = (await nd.similar(t.song.id, 30)).filter((s) => !have.has(s.id));
  const pool = similar.length ? similar : await nd.random(15);
  const rest = state.queue.slice(state.index + 1);
  const mixed: Track[] = [];
  rest.forEach((x, i) => {
    mixed.push(x);
    if (i % 2 === 1 && pool.length) mixed.push({ ...songTrack(pool.shift()!), smart: true });
  });
  while (mixed.length < 10 && pool.length) mixed.push({ ...songTrack(pool.shift()!), smart: true });
  set({ queue: [...state.queue.slice(0, state.index + 1), ...mixed] });
  persist();
}

export const songTrack = (s: Song): Track => ({
  key: `s:${s.id}`,
  kind: 'song',
  title: s.title,
  artist: s.artist ?? '',
  album: s.album,
  duration: s.duration ?? 0,
  song: s,
});

export const bookTracks = (b: { id: number; title: string; authors: string[]; source: string; tracks?: { n: number; title: string; seconds: number }[] }): Track[] =>
  (b.tracks ?? []).map((t) => ({
    key: `b:${b.id}:${t.n}`,
    kind: 'book',
    title: t.title,
    artist: b.authors.join(', '),
    album: b.title,
    duration: t.seconds,
    bookId: b.id,
    n: t.n,
    ext: b.source === 'kokoro' ? 'm4a' : 'mp3',
  }));

export const remaining = (s = state) => s.queue.slice(s.index).reduce((a, t, i) => a + (i === 0 ? Math.max(0, (s.duration || t.duration) - s.time) : t.duration), 0);

export function setVolume(v: number) {
  userVolume = Math.max(0, Math.min(1, v));
  if (!fade) player.volume = userVolume;
  set({});
}
export const getVolume = () => userVolume;
