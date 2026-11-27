import { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { lrclib, nd } from '../navidrome';
import { seek, usePlayer, type Track } from '../player';
import { useResource } from '../store';
import { F, fs, getPrefs } from '../theme';
import type { Tint } from './reader';

/** the song's lyrics where the cover sits: synced lines light up, tap one to seek, auto-scroll pauses while you scroll */
export function LyricsView({ t, k }: { t: Track; k: Tint }) {
  const s = usePlayer();
  const song = t.song;
  const res = useResource(`lyrics/${song?.id ?? 'none'}`, async () => (song ? ((await nd.lyrics(song.id)) ?? (getPrefs().lrclib ? await lrclib(song) : null)) : null));
  const l = res.data;
  const ms = s.time * 1000;
  const cur = l?.synced ? l.lines.reduce((a, x, i) => ((x.start ?? 0) <= ms + 300 ? i : a), -1) : -1;
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<number[]>([]);
  const follow = useRef(true);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const at = useRef(cur);
  const toLine = (i: number) => {
    if (i >= 0 && ys.current[i] != null) scroll.current?.scrollTo({ y: Math.max(0, ys.current[i] - 90), animated: true });
  };
  useEffect(() => {
    at.current = cur;
    if (follow.current) toLine(cur);
  }, [cur]);
  useEffect(() => {
    ys.current = [];
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [song?.id]);
  useEffect(() => () => {
    if (resume.current) clearTimeout(resume.current);
  }, []);
  const hold = () => {
    follow.current = false;
    if (resume.current) clearTimeout(resume.current);
  };
  const release = () => {
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => {
      follow.current = true;
      toLine(at.current);
    }, 3000);
  };
  if (!l)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.sans, fontSize: fs(15), color: k.muted, textAlign: 'center' }}>{res.loading ? 'looking for lyrics…' : 'no lyrics in the tags or on LRCLIB.'}</Text>
      </View>
    );
  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 24, paddingBottom: 200, gap: 14 }}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={hold}
      onMomentumScrollBegin={hold}
      onScrollEndDrag={release}
      onMomentumScrollEnd={release}
    >
      {l.lines.map((x, i) => (
        <Text
          key={i}
          accessibilityRole={x.start != null ? 'button' : 'text'}
          onLayout={(e) => (ys.current[i] = e.nativeEvent.layout.y)}
          onPress={
            x.start != null
              ? () => {
                  follow.current = true;
                  seek(x.start! / 1000);
                }
              : undefined
          }
          style={{ fontFamily: F.black, fontSize: fs(26), lineHeight: fs(32), color: !l.synced || i === cur ? k.text : k.muted, opacity: l.synced && i !== cur ? (i < cur ? 0.55 : 0.8) : 1 }}
        >
          {x.value || '♪'}
        </Text>
      ))}
    </ScrollView>
  );
}
