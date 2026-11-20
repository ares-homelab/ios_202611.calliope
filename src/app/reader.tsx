import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, FlatList, Modal, Pressable, ScrollView, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, authHeaders, type Lib, type Note, type ReadBlock, type ReadInfo } from '../api';
import { Icon, type IconName } from '../components/icon';
import { PdfPages } from '../components/pdf';
import { NoteSheet, ReaderPanel, TextBlock, useReaderTint, type Tint } from '../components/reader';
import { ErrorBox } from '../components/ui';
import { useAudiobooks } from '../data';
import { useDownloads } from '../downloads';
import { readJson, writeJson } from '../files';
import { playBook } from '../play';
import { markOf, offlineBook, saveMark, sendMark, setOpenReader, type At, type Mark } from '../read';
import { useResource } from '../store';
import { F, fs, LINE, usePrefs } from '../theme';

type Item = { key: string; n: number; i: number; b?: ReadBlock; rule?: boolean };
type Win = { n: number; i: number; end: number };
type Got = { blocks: ReadBlock[]; notes?: Record<string, Note> | null };

const chapterFile = (lib: Lib, id: number, n: number) => `read/${lib}_${id}_${n}.json`;

async function loadChapter(info: ReadInfo, saved: ReadInfo | undefined, n: number): Promise<Got> {
  const own = (r?: ReadInfo) => r?.chapters.find((c) => c.n === n);
  const local = saved?.version === info.version ? own(saved) : undefined;
  if (local?.blocks) return { blocks: local.blocks, notes: local.notes };
  const name = chapterFile(info.lib, info.id, n);
  try {
    const ch = await api.readChapter(info.lib, info.id, n);
    writeJson(name, { v: info.version, blocks: ch.blocks ?? [], notes: ch.notes ?? null });
    return { blocks: ch.blocks ?? [], notes: ch.notes };
  } catch (e) {
    const cached = readJson<({ v: string } & Got) | null>(name, null) ?? (saved ? { v: '', blocks: own(saved)?.blocks ?? [], notes: own(saved)?.notes } : null);
    if (cached) return cached;
    throw e;
  }
}

/** the phone's spot or the kindle's, whichever is newer; a spot passed in (chapters, player) wins */
function startOf(info: ReadInfo, at: At): { n: number; i: number; page: number } {
  const first = info.chapters[0]?.n ?? 1;
  if (at.page) return { n: first, i: 0, page: at.page };
  if (at.doc) return { n: at.doc, i: at.block ?? 0, page: 1 };
  const local = markOf(info.lib, info.id);
  const ko = info.kosync;
  const koAt = ko?.updated ? Date.parse(ko.updated) : 0;
  if (local && (!ko?.spot || local.at >= koAt - 60000)) return { n: local.doc || first, i: local.block, page: local.page ?? 1 };
  if (ko?.spot) return { n: ko.spot.doc || first, i: ko.spot.block, page: ko.spot.page ?? 1 };
  return { n: first, i: 0, page: 1 };
}

const Btn = ({ name, label, onPress, k, on }: { name: IconName | 'Aa'; label: string; onPress: () => void; k: Tint; on?: boolean }) => (
  <Pressable accessibilityLabel={label} onPress={onPress} hitSlop={4} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? k.chip : undefined }}>
    {name === 'Aa' ? <Text style={{ fontFamily: F.sans, fontSize: 17, color: k.text }}>Aa</Text> : <Icon name={name} size={21} color={k.text} />}
  </Pressable>
);

