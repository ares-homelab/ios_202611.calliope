import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useAudiobooks, useAudioQueue, useBooks, useFanficBooks, useLists, useSections } from '../data';
import { authors, hm } from '../format';
import { listen } from '../play';
import { audioState, fromBook, fromFanfic, hasStatus, select, title, tree, type Item } from '../shelves';
import { F, fs, useTheme } from '../theme';
import { openAudiobook, openBook } from './bits';
import { Icon } from './icon';
import { Cover, useUi } from './ui';

/** read: the whole library, every book opens its page; listen: only books with audio, which play */
export type Mode = 'read' | 'listen';

/** reading shows what is on the kindle (plus books under review and periodicals); listening keeps every book */
const onShelf = (b: Item, mode: Mode) =>
  mode === 'listen' || b.lib === 'fanfic' || b.kindle !== false || !!b.review?.length || b.types.some((t) => t.startsWith('periodicals'));

/** both libraries, the shelves tree, and what has audio or is queued */
export function useLibrary(mode: Mode = 'read') {
  const books = useBooks();
  const fanfic = useFanficBooks();
  const sections = useSections();
  const lists = useLists();
  const audiobooks = useAudiobooks();
  const queue = useAudioQueue();
  const items = useMemo(
    () => [...(books.data ?? []).map(fromBook), ...(fanfic.data ?? []).map(fromFanfic)].filter((b) => onShelf(b, mode)),
    [books.data, fanfic.data, mode],
  );
  const root = useMemo(() => tree(items), [items]);
  const audio = useMemo(() => new Map((audiobooks.data ?? []).map((a) => [a.id, a])), [audiobooks.data]);
  const queued = useMemo(() => new Map((queue.data ?? []).map((q) => [q.id, q])), [queue.data]);
  const all = [books, fanfic, sections, lists, audiobooks, queue];
  return {
    items,
    root,
    audio,
    queued,
    sections: sections.data ?? [],
    lists: lists.data ?? [],
    loading: all.some((r) => r.loading),
    error: books.error && !books.data ? books.error : undefined,
    refresh: () => all.forEach((r) => r.refresh()),
    refreshQueue: queue.refresh,
  };
}

export type Library = ReturnType<typeof useLibrary>;

const state = (b: Item, lib: Library) => audioState(b, lib.audio, lib.queued, hm);
export const playable = (b: Item, lib: Library) => state(b, lib).playable;

/** the books a scope holds in a mode: listening keeps only what plays */
export const shelfBooks = (scope: string, lib: Library, mode: Mode) => {
  const all = select(scope, lib.items, lib.audio);
  return mode === 'listen' ? all.filter((b) => playable(b, lib)) : all;
};

const STATUS: [string, string][] = [
  ['ONGOING', 'reading'],
  ['TBR', 'to read'],
  ['READ', 'read'],
  ['DNF', 'dnf'],
];

/** the line under a tile in the library: status, then whether it has audio (or its fandom) */
export function readLine(b: Item, lib: Library) {
  const st = STATUS.find(([w]) => b.workflow.includes(w))?.[1];
  const extra = b.lib === 'fanfic' ? (b.fandom ?? 'fanfic') : playable(b, lib) ? 'has audio' : null;
  return [b.review?.length ? 'under review' : null, st, extra].filter(Boolean).join(' · ');
}

export const openItem = (b: Item) => openBook(b.id, b.lib);

export function pressBook(b: Item, lib: Library, mode: Mode) {
  if (mode === 'listen' && playable(b, lib)) openAudiobook(b.id);
  else openItem(b);
}

const any = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** reading: a random book's page (read, or listen when it has audio); listening: plays a random book with audio */
export function pickRandom(scope: string, lib: Library, mode: Mode) {
  const pool = shelfBooks(scope, lib, mode);
  if (!pool.length) return Alert.alert('nothing here', `${title(scope)} has no ${mode === 'listen' ? 'books with audio' : 'books'}.`);
  const b = any(pool.filter((x) => !hasStatus(x, 'read')).length ? pool.filter((x) => !hasStatus(x, 'read')) : pool);
  if (mode === 'listen') listen(b.id);
  else openItem(b);
}

export function RandomButton({ scope, lib, mode, label }: { scope: string; lib: Library; mode: Mode; label?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => pickRandom(scope, lib, mode)}
      style={({ pressed }) => ({ height: 44, borderRadius: 22, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <Icon name="shuffle" size={18} color={c.onAccent} />
      <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: c.onAccent }}>{label ?? (mode === 'listen' ? 'play something random' : 'read something random')}</Text>
    </Pressable>
  );
}

export function BookTile({ b, lib, width, mode }: { b: Item; lib: Library; width: number; mode: Mode }) {
  const u = useUi();
  const { c } = useTheme();
  const line = mode === 'listen' ? state(b, lib).line : readLine(b, lib);
  return (
    <Pressable onPress={() => pressBook(b, lib, mode)} onLongPress={() => openItem(b)} style={({ pressed }) => ({ width, gap: 5, opacity: pressed ? 0.7 : 1 })}>
      <Cover id={b.id} lib={b.lib} title={b.title} author={authors(b.authors)} hasCover={b.has_cover} width={width} height={Math.round(width * 1.5)} radius={5} />
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), lineHeight: fs(15), color: c.text }} numberOfLines={2}>
        {b.title}
      </Text>
      <Text style={u.muted} numberOfLines={1}>
        {authors(b.authors)}
      </Text>
      {line ? (
        <Text style={[u.muted, { fontSize: fs(10.5), color: mode === 'listen' ? c.accent : c.muted }]} numberOfLines={2}>
          {line}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ShelfLink({ label, sub, n, onPress }: { label: string; sub?: string | null; n?: number; onPress: () => void }) {
  const u = useUi();
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [u.row, u.line, { gap: 12, paddingVertical: 11, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{label}</Text>
        {sub ? (
          <Text style={u.muted} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {n != null ? <Text style={u.muted}>{n}</Text> : null}
      <Icon name="next" size={16} color={c.muted} />
    </Pressable>
  );
}

export const openShelf = (scope: string, mode: Mode = 'read') => router.push({ pathname: '/shelf/[scope]', params: { scope, mode } });
