import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { api, authHeaders, type Lib, type ReadInfo } from './api';
import { download, localFile, removeGroup } from './downloads';
import { readJson, writeJson } from './files';
import { perform } from './store';
import { getPrefs } from './theme';

/** where the phone's reader stands in a book: chapter (spine document) and block, or a pdf page */
export type Mark = { lib: Lib; id: number; title: string; doc: number; block: number; x?: string | null; s: number; page?: number | null; at: number };

const bookKey = (lib: Lib, id: number) => `${lib}:${id}`;

let marks: Record<string, Mark> = readJson('reads.json', {});
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useMarks = () => useSyncExternalStore(subscribe, () => marks);
export const markOf = (lib: Lib, id: number): Mark | undefined => marks[bookKey(lib, id)];

export function saveMark(m: Mark) {
  marks = { ...marks, [bookKey(m.lib, m.id)]: m };
  writeJson('reads.json', marks);
  listeners.forEach((fn) => fn());
}

/** the spot to kosync, as KOReader does, unless kindle sync is read only; queued in the outbox while ares is away */
export function sendMark(m: Mark, info: ReadInfo | undefined) {
  if (!getPrefs().kosyncWrite || !info?.sync) return;
  if (info.format === 'pdf' ? !m.page : !m.x) return;
  perform({ kind: 'readpos', lib: m.lib, book_id: m.id, title: m.title, xpointer: info.format === 'pdf' ? null : m.x, page: info.format === 'pdf' ? m.page : null }).catch(() => {});
}

export const offlineGroup = (lib: Lib, id: number) => `r:${lib}:${id}`;
const pageKey = (lib: Lib, id: number, n: number) => `p:${lib}:${id}:${n}`;

/** keeps the whole book text (or every pdf page) on the iphone, listed with the audio downloads */
export async function saveOffline(info: ReadInfo) {
  const group = offlineGroup(info.lib, info.id);
  const label = `${info.title} · ${info.format === 'pdf' ? 'pdf pages' : 'book text'}`;
  if (info.format === 'pdf') {
    for (let n = 1; n <= (info.pages ?? 0); n++) await download(pageKey(info.lib, info.id, n), api.readPageUrl(info.lib, info.id, n), 'jpg', group, label, authHeaders());
  } else {
    await download(group, api.readBookUrl(info.lib, info.id), 'json', group, label, authHeaders());
    offline.delete(group);
  }
}

export const removeOffline = (lib: Lib, id: number) => {
  offline.delete(offlineGroup(lib, id));
  removeGroup(offlineGroup(lib, id));
};

const offline = new Map<string, ReadInfo>();

/** the saved book with every chapter's blocks, when it was saved for offline */
export function offlineBook(lib: Lib, id: number): ReadInfo | undefined {
  const group = offlineGroup(lib, id);
  if (offline.has(group)) return offline.get(group);
  const uri = localFile(group);
  if (!uri) return undefined;
  try {
    const book = JSON.parse(new File(uri).textSync()) as ReadInfo;
    offline.set(group, book);
    return book;
  } catch {
    return undefined;
  }
}

export const pageSource = (lib: Lib, id: number, n: number) => {
  const local = localFile(pageKey(lib, id, n));
  return local ? { uri: local } : { uri: api.readPageUrl(lib, id, n), headers: authHeaders() };
};

export type At = { doc?: number; block?: number; page?: number };

export function openReader(lib: Lib, id: number, at: At = {}) {
  const params: Record<string, string> = { lib, id: String(id) };
  for (const [k, v] of Object.entries(at)) if (v != null) params[k] = String(v);
  router.push({ pathname: '/reader', params });
}

/** the reader on screen, so the player can send it back to a spot instead of stacking another reader */
let open: { lib: Lib; id: number; jump: (at: At) => void } | null = null;
export const setOpenReader = (r: typeof open) => {
  open = r;
};

export function readAt(lib: Lib, id: number, at: At) {
  if (open && open.lib === lib && open.id === id) {
    open.jump(at);
    router.back();
  } else openReader(lib, id, at);
}