export default function ReaderScreen() {
  const p = useLocalSearchParams<{ lib: Lib; id: string; doc?: string; block?: string; page?: string }>();
  const lib: Lib = p.lib === 'fanfic' ? 'fanfic' : 'calliope';
  const id = Number(p.id);
  const res = useResource(`read/${lib}/${id}`, () => api.readInfo(lib, id));
  const dl = useDownloads();
  const saved = useMemo(() => (dl.saved ? offlineBook(lib, id) : undefined), [dl.saved, lib, id]);
  const info = res.data ?? saved;
  const k = useReaderTint(`${lib === 'fanfic' ? 'f' : ''}${id}`);
  const inset = useSafeAreaInsets();
  const [jump, setJump] = useState<At>(() => ({ doc: p.doc ? Number(p.doc) : undefined, block: p.block ? Number(p.block) : undefined, page: p.page ? Number(p.page) : undefined }));
  const [gen, setGen] = useState(0);
  useEffect(() => {
    setOpenReader({ lib, id, jump: (at) => (setJump(at), setGen((g) => g + 1)) });
    return () => setOpenReader(null);
  }, [lib, id]);
  if (!info || (res.loading && !saved))
    return (
      <View style={{ flex: 1, backgroundColor: k.bg, paddingTop: inset.top + 6, paddingHorizontal: 12 }}>
        <Btn name="close" label="close" onPress={() => router.back()} k={k} />
        <View style={{ padding: 20 }}>{res.error ? <ErrorBox error={res.error} onRetry={res.refresh} /> : <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: k.muted }}>opening the book…</Text>}</View>
      </View>
    );
  if (!info.format)
    return (
      <View style={{ flex: 1, backgroundColor: k.bg, paddingTop: inset.top + 6, paddingHorizontal: 12 }}>
        <Btn name="close" label="close" onPress={() => router.back()} k={k} />
        <Text style={{ padding: 20, fontFamily: F.sans, fontSize: fs(15), color: k.text }}>this book has no epub or pdf to read.</Text>
      </View>
    );
  return <Book key={gen} info={info} saved={saved} k={k} at={jump} />;
}

function Book({ info, saved, k, at }: { info: ReadInfo; saved?: ReadInfo; k: Tint; at: At }) {
  const inset = useSafeAreaInsets();
  const reader = usePrefs().reader;
  const size = reader.size;
  const line = size * LINE[reader.spacing];
  const [panel, setPanel] = useState(false);
  const [sheet, setSheet] = useState(false);
  const audio = (useAudiobooks().data ?? []).some((a) => a.id === info.id) && info.lib === 'calliope';
  const start = useMemo(() => startOf(info, at), [info, at]);
  const [cur, setCur] = useState<Mark>(() => ({ lib: info.lib, id: info.id, title: info.title, doc: start.n, block: start.i, s: 0, page: start.page, at: Date.now() }));
  const curRef = useRef(cur);
  const moved = useRef(false);
  const timers = useRef<{ save?: ReturnType<typeof setTimeout>; send?: ReturnType<typeof setTimeout> }>({});

  const flush = useCallback(() => {
    if (!moved.current) return;
    clearTimeout(timers.current.save);
    clearTimeout(timers.current.send);
    saveMark(curRef.current);
    sendMark(curRef.current, info);
  }, [info]);
  const onMark = useCallback(
    (m: Omit<Mark, 'lib' | 'id' | 'title' | 'at'>) => {
      const next = { ...m, lib: info.lib, id: info.id, title: info.title, at: Date.now() };
      const c = curRef.current;
      if (c.doc === next.doc && c.block === next.block && c.page === next.page) return;
      moved.current = true;
      curRef.current = next;
      setCur(next);
      clearTimeout(timers.current.save);
      timers.current.save = setTimeout(() => saveMark(curRef.current), 1500);
      clearTimeout(timers.current.send);
      timers.current.send = setTimeout(() => sendMark(curRef.current, info), 8000);
    },
    [info],
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && flush());
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);

  const chapter = info.chapters.find((c) => c.n === cur.doc);
  const toListen = async () => {
    if (!cur.x) return;
    try {
      const a = await api.readToAudio(info.id, cur.x);
      flush();
      await playBook(info.id, a);
      router.push('/player');
    } catch (e) {
      Alert.alert("can't switch to listening", (e as Error).message);
    }
  };
  const share = info.format === 'pdf' ? (cur.page ?? 1) / Math.max(1, info.pages ?? 1) : cur.s;
  const [target, setTarget] = useState<At | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: k.bg }}>
      <View style={{ paddingTop: inset.top + 6, paddingHorizontal: 12, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Btn name="close" label="close" onPress={() => router.back()} k={k} />
        <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 6 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: fs(14), color: k.text }}>
            {info.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(12), color: k.muted }}>
            {info.format === 'pdf' ? `page ${cur.page ?? 1} of ${info.pages}` : (chapter?.title ?? '')}
          </Text>
        </View>
        {audio && info.format === 'epub' ? <Btn name="headphones" label="listen from here" onPress={toListen} k={k} /> : null}
        <Btn name="list" label="chapters" onPress={() => setSheet(true)} k={k} />
        {info.format === 'epub' ? <Btn name="Aa" label="reading settings" onPress={() => setPanel(!panel)} k={k} on={panel} /> : null}
      </View>
      {panel ? <ReaderPanel k={k} /> : null}
      {info.format === 'pdf' ? (
        <PdfPages key={target?.page ?? 0} info={info} k={k} start={target?.page ?? start.page} onPage={(page) => onMark({ doc: 0, block: 0, s: page / Math.max(1, info.pages ?? 1), page })} />
      ) : (
        <Flow key={target ? `${target.doc}-${target.block}` : 'start'} info={info} saved={saved} k={k} size={size} line={line} start={target?.doc ? { n: target.doc, i: target.block ?? 0 } : start} onMark={onMark} />
      )}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: inset.bottom + 4, gap: 4 }}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: k.track }}>
          <View style={{ width: `${Math.min(1, share) * 100}%`, height: 3, borderRadius: 2, backgroundColor: k.text }} />
        </View>
        <Text style={{ fontFamily: F.sans, fontSize: 11, color: k.muted, textAlign: 'center' }}>{Math.round(share * 100)}%</Text>
      </View>
      <Chapters
        visible={sheet}
        info={info}
        k={k}
        cur={cur}
        onClose={() => setSheet(false)}
        onPick={(t) => {
          setSheet(false);
          moved.current = true;
          setTarget(t);
        }}
      />
    </View>
  );
}

