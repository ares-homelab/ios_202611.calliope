import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, authHeaders, type Para } from '../api';
import { Art, swatch } from '../components/art';
import { mmss, pickSleep, RateButton, Scrubber, SleepButton } from '../components/controls';
import { Icon, type IconName } from '../components/icon';
import { Cover } from '../components/ui';
import { download } from '../downloads';
import { nd } from '../navidrome';
import { current, getVolume, next, prev, seek, setSmart, setVolume, skip, toggle, usePlayer, type Track } from '../player';
import { atTime, useBookText } from '../booktext';
import { F, fs, mix, useTheme } from '../theme';

const Btn = ({ name, label, onPress, color, size = 24, big }: { name: IconName; label: string; onPress: () => void; color: string; size?: number; big?: string }) => (
  <Pressable
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
  const base = swatch(seed);
  return scheme === 'dark'
    ? { bg: mix(base, '#000000', 0.72), page: mix(base, '#000000', 0.55), ink: '#F3ECE8', past: mix('#F3ECE8', base, 0.45), mark: mix(base, '#000000', 0.25), text: '#FFFFFF', muted: mix('#FFFFFF', base, 0.35), track: mix(base, '#000000', 0.4), chip: mix(base, '#000000', 0.45) }
    : { bg: mix(base, '#FFFFFF', 0.82), page: '#FBF8F4', ink: '#211A16', past: mix('#211A16', '#FFFFFF', 0.45), mark: mix(base, '#FFFFFF', 0.7), text: '#160F0C', muted: mix('#160F0C', base, 0.4), track: mix(base, '#FFFFFF', 0.6), chip: mix(base, '#FFFFFF', 0.65) };
}

function BookPlayer({ t }: { t: Track }) {
  const s = usePlayer();
  const inset = useSafeAreaInsets();
  const k = useTint(String(t.bookId));
  const text = useBookText(t);
  const [size, setSize] = useState(18);
  const paras = useMemo(() => text.data?.paras ?? [], [text.data]);
  const groups = useMemo(() => {
    const g: Para[][] = [];
    paras.forEach((x) => (g[g.length - 1]?.[0]?.p === x.p ? g[g.length - 1].push(x) : g.push([x])));
    return g;
  }, [paras]);
  const cur = atTime(paras, s.time);
  const curGroup = cur >= 0 ? groups.findIndex((g) => g.includes(paras[cur])) : 0;
  const list = useRef<FlatList<Para[]>>(null);
  const follow = useRef(true);
  useEffect(() => {
    if (follow.current && curGroup >= 0 && groups.length) list.current?.scrollToIndex({ index: curGroup, viewPosition: 0.25, animated: true });
  }, [curGroup, groups.length]);
  const more = () =>
    Alert.alert(t.album ?? '', undefined, [
      { text: 'sleep timer', onPress: () => pickSleep(true) },
      { text: 'note on this sentence', onPress: () => router.push('/readalong') },
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
        <Pressable accessibilityLabel="text size" onPress={() => setSize(size >= 22 ? 16 : size + 2)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.sans, fontSize: 17, color: k.text }}>Aa</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, marginHorizontal: 14, borderRadius: 18, backgroundColor: k.page, overflow: 'hidden' }}>
        {groups.length ? (
          <FlatList
            ref={list}
            data={groups}
            keyExtractor={(g) => String(g[0].p)}
            contentContainerStyle={{ padding: 14, paddingBottom: 200 }}
            onScrollBeginDrag={() => (follow.current = false)}
            onMomentumScrollEnd={() => setTimeout(() => (follow.current = true), 8000)}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => (
              <Text style={{ fontFamily: F.sans, fontSize: size, lineHeight: size * 1.4, color: k.ink, marginBottom: size * 0.6 }}>
                {item.map((x) => {
                  const i = paras.indexOf(x);
                  return (
                    <Text
                      key={i}
                      onPress={() => seek(x.start)}
                      style={i === cur ? { backgroundColor: k.mark, color: k.text } : i < cur ? { color: k.past } : undefined}
                    >
                      {x.text}{' '}
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
        <Scrubber value={s.duration ? s.time / s.duration : 0} onSeek={(x) => seek(x * s.duration)} color={k.text} track={k.track} height={4} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 }}>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted }}>{mmss(s.time)}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted }}>-{mmss(s.duration - s.time)}</Text>
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
  const more = () =>
    Alert.alert(t.title, t.artist, [
      ...(t.song?.albumId ? [{ text: 'go to album', onPress: () => (router.back(), router.push({ pathname: '/album/[id]', params: { id: t.song!.albumId! } })) }] : []),
      ...(t.song?.artistId ? [{ text: 'go to artist', onPress: () => (router.back(), router.push({ pathname: '/artist/[id]', params: { id: t.song!.artistId! } })) }] : []),
      { text: 'download', onPress: () => download(t.key, nd.downloadUrl(t.song!.id), t.song?.suffix ?? 'mp3', `song:${t.song!.id}`, t.title).catch(() => {}) },
      { text: 'cancel', style: 'cancel' as const },
    ]);
  const vol = getVolume();
  return (
    <View style={{ flex: 1, backgroundColor: k.bg, paddingHorizontal: 28, paddingTop: 10, paddingBottom: inset.bottom + 10, gap: 20 }}>
      <Pressable onPress={() => router.back()} accessibilityLabel="close" style={{ alignItems: 'center', paddingVertical: 6 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: k.track }} />
      </Pressable>
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Art id={t.song?.coverArt} seed={t.song?.albumId ?? t.key} size={340} radius={14} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: fs(22), color: k.text }}>
            {t.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(18), color: k.muted }}>
            {t.artist}
          </Text>
        </View>
        <Pressable accessibilityLabel={fav ? 'remove from favorites' : 'favorite'} onPress={star} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={18} color={fav ? c.accent : k.text} filled={fav} />
        </Pressable>
        <Pressable accessibilityLabel="more" onPress={more} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" size={18} color={k.text} />
        </Pressable>
      </View>
      <View>
        <Scrubber value={s.duration ? s.time / s.duration : 0} onSeek={(x) => seek(x * s.duration)} color={k.text} track={k.track} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 }}>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted }}>{mmss(s.time)}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: k.muted }}>-{mmss(s.duration - s.time)}</Text>
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
          <Scrubber value={vol} onSeek={setVolume} color={k.muted} track={k.track} />
        </View>
        <Icon name="volHigh" size={16} color={k.muted} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Btn name="lyrics" label="lyrics" onPress={() => router.push('/lyrics')} color={k.muted} size={22} />
        <Pressable accessibilityLabel={s.smart ? 'smart shuffle on' : 'smart shuffle off'} onPress={() => setSmart(!s.smart)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 44 }}>
          <Icon name="sparkle" size={22} color={s.smart ? c.accent : k.muted} />
          <Text style={{ fontFamily: F.heavy, fontSize: 13, color: s.smart ? c.accent : k.muted }}>smart shuffle</Text>
        </Pressable>
        <SleepButton sleep={s.sleep} book={false} color={k.muted} active={c.accent} />
        <Btn name="list" label="queue" onPress={() => router.push('/queue')} color={k.muted} size={22} />
      </View>
    </View>
  );
}

export default function PlayerScreen() {
  const s = usePlayer();
  const t = current(s);
  const { c } = useTheme();
  if (!t) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return t.kind === 'book' ? <BookPlayer t={t} /> : <MusicPlayer t={t} />;
}
