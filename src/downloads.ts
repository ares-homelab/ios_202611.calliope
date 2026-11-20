import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from './files';

const dir = new Directory(Paths.document, 'audio');
type Saved = { key: string; name: string; bytes: number; group: string; label: string };

let saved: Record<string, Saved> = readJson('downloads.json', {});
let busy = new Set<string>();
let snap = { saved, busy };
const listeners = new Set<() => void>();
const emit = () => {
  snap = { saved, busy };
  writeJson('downloads.json', saved);
  listeners.forEach((fn) => fn());
};

const fileName = (key: string, ext: string) => `${key.replace(/[^a-z0-9]+/gi, '_')}.${ext}`;

export function localFile(key: string) {
  const s = saved[key];
  if (!s) return null;
  const f = new File(dir, s.name);
  return f.exists ? f.uri : null;
}

export async function download(key: string, url: string, ext: string, group: string, label: string, headers?: Record<string, string>) {
  if (saved[key] || busy.has(key)) return;
  busy = new Set(busy).add(key);
  emit();
  try {
    dir.create({ idempotent: true, intermediates: true });
    const name = fileName(key, ext);
    const target = new File(dir, name);
    if (target.exists) target.delete();
    const f = await File.downloadFileAsync(url, target, { headers });
    saved = { ...saved, [key]: { key, name, bytes: f.size ?? 0, group, label } };
  } finally {
    busy = new Set(busy);
    busy.delete(key);
    emit();
  }
}

export function removeGroup(group: string) {
  const next = { ...saved };
  for (const s of Object.values(saved))
    if (s.group === group) {
      try {
        new File(dir, s.name).delete();
      } catch {}
      delete next[s.key];
    }
  saved = next;
  emit();
}

export function removeKeys(keys: string[]) {
  const next = { ...saved };
  for (const k of keys) {
    const s = saved[k];
    if (!s) continue;
    try {
      new File(dir, s.name).delete();
    } catch {}
    delete next[k];
  }
  saved = next;
  emit();
}

export function removeAll() {
  if (dir.exists) dir.delete();
  saved = {};
  emit();
}

export const useDownloads = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => snap,
  );

export const groupState = (s: typeof snap, group: string, keys: string[]) => {
  const have = keys.filter((k) => s.saved[k]).length;
  return { have, all: keys.length > 0 && have === keys.length, busy: keys.some((k) => s.busy.has(k)) };
};

export const totalBytes = (s: typeof snap) => Object.values(s.saved).reduce((a, x) => a + x.bytes, 0);

export const fmtBytes = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
