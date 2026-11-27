import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Share, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, authHeaders, type Para } from '../api';
import { Art, swatch } from '../components/art';
import { mmss, ModeBadges, pickSleep, RateButton, Scrubber, sleepLabel, SleepButton } from '../components/controls';
import { Icon, type IconName } from '../components/icon';
import { LyricsView } from '../components/lyrics';
import { Sheet, type SheetItem } from '../components/sheet';
import { Cover } from '../components/ui';
import { usePlaylists } from '../data';
import { download, removeKeys, useDownloads } from '../downloads';
import { nd } from '../navidrome';
import { addLast, addNext, current, getPlayer, getVolume, next, pause, prev, seek, setVolume, skip, songTrack, toggle, usePlayer, type Track } from '../player';
import { refreshKeys } from '../store';
import { atTime, useBookText } from '../booktext';
import { readAt } from '../read';
import { F, fs, LINE, usePrefs, useTheme } from '../theme';
import { ReaderPanel, Runs, tint, useReaderTint } from '../components/reader';

async function readFromHere(t: Track) {
  try {
    const at = await api.audioToRead(t.bookId!, t.n!, getPlayer().time);
    pause();
    readAt('calliope', t.bookId!, { doc: at.doc, block: at.block });
  } catch (e) {
    Alert.alert("can't open the book here", (e as Error).message);
  }
}

