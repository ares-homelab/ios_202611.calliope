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
  lists?: string[];
  /** has a copy on the kindle; null or missing from an older api */
  kindle?: boolean | null;
  /** held by the quality check, reasons in plain words */
  review?: string[] | null;
};

export type FanficBook = {
  id: number;
  title: string;
  authors: string[];
  fandom?: string;
  series?: string | null;
  series_index?: number | null;
  workflow?: string[];
  lists?: string[];
  has_cover?: boolean;
};

export type Article = {
  id: number;
  title: string;
  domain?: string | null;
  url?: string | null;
  reading_time?: number | null;
  created?: string | null;
  archived?: boolean;
  starred?: boolean;
  preview?: string | null;
};
/** inline formatting of a block; older apis send none, so text is always there too */
export type Run = { t: string; i?: boolean | null; b?: boolean | null; sup?: boolean | null; href?: string | null; note?: string | null };
export type Note = { t: string; r?: Run[] | null };
export type ArticleBlock = { kind: string; text: string; runs?: Run[] | null };
export type ArticleText = Article & { blocks?: ArticleBlock[]; notes?: Record<string, Note> | null; html?: string | null };

export type Lib = 'calliope' | 'fanfic';
export type ReadBlock = { k: string; t: string; x?: string | null; s: number; src?: string | null; r?: Run[] | null };
export type ReadChapter = { n: number; title?: string | null; s: number; words: number; blocks?: ReadBlock[]; notes?: Record<string, Note> | null };
export type TocEntry = { title: string; doc: number; block: number; level: number };
export type Spot = { doc: number; block: number; xpointer?: string | null; share: number; page?: number | null };
export type ReadKosync = { percentage: number; progress?: string | null; device?: string | null; updated?: string | null; spot?: Spot | null };
export type ReadInfo = {
  lib: Lib;
  id: number;
  title: string;
  authors: string[];
  format: 'epub' | 'pdf' | null;
  source: 'kindle' | 'calibre' | string;
  version: string;
  md5?: string | null;
  sync?: boolean;
  words?: number;
  pages?: number | null;
  toc?: TocEntry[];
  chapters: ReadChapter[];
  kosync?: ReadKosync | null;
  /** the phone's place kept on ares while the kindle has no copy of the book */
  phone?: ReadKosync | null;
};
export type FanficDetail = FanficBook & { description?: string | null; tags?: string[]; formats?: string[] };

export type ListInfo = { name: string; calliope?: number; fanfic?: number };

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
  order?: number | null;
  summary?: string | null;
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

export type Issue = { id: number; title: string; date: string | null; added: string; has_cover: boolean; sent: string | null; opened: boolean; on_kindle?: boolean; progress?: number | null };
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
export type Para = { start: number; text: string; p: number; kind?: string; r?: Run[] | null };
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
export type MixCard = { id?: string | null; name: string; numeral: string; how: string; meaning: string; reversed?: boolean };
export type Mix = { id: string; kind: string; title: string; sub: string; color?: string; sections: MixSection[]; cards?: MixCard[]; interpretation?: string | null };
export type Wanted = { total: number; items: { title: string; artist: string; album?: string | null; duration?: number | null; plays: number; source: string; sources?: string[] }[] };

export type FindKind = 'tv' | 'movies' | 'music' | 'books' | 'comics';
export type FindStatus = 'new' | 'wanted' | 'downloading' | 'partial' | 'done' | 'failed' | 'removed' | 'unknown';
export type Found = { kind: FindKind; id: string; title: string; creator?: string | null; type?: string | null; source?: string | null; year?: number | null; overview?: string | null; detail?: string | null; poster?: string | null; in_library: boolean; status: FindStatus };
export type FoundResults = { results: Found[]; errors?: Partial<Record<FindKind, string>>; pending?: FindKind[]; needs?: Partial<Record<FindKind, string>> };
export type FoundRequest = Pick<Found, 'kind' | 'id' | 'title' | 'creator' | 'type' | 'year' | 'poster' | 'status'> & { added: string; progress?: number | null; detail?: string | null; releases?: PickedRelease[] };
/** a release sent to the import queue */
export type PickedRelease = { id: string; title?: string | null; status: string; error?: string | null };
export type ReleaseKind = 'tv' | 'movies' | 'music';
export type Release = { guid: string; title: string; size?: number | null; seeders: number; leechers: number; indexer: string; age_days?: number | null; quality?: string | null; resolution?: string | null; language?: string | null; score: number };
export type Releases = { title?: string | null; results: Release[]; pending?: boolean };
export type Part = { season?: number; episode?: number };

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