function Flow({ info, saved, k, size, line, start, onMark }: { info: ReadInfo; saved?: ReadInfo; k: Tint; size: number; line: number; start: { n: number; i: number }; onMark: (m: Omit<Mark, 'lib' | 'id' | 'title' | 'at'>) => void }) {
  const order = useMemo(() => info.chapters.map((c) => c.n), [info.chapters]);
  const [got, setGot] = useState<Record<number, Got>>({});
  const [note, setNote] = useState<Note | null>(null);
  const [win, setWin] = useState<Win>({ n: start.n, i: start.i, end: start.n });
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(new Set<number>());

  const fetch = useCallback(
    (n: number) => {
      if (got[n] || busy.current.has(n)) return Promise.resolve(got[n]);
      busy.current.add(n);
      return loadChapter(info, saved, n)
        .then((ch) => {
          setGot((g) => ({ ...g, [n]: ch }));
          setError(null);
          return ch;
        })
        .catch((e: Error) => {
          setError(e.message);
          return undefined;
        })
        .finally(() => busy.current.delete(n));
    },
    [got, info, saved],
  );
  useEffect(() => {
    fetch(start.n);
  }, [fetch, start.n]);

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const n of order.slice(order.indexOf(win.n), order.indexOf(win.end) + 1)) {
      const blocks = got[n]?.blocks;
      if (!blocks) break;
      if (out.length) out.push({ key: `r${n}`, n, i: -1, rule: true });
      blocks.forEach((b, i) => {
        if (n === win.n && i < win.i) return;
        out.push({ key: `${n}-${i}`, n, i, b });
      });
    }
    return out;
  }, [got, order, win]);

  const next = () => {
    const at = order.indexOf(win.end);
    if (at < 0 || at + 1 >= order.length || !got[win.end]) return;
    const n = order[at + 1];
    fetch(n).then((b) => b && setWin((w) => ({ ...w, end: n })));
  };
  const prev = () => {
    if (win.i > 0) return setWin((w) => ({ ...w, i: Math.max(0, w.i - 100) }));
    const at = order.indexOf(win.n);
    if (at <= 0) return;
    const n = order[at - 1];
    fetch(n).then((b) => b && setWin((w) => ({ ...w, n, i: Math.max(0, b.blocks.length - 100) })));
  };

  const seen = useRef(onMark);
  useEffect(() => {
    seen.current = onMark;
  });
  const [viewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
    const top = viewableItems.find((v) => v.item?.b && v.item.b.k !== 'img') ?? viewableItems.find((v) => v.item?.b);
    if (top?.item?.b) seen.current({ doc: top.item.n, block: top.item.i, x: top.item.b.x, s: top.item.b.s });
  });

  const image = (src?: string | null) => (src ? { uri: api.readImageUrl(info.lib, info.id, src), headers: authHeaders() } : undefined);
  if (!items.length)
    return (
      <View style={{ flex: 1, padding: 24 }}>
        {error ? (
          <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: k.muted }}>
            {"can't load this chapter: "}
            {error}. {saved ? '' : 'save the book for offline from its page to read it without ares.'}
          </Text>
        ) : (
          <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: k.muted }}>{got[start.n] ? 'this chapter has no text.' : 'loading…'}</Text>
        )}
        {got[start.n] && !got[start.n].blocks.length ? (
          <Pressable onPress={next} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: k.text }}>next chapter</Text>
          </Pressable>
        ) : null}
      </View>
    );
  const onNote = (n: number) => (key: string) => {
    const hit = got[n]?.notes?.[key];
    if (hit) setNote(hit);
  };
  return (
    <>
    <FlatList
      data={items}
      keyExtractor={(x) => x.key}
      style={{ flex: 1, marginHorizontal: 14, borderRadius: 18, backgroundColor: k.page }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 80 }}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      onStartReached={prev}
      onStartReachedThreshold={0.8}
      onEndReached={next}
      onEndReachedThreshold={2}
      onViewableItemsChanged={viewable}
      viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
      initialNumToRender={20}
      windowSize={15}
      ListHeaderComponent={win.i > 0 || order.indexOf(win.n) > 0 ? <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted, textAlign: 'center', paddingBottom: 14 }}>scroll up for earlier pages</Text> : null}
      ListFooterComponent={error ? <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted, paddingTop: 20 }}>{"can't load the next chapter: "}{error}</Text> : null}
      renderItem={({ item }) =>
        item.rule ? (
          <View style={{ height: 1, backgroundColor: k.mark, marginVertical: size * 1.5, marginHorizontal: 40 }} />
        ) : (
          <View style={{ paddingBottom: size * 0.7 }}>
            <TextBlock kind={item.b!.k} t={item.b!.t} r={item.b!.r} k={k} size={size} line={line} image={image(item.b!.src)} onNote={onNote(item.n)} />
          </View>
        )
      }
    />
    <NoteSheet note={note} k={k} size={size} line={line} onClose={() => setNote(null)} />
    </>
  );
}

