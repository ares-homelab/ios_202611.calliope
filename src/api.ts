import { getConfig } from './config';

export type Workflow = 'TBR' | 'ONGOING' | 'READ' | 'DNF';
export const WORKFLOWS: Workflow[] = ['TBR', 'ONGOING', 'READ', 'DNF'];

export type Book = {
  id: number;
  title: string;
  authors: string[];
  types: string[];
  workflow: string[];
  series: string | null;
  series_index: number | null;
  has_cover: boolean;
};

export type BookDetail = Book & {
  description: string | null;
  tags: string[];
  languages: string[];
  year: number | null;
  isbn: string | null;
  formats: string[];
  on_kindle?: boolean;
};

export type Send = { book_id: number; requested: string; sent: string | null };
export type Pins = { books: number[]; paths: string[] };

export type Progress = { progress: number; page: number | null; pages: number | null; source: string; updated: string };

export type Membership = { kind: 'path' | 'section'; number: number | null; name: string; title?: string | null; books: number };

export type BookFull = BookDetail & {
  pages?: number | null;
  language?: string | null;
  time_read?: number;
  last_read?: string | null;
  progress?: Progress | null;
  on_kindle?: boolean;
  sent?: Send | null;
  paths?: Membership[];
  highlight_count?: number;
};

export type EntryStatus = 'read' | 'ongoing' | 'tbr' | 'dnf' | 'to find';

export type Entry = {
  n: number;
  title: string;
  author: string;
  free?: boolean;
  blurb?: string;
  section?: string | null;
  sections?: string[];
  group?: string | null;
  note?: string;
  calibre_id: number | null;
  status: EntryStatus;
  year?: number | null;
  has_cover?: boolean;
};

export type Path = {
  section: string;
  name: string;
  read: number;
  books: Book[];
  number?: number | null;
  description?: string | null;
  sections?: string[];
  entries?: Entry[];
  in_library?: number;
  to_find?: number;
  pinned?: boolean;
  up_next?: Entry | null;
};

export type Section = {
  name: string;
  title: string;
  description: string;
  crosses: string[];
  entries: Entry[];
  in_library: number;
  read: number;
  pinned?: boolean;
};

export type Reading = {
  title: string;
  authors: string | null;
  calibre_id: number | null;
  page: number;
  pages: number;
  progress: number;
  last_read: string;
  source?: 'session' | 'kosync' | string;
};

export type Highlight = {
  id: string;
  kind: string;
  chapter: string | null;
  page: number | null;
  text: string | null;
  note: string | null;
  color: string | null;
  created: string | null;
};

export type AnyHighlight = Highlight & { book_title?: string | null; authors?: string | null; calibre_id?: number | null };
export type Highlights = { total: number; books: number; highlights: AnyHighlight[] };

export type Month = { month: string; hours: number; pages: number; days: number };
export type Session = { title: string | null; calibre_id: number | null; date: string; seconds: number; pages: number };

export type Stats = {
  hours: number;
  pages: number;
  days: number;
  streak: number;
  longest_streak: number;
  months: Month[];
  year?: number | null;
  year_hours?: number | null;
  year_days?: number | null;
  year_months?: Month[];
  library?: Partial<Record<Workflow | 'none', number>>;
  recent?: Session[];
};

export type Issue = { id: number; title: string; date: string | null; added: string; has_cover: boolean; sent: string | null; opened: boolean };
export type Issues = { issues: Issue[]; next_issue: string | null; keep: number };

export type Home = {
  books_read?: number;
  seconds_30?: number;
  reading_days_30?: number;
  reading_days?: number;
  reading?: Reading[];
  last_sync?: string | null;
  path?: Path | null;
  latest_issue?: Issue | null;
  next_issue?: string | null;
};

export type AudioTrack = { n: number; title: string; seconds: number };
export type Resume = { track: number; seconds: number; progress: number; source: string; updated?: string | null };
export type Audiobook = {
  id: number;
  title: string;
  authors: string[];
  source: string;
  page?: string | null;
  readers?: string[];
  complete?: boolean;
  seconds: number;
  tracks?: AudioTrack[];
  resume?: Resume | null;
  has_cover?: boolean;
  chapters_total?: number | null;
  track_count?: number;
};
export type QueueItem = { position: number; id: number; title: string | null; kind: string; chapters_ready: number };
export type Para = { start: number; text: string; p: number; kind?: string };
export type AudioText = { track: number; title: string; paras: Para[]; exact: boolean };
export type Position = { track: number; seconds: number; listened: number };