const Btn = ({ name, label, onPress, color, size = 24, big }: { name: IconName; label: string; onPress: () => void; color: string; size?: number; big?: string }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    hitSlop={6}
    style={({ pressed }) => ({ width: big ? 64 : 44, height: big ? 64 : 44, borderRadius: 32, backgroundColor: big, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
  >
    <Icon name={name} size={size} color={color} />
  </Pressable>
);

function useTint(seed: string) {
  const { scheme } = useTheme();
  return tint(swatch(seed), scheme);
}

function BookPlayer({ t }: { t: Track }) {
  const s = usePlayer();
  const inset = useSafeAreaInsets();
  const k = useReaderTint(String(t.bookId));
  const reader = usePrefs().reader;
  const size = reader.size;
  const line = size * LINE[reader.spacing];
  const [panel, setPanel] = useState(false);
  const text = useBookText(t);
  const paras = useMemo(() => text.data?.paras ?? [], [text.data]);
  const layouts = useRef(new WeakMap<Para[], { y: number; h: number }>());
  const groups = useMemo(() => {
    const g: Para[][] = [];
    paras.forEach((x) => (g[g.length - 1]?.[0]?.p === x.p ? g[g.length - 1].push(x) : g.push([x])));
    return g;
  }, [paras]);
  const cur = atTime(paras, s.time);
  const curGroup = cur >= 0 ? groups.findIndex((g) => g.includes(paras[cur])) : 0;
  const list = useRef<FlatList<Para[]>>(null);
  const follow = useRef(true);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragged = useRef(false);
  const view = useRef({ y: 0, h: 0 });
  const target = useRef({ group: curGroup, cur });
  useEffect(() => {
    target.current = { group: curGroup, cur };
  }, [curGroup, cur]);

  const sync = useCallback(
    (force = false) => {
      const { group, cur: i } = target.current;
      if (!follow.current || group < 0 || !groups.length) return;
      const box = layouts.current.get(groups[group]);
      if (!box) return list.current?.scrollToIndex({ index: group, viewPosition: 0.25, animated: true });
      const g = groups[group];
      const total = g.reduce((n, x) => n + x.text.length + 1, 0) || 1;
      const before = g.slice(0, Math.max(0, g.indexOf(paras[i]))).reduce((n, x) => n + x.text.length + 1, 0);
      const y = box.y + (box.h * before) / total;
      const { y: top, h } = view.current;
      if (!force && y > top + h * 0.12 && y < top + h * 0.6) return;
      list.current?.scrollToOffset({ offset: Math.max(0, y - h * 0.25), animated: true });
    },
    [groups, paras],
  );
  useEffect(() => sync(), [cur, curGroup, sync]);
  useEffect(() => {
    const id = setTimeout(() => sync(true), 120);
    return () => clearTimeout(id);
  }, [size, line, sync]);
  useEffect(() => () => {
    if (resume.current) clearTimeout(resume.current);
  }, []);
  const hold = () => {
    if (!dragged.current) return;
    follow.current = false;
    if (resume.current) clearTimeout(resume.current);
  };
  const release = () => {
    if (!dragged.current) return;
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => {
      dragged.current = false;
      follow.current = true;
      sync(true);
    }, 3000);
  };
  const Cell = useMemo(
    () =>
      function Cell({ index, onLayout, ...rest }: ViewProps & { index: number }) {
        return (
          <View
            {...rest}
            onLayout={(e) => {
              onLayout?.(e);
              layouts.current.set(groups[index], { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height });
            }}
          />
        );
      },
    [groups],
  );
  const jump = (x: Para) => {
    if (resume.current) clearTimeout(resume.current);
    dragged.current = false;
    follow.current = true;
    seek(x.start);
  };
  const more = () =>
    Alert.alert(t.album ?? '', undefined, [
      { text: 'sleep timer', onPress: () => pickSleep(true) },
      { text: 'note on this sentence', onPress: () => router.push('/readalong') },
      { text: 'read from here', onPress: () => readFromHere(t) },
      { text: 'chapters', onPress: () => (router.back(), router.push({ pathname: '/audiobook/[id]', params: { id: String(t.bookId) } })) },
      { text: 'download this chapter', onPress: () => download(t.key, api.trackUrl(t.bookId!, t.n!), t.ext ?? 'mp3', String(t.bookId), t.album ?? '', authHeaders()).catch(() => {}) },
      { text: 'cancel', style: 'cancel' },
    ]);
  return (
    <View style={{ flex: 1, backgroundColor: k.bg, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Btn name="down" label="close" onPress={() => router.back()} color={k.text} />
        <Cover id={t.bookId} title={t.album ?? ''} width={34} height={50} radius={4} plain />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: fs(14), color: k.text }}>
            {t.album}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(12), color: k.muted }}>
            {t.title} · {t.artist}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="read from here" onPress={() => readFromHere(t)} hitSlop={2} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="book" size={21} color={k.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="reading settings" accessibilityState={{ expanded: panel }} onPress={() => setPanel(!panel)} hitSlop={2} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: panel ? k.chip : undefined }}>
          <Text style={{ fontFamily: F.sans, fontSize: 17, color: k.text }}>Aa</Text>
        </Pressable>
      </View>
      {panel ? <ReaderPanel k={k} /> : null}
      <View style={{ flex: 1, marginHorizontal: 14, borderRadius: 18, backgroundColor: k.page, overflow: 'hidden' }}>
        {groups.length ? (
          <FlatList
            ref={list}
            data={groups}
            keyExtractor={(g) => String(g[0].p)}
            contentContainerStyle={{ padding: 14, paddingBottom: 200 }}
            extraData={`${cur}:${size}:${line}:${k.ink}`}
            scrollEventThrottle={100}
            onLayout={(e) => (view.current.h = e.nativeEvent.layout.height)}
            onScroll={(e) => (view.current.y = e.nativeEvent.contentOffset.y)}
            CellRendererComponent={Cell}
            onScrollBeginDrag={() => {
              dragged.current = true;
              hold();
            }}
            onMomentumScrollBegin={hold}
            onScrollEndDrag={release}
            onMomentumScrollEnd={release}
            onScrollToIndexFailed={(e) => {
              list.current?.scrollToOffset({ offset: e.averageItemLength * e.index, animated: false });
              setTimeout(() => sync(true), 80);
            }}
            renderItem={({ item }) => (
              <Text style={{ fontFamily: F.sans, fontSize: size, lineHeight: line, color: k.ink, marginBottom: size * 0.6 }}
              >
                {item.map((x) => {
                  const i = paras.indexOf(x);
                  return (
                    <Text
                      key={i}
                      onPress={() => jump(x)}
                      style={i === cur ? { backgroundColor: k.mark, color: k.text } : i < cur ? { color: k.past } : undefined}
                    >
                      {x.r?.length ? <Runs r={x.r} base={F.sans} size={size} k={k} /> : x.text}{' '}
                    </Text>
                  );
                })}
              </Text>
            )}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: k.muted, textAlign: 'center' }}>{text.loading ? 'loading the text…' : text.error ? "the text isn't reachable right now; the audio plays on." : 'no text for this chapter.'}</Text>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: inset.bottom + 10, gap: 4 }}>
        <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted }}>
          {text.data?.exact === false ? 'text matched roughly to this recording · ' : ''}kindle follows as you listen
        </Text>
        <Scrubber value={s.duration ? s.time / s.duration : 0} onSeek={(x) => seek(x * s.duration)} color={k.text} track={k.track} height={4} label="position" valueText={`${mmss(s.time)} of ${mmss(s.duration)}`} step={s.duration ? 30 / s.duration : 0.05} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 }}>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted, fontVariant: ['tabular-nums'] }}>{mmss(s.time)}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted, fontVariant: ['tabular-nums'] }}>-{mmss(s.duration - s.time)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <RateButton rate={s.rate} color={k.muted} />
          <Btn name="back30" label="back 30 seconds" onPress={() => skip(-30)} color={k.text} size={28} />
          <Btn name={s.playing ? 'pause' : 'play'} label={s.playing ? 'pause' : 'play'} onPress={toggle} color={k.bg} size={28} big={k.text} />
          <Btn name="fwd30" label="forward 30 seconds" onPress={() => skip(30)} color={k.text} size={28} />
          <Btn name="more" label="more: sleep, note, chapters, download" onPress={more} color={k.muted} />
        </View>
        {s.sleep ? (
          <View style={{ alignItems: 'center' }}>
            <SleepButton sleep={s.sleep} book color={k.muted} active={k.text} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MusicPlayer({ t }: { t: Track }) {
  const { c } = useTheme();
  const s = usePlayer();
  const inset = useSafeAreaInsets();
  const k = useTint(t.song?.albumId ?? t.key);
  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const fav = favs[t.key] ?? !!t.song?.starred;
  const star = () => {
    setFavs({ ...favs, [t.key]: !fav });
    nd.star(t.song!.id, !fav).catch(() => setFavs({ ...favs, [t.key]: fav }));
  };
  const [menu, setMenu] = useState<'main' | 'playlists' | null>(null);
  const [lyrics, setLyrics] = useState(false);
  const vol = getVolume();
  return (
    <View style={{ flex: 1, backgroundColor: k.bg, paddingHorizontal: 28, paddingTop: 10, paddingBottom: inset.bottom + 10, gap: 20 }}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} accessibilityLabel="close" hitSlop={{ top: 12, bottom: 12 }} style={{ alignItems: 'center', paddingVertical: 6 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: k.track }} />
      </Pressable>
      {lyrics ? (
        <LyricsView t={t} k={k} />
      ) : (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <Art id={t.song?.coverArt} seed={t.song?.albumId ?? t.key} size={340} radius={14} />
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: lyrics ? 12 : 8 }}>
        {lyrics ? <Art id={t.song?.coverArt} seed={t.song?.albumId ?? t.key} size={52} radius={6} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: fs(22), color: k.text }}>
            {t.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(18), color: k.muted }}>
            {t.artist}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={fav ? 'remove from favorites' : 'favorite'} onPress={star} hitSlop={4} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={18} color={fav ? c.accent : k.text} filled={fav} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="more options" onPress={() => setMenu('main')} hitSlop={4} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" size={18} color={k.text} />
        </Pressable>
      </View>
      <View>
        <Scrubber value={s.duration ? s.time / s.duration : 0} onSeek={(x) => seek(x * s.duration)} color={k.text} track={k.track} label="position" valueText={`${mmss(s.time)} of ${mmss(s.duration)}`} step={s.duration ? 10 / s.duration : 0.05} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 }}>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted, fontVariant: ['tabular-nums'] }}>{mmss(s.time)}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted, fontVariant: ['tabular-nums'] }}>-{mmss(s.duration - s.time)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
        <Btn name="prev" label="previous" onPress={prev} color={k.text} size={32} />
        <Btn name={s.playing ? 'pause' : 'play'} label={s.playing ? 'pause' : 'play'} onPress={toggle} color={k.text} size={46} />
        <Btn name="skip" label="next" onPress={() => next()} color={k.text} size={32} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="volLow" size={16} color={k.muted} />
        <View style={{ flex: 1 }}>
          <Scrubber value={vol} onSeek={setVolume} color={k.muted} track={k.track} label="volume" step={0.1} />
        </View>
        <Icon name="volHigh" size={16} color={k.muted} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="lyrics"
          accessibilityState={{ selected: lyrics }}
          onPress={() => setLyrics(!lyrics)}
          hitSlop={6}
          style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: lyrics ? k.text : undefined, opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name="lyrics" size={22} color={lyrics ? k.bg : k.muted} />
        </Pressable>
        <ModeBadges color={k.text} onPress={() => router.push('/queue')} />
        <Btn name="list" label="queue, shuffle and repeat" onPress={() => router.push('/queue')} color={k.muted} size={22} />
      </View>
      <SongMenu t={t} fav={fav} star={star} menu={menu} setMenu={setMenu} />
    </View>
  );
}