function Chapters({ visible, info, k, cur, onClose, onPick }: { visible: boolean; info: ReadInfo; k: Tint; cur: Mark; onClose: () => void; onPick: (at: At) => void }) {
  const write = usePrefs().kosyncWrite;
  const entries: { title: string; at: At; level: number; on: boolean }[] =
    info.format === 'pdf'
      ? Array.from({ length: Math.ceil((info.pages ?? 0) / 10) }, (_, j) => ({ title: `page ${j * 10 + 1}`, at: { page: j * 10 + 1 }, level: 1, on: Math.floor(((cur.page ?? 1) - 1) / 10) === j }))
      : info.toc?.length
        ? info.toc.map((t) => ({ title: t.title, at: { doc: t.doc, block: t.block }, level: t.level, on: t.doc === cur.doc }))
        : info.chapters.filter((c) => c.words > 0).map((c) => ({ title: c.title ?? `part ${c.n}`, at: { doc: c.n, block: 0 }, level: 1, on: c.n === cur.doc }));
  const sync = !info.sync
    ? info.source === 'kindle'
      ? 'the kindle has no reading record for this book yet, so your place stays on this iphone.'
      : "ares doesn't have the kindle's copy of this book yet: the kindle's place is read when it can be, yours stays on this iphone."
    : write
      ? 'your place goes to the kindle through kosync; the kindle offers to jump there next time it opens the book.'
      : 'kindle sync is read only (account → kindle sync): the kindle’s place opens here, yours stays on this iphone.';
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: k.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }}>
          <Text style={{ flex: 1, fontFamily: F.heavy, fontSize: fs(18), color: k.text }}>{info.format === 'pdf' ? 'pages' : 'chapters'}</Text>
          <Btn name="close" label="close" onPress={onClose} k={k} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {entries.map((e, j) => (
            <Pressable key={j} onPress={() => onPick(e.at)} style={({ pressed }) => ({ paddingVertical: 12, paddingLeft: (e.level - 1) * 16, borderBottomWidth: 1, borderBottomColor: k.chip, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontFamily: e.on ? F.heavy : F.sans, fontSize: fs(15), color: e.on ? k.text : k.ink }}>{e.title}</Text>
            </Pressable>
          ))}
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17), color: k.muted, paddingTop: 16 }}>{sync}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