export type DayStat = { date: string; read: number; heard: number; pages: number };
export type DayBook = { calibre_id: number | null; title: string; read: number; heard: number; pages: number };
export type Insights = {
  year: number;
  days: DayStat[];
  streak: number;
  best_streak: number;
  active_30: number;
  pages_per_day: number;
  books: number;
  pages: number;
  hours: number;
  finished: { month: number; calibre_id: number | null; title: string }[];
  sections: { name: string; books: number }[];
  hours_of_day: { read: number; heard: number }[];
  avg_session_min: number;
  pages_per_hour: number;
  heard_share: number;
  pace: { calibre_id: number | null; title: string; kind: 'read' | 'heard'; pages_per_hour: number | null; hours_left: number | null }[];
};

export const authHeaders = (): Record<string, string> => ({ Authorization: `Bearer ${getConfig().token}` });

async function request<T>(path: string, init: RequestInit = {}, cfg: { url: string; token: string } = getConfig(), wait = 10000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), wait);
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
  fanficBooks: () => request<FanficBook[]>('/fanfic/books'),
  lists: () => request<ListInfo[]>('/lists'),
  articles: () => request<Article[]>('/articles'),
  article: (id: number) => request<ArticleText>(`/articles/${id}`),
  book: (id: number) => request<BookFull>(`/books/${id}`),
  coverUrl: (id: number) => `${getConfig().url}/books/${id}/cover`,
  setStatus: (id: number, workflow: Workflow) => put<BookFull>(`/books/${id}/status`, { workflow }),
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
  insights: (year?: number) => request<Insights>(`/stats/insights${q({ year })}`),
  statsDay: (date: string) => request<DayBook[]>(`/stats/day/${date}`),
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
  find: (text: string, kind?: FindKind, editions?: boolean) => request<FoundResults>(`/search${q({ q: text, kind, editions })}`, {}, undefined, 60000),
  findAdd: ({ kind, id, title, creator }: Found) => request<Found>('/search/add', { method: 'POST', body: JSON.stringify({ kind, id, title, creator }) }, undefined, 60000),
  releases: (f: Pick<Found, 'kind' | 'id'>, part: Part) => request<Releases>(`/search/releases${q({ kind: f.kind, id: f.id, ...part })}`, {}, undefined, 60000),
  grabRelease: (f: Pick<Found, 'kind' | 'id'>, guid: string, part: Part) => request<FoundRequest>('/search/releases/grab', { method: 'POST', body: JSON.stringify({ kind: f.kind, id: f.id, guid, ...part }) }, undefined, 200000),
  findRequests: () => request<FoundRequest[]>('/search/requests', {}, undefined, 30000),
  wanted: () => request<Wanted>('/wanted'),
  note: (n: { book_id: number; track: number; seconds: number; text: string; quote: string; voice?: boolean }) => request<{ id: string }>('/notes', { method: 'POST', body: JSON.stringify(n) }),
  voiceState: (id: string) => request<{ state: 'pending' | 'done' | 'failed'; text: string; language?: string }>(`/notes/${id}/voice`),
  fanficBook: (id: number) => request<FanficDetail>(`/fanfic/books/${id}`),
  setFanficStatus: (id: number, workflow: Workflow) => put<{ id: number; workflow: string }>(`/fanfic/books/${id}/status`, { workflow }),
  readInfo: (lib: Lib, id: number) => request<ReadInfo>(`/read/${lib}/${id}`),
  readChapter: (lib: Lib, id: number, n: number) => request<ReadChapter>(`/read/${lib}/${id}/chapters/${n}`),
  readBookUrl: (lib: Lib, id: number) => `${getConfig().url}/read/${lib}/${id}/book`,
  readImageUrl: (lib: Lib, id: number, src: string) => `${getConfig().url}/read/${lib}/${id}/images/${src.split('/').map(encodeURIComponent).join('/')}`,
  readPageUrl: (lib: Lib, id: number, n: number) => `${getConfig().url}/read/${lib}/${id}/pages/${n}?width=1200`,
  readPosition: (lib: Lib, id: number, p: { xpointer?: string | null; page?: number | null }) => put<{ progress: string; percentage: number }>(`/read/${lib}/${id}/position`, p),
  readToAudio: (id: number, xpointer: string) => request<{ track: number; seconds: number }>(`/read/calliope/${id}/audio${q({ xpointer })}`),
  audioToRead: (id: number, track: number, seconds: number) => request<Spot>(`/read/calliope/${id}/spot${q({ track, seconds })}`),
  queueBook: (id: number) => request<{ queued: boolean; position: number; of: number }>(`/audiobooks/${id}/queue`, { method: 'POST' }),
};

export const pathKey = (p: { section: string; name: string }) => `${p.section}/${p.name}`;
export const sectionKey = (name: string) => `sections/${name}`;
