import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Song } from '../navidrome';
import { playSongs } from '../play';
import type { Context } from '../player';
import { F, fs, useTheme } from '../theme';
import { Art } from './art';
import { Icon } from './icon';
import { SongRow, useGroupDownload } from './music';
import { BackBar, Empty, ErrorBox, Screen, useUi } from './ui';

export function Collection({
  ctx,
  title,
  sub,
  meta,
  art,
  hero,
  songs,
  numbered,
  loading,
  error,
  refresh,
  children,
  lines,
  sections,
}: {
  ctx: Context;
  title: string;
  sub?: string;
  meta?: string;
  art?: string;
  hero?: ReactNode;
  songs: Song[];
  numbered?: boolean;
  loading: boolean;
  error?: string;
  refresh: () => void;
  children?: ReactNode;
  lines?: Record<string, string | null | undefined>;
  sections?: { title: string; sub?: string; ids: string[] }[];
}) {
  const u = useUi();
  const { c } = useTheme();
  const dl = useGroupDownload(`${ctx.kind}:${ctx.id}`, title, songs);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar
        label=""
        right={
          songs.length ? (
            <Pressable accessibilityRole="button" accessibilityLabel={dl.all ? 'downloaded' : 'download'} onPress={dl.run} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={dl.all ? 'downloaded' : 'download'} size={22} color={dl.all || dl.busy ? c.accent : c.text} />
            </Pressable>
          ) : null
        }
      />
      <Screen top={false} gap={14} refreshing={loading && !!songs.length} onRefresh={refresh}>
        {error && !songs.length ? <ErrorBox error={error} onRetry={refresh} /> : null}
        <View style={{ alignItems: 'center' }}>{hero ?? <Art id={art} seed={ctx.id} size={260} radius={12} />}</View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ fontFamily: F.black, fontSize: fs(22), color: c.text, textAlign: 'center' }}>{title}</Text>
          {sub ? <Text style={{ fontFamily: F.sans, fontSize: fs(18), color: c.accent, textAlign: 'center' }}>{sub}</Text> : null}
          {meta ? <Text style={[u.muted, { textAlign: 'center' }]}>{meta}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            ['play', false],
            ['shuffle', true],
          ].map(([label, shuffle]) => (
            <Pressable
              accessibilityRole="button"
              key={String(label)}
              onPress={() => playSongs(songs, 0, ctx, !!shuffle)}
              style={({ pressed }) => ({ flex: 1, height: 42, borderRadius: 21, backgroundColor: shuffle ? c.raised : c.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: shuffle ? c.text : c.onAccent }}>{String(label)}</Text>
            </Pressable>
          ))}
        </View>
        {children}
        <View>
          {(sections ?? [{ title: '', ids: songs.map((s) => s.id) }]).map((sec, k) => (
            <View key={k}>
              {sec.title ? (
                <View style={{ marginTop: 14, marginBottom: 4 }}>
                  <Text style={{ fontFamily: F.heavy, fontSize: fs(16), color: c.text }}>{sec.title}</Text>
                  {sec.sub ? <Text style={u.muted}>{sec.sub}</Text> : null}
                </View>
              ) : null}
              {sec.ids.map((id) => {
                const i = songs.findIndex((x) => x.id === id);
                const s = songs[i];
                return s ? (
                  <SongRow key={`${s.id}-${k}`} s={s} n={numbered ? (s.track ?? i + 1) : undefined} art={!numbered} sub={lines?.[s.id] ? `matched: “${lines[s.id]}”` : undefined} onPress={() => playSongs(songs, i, ctx)} />
                ) : null;
              })}
            </View>
          ))}
          {!songs.length && !loading && !error ? <Empty>nothing here yet.</Empty> : null}
        </View>
      </Screen>
    </View>
  );
}
