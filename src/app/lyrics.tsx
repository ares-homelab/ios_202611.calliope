import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../components/icon';
import { lrclib, nd } from '../navidrome';
import { current, seek, usePlayer } from '../player';
import { useResource } from '../store';
import { F, fs, getPrefs, useTheme } from '../theme';

export default function Lyrics() {
  const { c } = useTheme();
  const s = usePlayer();
  const t = current(s);
  const song = t?.song;
  const res = useResource(`lyrics/${song?.id ?? 'none'}`, async () => (song ? ((await nd.lyrics(song.id)) ?? (getPrefs().lrclib ? await lrclib(song) : null)) : null));
  const l = res.data;
  const ms = s.time * 1000;
  const cur = l?.synced ? l.lines.reduce((a, x, i) => ((x.start ?? 0) <= ms + 300 ? i : a), -1) : -1;
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<number[]>([]);
  useEffect(() => {
    if (cur >= 0 && ys.current[cur] != null) scroll.current?.scrollTo({ y: Math.max(0, ys.current[cur] - 160), animated: true });
  }, [cur]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="close" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="down" size={22} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>
            {t?.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(13), color: c.muted }}>
            {t?.artist}
          </Text>
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 24, paddingBottom: 300, gap: 14 }}>
        {l ? (
          l.lines.map((x, i) => (
            <Text
              key={i}
              onLayout={(e) => (ys.current[i] = e.nativeEvent.layout.y)}
              onPress={x.start != null ? () => seek(x.start! / 1000) : undefined}
              style={{ fontFamily: F.black, fontSize: fs(24), lineHeight: fs(30), color: !l.synced || i === cur ? c.text : i < cur ? c.muted : c.track }}
            >
              {x.value || '♪'}
            </Text>
          ))
        ) : (
          <Text style={{ fontFamily: F.sans, fontSize: fs(15), color: c.muted }}>{res.loading ? 'looking for lyrics…' : 'no lyrics in the tags or on LRCLIB.'}</Text>
        )}
      </ScrollView>
    </View>
  );
}