export type RecapTop = { kind: 'artist' | 'author'; name: string; seconds: number; plays?: number; books?: number };
export type Recap = {
  month: string;
  music_seconds: number;
  audiobook_seconds: number;
  reading_seconds: number;
  books_finished: number;
  streak: number;
  today?: { reading: number; listening: number };
  top: RecapTop[];
  path?: { name: string; number?: number | null; read: number; total: number; eta?: string | null } | null;
};
export type MixSong = { id: string; line?: string | null };
export type MixSection = { title: string; sub?: string; songs: MixSong[] };
export type Mix = { id: string; kind: string; title: string; sub: string; color?: string; sections: MixSection[]; cards?: { name: string; numeral: string; how: string; meaning: string }[] };
export type Wanted = { total: number; items: { title: string; artist: string; album?: string | null; plays: number; source: string }[] };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export class OfflineError extends Error {}

type Listener = () => void;
export const net = { online: null as boolean | null, syncedAt: null as number | null };
const netListeners = new Set<Listener>();
export const onNet = (fn: Listener) => {
  netListeners.add(fn);
  return () => {
    netListeners.delete(fn);
  };
};
const setNet = (online: boolean) => {
  net.online = online;
  if (online) net.syncedAt = Date.now();
  netListeners.forEach((fn) => fn());
};

export const authHeaders = (): Record<string, string> => ({ Authorization: `Bearer ${getConfig().token}` });

async function request<T>(path: string, init: RequestInit = {}, cfg: { url: string; token: string } = getConfig()): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(cfg.url + path, {
      ...init,
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    setNet(false);
    throw new OfflineError("can't reach ares");
  } finally {
    clearTimeout(timer);
  }
  setNet(true);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {}
    throw new ApiError(res.status, res.status === 401 || res.status === 403 ? 'the token was refused' : `${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });

const q = (params: Record<string, string | number | boolean | undefined | null>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

export const api = {
  hello: (cfg?: { url: string; token: string }) => request<{ hello: string }>('/hello', {}, cfg),
  home: () => request<Home>('/home'),
  books: () => request<Book[]>('/books'),
  book: (id: number) => request<BookFull>(`/books/${id}`),
  coverUrl: (id: number) => `${getConfig().url}/books/${id}/cover`,
  setStatus: (id: number, workflow: Workflow) => put<BookFull>(`/books/${id}/status`, { workflow }),
  send: (id: number) => request<Send>(`/books/${id}/send`, { method: 'POST' }),
  sends: () => request<Send[]>('/sends'),
  pins: () => request<Pins>('/pins'),
  setPins: (pins: Pins) => put<Pins>('/pins', pins),
  paths: () => request<Path[]>('/paths'),
  path: (n: number) => request<Path>(`/paths/${n}`),
  sections: () => request<Section[]>('/sections'),
  section: (name: string) => request<Section>(`/sections/${encodeURIComponent(name)}`),
  reading: () => request<Reading[]>('/reading'),
  bookHighlights: (id: number) => request<Highlight[]>(`/books/${id}/highlights`),
  highlights: (p: { q?: string; book_id?: number; notes?: boolean } = {}) => request<Highlights>(`/highlights${q(p)}`),
  stats: (year?: number) => request<Stats>(`/stats${q({ year })}`),
  issues: () => request<Issues>('/issues'),
  audiobooks: () => request<Audiobook[]>('/audiobooks'),
  audiobook: (id: number) => request<Audiobook>(`/audiobooks/${id}`),
  audioText: (id: number, n: number) => request<AudioText>(`/audiobooks/${id}/text/${n}`),
  trackUrl: (id: number, n: number) => `${getConfig().url}/audiobooks/${id}/tracks/${n}`,
  position: (id: number, p: Position) => put<{ xpointer: string | null; progress: number | null }>(`/audiobooks/${id}/position`, p),
  audioQueue: () => request<QueueItem[]>('/audioqueue'),
  recap: (month?: string) => request<Recap>(`/recap${q({ month })}`),
  mixes: () => request<Mix[]>('/mixes'),
  mix: (id: string) => request<Mix>(`/mixes/${encodeURIComponent(id)}`),
  played: (songs: { id: string; at: string; seconds: number; title?: string; artist?: string; album?: string }[]) => request<{ ok: boolean }>('/plays', { method: 'POST', body: JSON.stringify(songs) }),
  wanted: () => request<Wanted>('/wanted'),
  note: (n: { book_id: number; track: number; seconds: number; text: string; quote: string; voice?: boolean }) => request<{ id: string }>('/notes', { method: 'POST', body: JSON.stringify(n) }),
  voiceState: (id: string) => request<{ state: 'pending' | 'done' | 'failed'; text: string; language?: string }>(`/notes/${id}/voice`),
  queueBook: (id: number) => request<{ queued: boolean; position: number; of: number }>(`/audiobooks/${id}/queue`, { method: 'POST' }),
};

export const pathKey = (p: { section: string; name: string }) => `${p.section}/${p.name}`;
export const sectionKey = (name: string) => `sections/${name}`;
