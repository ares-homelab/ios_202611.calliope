import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { api } from '../api';
import { useAudiobooks, useAudioQueue, useBooks, useFanficBooks, useLists, useSections } from '../data';
import { authors, hm } from '../format';
import { listen } from '../play';
import { audioState, fromBook, fromFanfic, select, title, tree, type Item } from '../shelves';
import { F, fs, useTheme } from '../theme';
import { openAudiobook, openBook } from './bits';
import { Icon } from './icon';
import { Cover, useUi } from './ui';

/** both libraries, the shelves tree, and what has audio or is queued */
export function useLibrary() {
  const books = useBooks();
  const fanfic = useFanficBooks();
  const sections = useSections();
  const lists = useLists();
  const audiobooks = useAudiobooks();
  const queue = useAudioQueue();
  const items = useMemo(() => [...(books.data ?? []).map(fromBook), ...(fanfic.data ?? []).map(fromFanfic)], [books.data, fanfic.data]);
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

async function queueTonight(b: Item, lib: Library) {
  try {
    const r = await api.queueBook(b.id);
    lib.refreshQueue();
    Alert.alert('ticked for tonight', `${b.title}: number ${r.position} of ${r.of}. kokoro runs 01:00–07:00.`);
  } catch (e) {
    Alert.alert("can't reach ares", (e as Error).message);
  }
}

function offer(b: Item, lib: Library, reroll?: () => void, scope?: string) {
  const s = state(b, lib);
  const head = scope ? `nothing in ${scope} has audio yet. ` : '';
  const info = b.lib === 'calliope' ? [{ text: 'book info', onPress: () => openBook(b.id) }] : [];
  const tick = b.lib === 'calliope' && !lib.queued.get(b.id) ? [{ text: 'queue for tonight', onPress: () => queueTonight(b, lib) }] : [];
  const again = reroll ? [{ text: 'another one', onPress: reroll }] : [];
  Alert.alert(b.title, `${head}${authors(b.authors)}\n${s.line}`, [...tick, ...again, ...info, { text: 'close', style: 'cancel' }]);
}

export function pressBook(b: Item, lib: Library) {
  if (state(b, lib).playable) openAudiobook(b.id);
  else offer(b, lib);
}

export function longPressBook(b: Item, lib: Library) {
  if (b.lib === 'calliope') openBook(b.id);
  else offer(b, lib);
}

const any = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** plays a random book with audio from the scope; with none, offers to queue one or roll again */
export function playRandom(scope: string, lib: Library) {
  const pool = select(scope, lib.items, lib.audio);
  if (!pool.length) return Alert.alert('nothing here', `${title(scope)} has no books.`);
  const playable = pool.filter((b) => state(b, lib).playable);
  if (playable.length) return listen(any(playable).id);
  const roll = () => offer(any(pool), lib, pool.length > 1 ? roll : undefined, title(scope));
  roll();
}

export function RandomButton({ scope, lib, label = 'play something random' }: { scope: string; lib: Library; label?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => playRandom(scope, lib)}
      style={({ pressed }) => ({ height: 44, borderRadius: 22, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <Icon name="shuffle" size={18} color={c.onAccent} />
      <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: c.onAccent }}>{label}</Text>
    </Pressable>
  );
}

export function BookTile({ b, lib, width }: { b: Item; lib: Library; width: number }) {
  const u = useUi();
  const { c } = useTheme();
  const s = state(b, lib);
  return (
    <Pressable onPress={() => pressBook(b, lib)} onLongPress={() => longPressBook(b, lib)} style={({ pressed }) => ({ width, gap: 5, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ opacity: s.playable ? 1 : 0.45 }}>
        <Cover id={b.id} lib={b.lib} title={b.title} author={authors(b.authors)} hasCover={b.has_cover} width={width} height={Math.round(width * 1.5)} radius={5} />
      </View>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), lineHeight: fs(15), color: s.playable ? c.text : c.muted }} numberOfLines={2}>
        {b.title}
      </Text>
      <Text style={u.muted} numberOfLines={1}>
        {authors(b.authors)}
      </Text>
      <Text style={[u.muted, { fontSize: fs(10.5), color: s.playable ? c.accent : c.muted }]} numberOfLines={2}>
        {s.line}
      </Text>
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

export const openShelf = (scope: string) => router.push({ pathname: '/shelf/[scope]', params: { scope } });

export const playableCount = (items: Item[], lib: Library) => items.filter((b) => state(b, lib).playable).length;