function SongMenu({ t, fav, star, menu, setMenu }: { t: Track; fav: boolean; star: () => void; menu: 'main' | 'playlists' | null; setMenu: (m: 'main' | 'playlists' | null) => void }) {
  const { c } = useTheme();
  const s = usePlayer();
  const dl = useDownloads();
  const lists = usePlaylists();
  const song = t.song!;
  const go = (pathname: '/album/[id]' | '/artist/[id]', id: string) => (router.back(), router.push({ pathname, params: { id } }));
  const addTo = (id: string, name: string) =>
    nd
      .addToPlaylist(id, song.id)
      .then(() => refreshKeys('nd/playlists', `nd/playlist/${id}`))
      .catch((e) => Alert.alert(`couldn't add to ${name}`, (e as Error).message));
  const newList = () =>
    Alert.prompt('new playlist', `with ${t.title}`, (name) => {
      if (!name?.trim()) return;
      nd
        .createPlaylist(name.trim(), song.id)
        .then(() => refreshKeys('nd/playlists'))
        .catch((e) => Alert.alert("couldn't make the playlist", (e as Error).message));
    });
  const saved = !!dl.saved[t.key];
  const all: SheetItem[][] = [
    [
      { icon: 'heart', label: fav ? 'remove from favorites' : 'favorite', on: fav, onPress: star },
      { icon: 'plus', label: 'add to a playlist', onPress: () => setMenu('playlists') },
    ],
    [
      { icon: 'playNext', label: 'play next', onPress: () => addNext([songTrack(song)]) },
      { icon: 'playLast', label: 'play last', onPress: () => addLast([songTrack(song)]) },
    ],
    [
      ...(song.albumId ? [{ icon: 'album' as const, label: 'go to album', onPress: () => go('/album/[id]', song.albumId!) }] : []),
      ...(song.artistId ? [{ icon: 'artist' as const, label: 'go to artist', onPress: () => go('/artist/[id]', song.artistId!) }] : []),
    ],
    [
      saved
        ? { icon: 'downloaded', label: 'remove download', onPress: () => removeKeys([t.key]) }
        : { icon: 'download', label: dl.busy.has(t.key) ? 'downloading…' : 'download', onPress: () => download(t.key, nd.downloadUrl(song.id), song.suffix ?? 'mp3', `song:${song.id}`, t.title).catch(() => {}) },
      { icon: 'share', label: 'share', onPress: () => Share.share({ message: [t.title, t.artist, t.album].filter(Boolean).join(' · ') }).catch(() => {}) },
      { icon: 'moon', label: 'sleep timer', detail: sleepLabel(s.sleep) ?? 'off', on: !!s.sleep, onPress: () => pickSleep(false) },
    ],
  ];
  const groups = all.filter((g) => g.length);
  const head = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Art id={song.coverArt} seed={song.albumId ?? t.key} size={48} radius={6} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: fs(16), color: c.text }}>
          {menu === 'playlists' ? 'add to a playlist' : t.title}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(13), color: c.muted }}>
          {menu === 'playlists' ? t.title : [t.artist, t.album].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
  const playlists: SheetItem[] = [{ icon: 'plus', label: 'new playlist…', onPress: newList }, ...(lists.data ?? []).map((p) => ({ icon: 'list' as const, label: p.name, onPress: () => addTo(p.id, p.name) }))];
  return (
    <>
      <Sheet open={menu === 'main'} onClose={() => setMenu(null)} head={head} groups={groups} />
      <Sheet open={menu === 'playlists'} onClose={() => setMenu(null)} head={head} items={playlists} />
    </>
  );
}

export default function PlayerScreen() {
  const s = usePlayer();
  const t = current(s);
  const { c } = useTheme();
  if (!t) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return t.kind === 'book' ? <BookPlayer t={t} /> : <MusicPlayer t={t} />;
}
