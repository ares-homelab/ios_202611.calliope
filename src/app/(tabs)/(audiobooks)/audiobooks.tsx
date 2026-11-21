import { router } from 'expo-router';
import { voiceOf } from '../../../components/bits';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../../../components/icon';
import { Shelves } from '../../../components/library';
import { openShelf, RandomButton, ShelfLink, useLibrary } from '../../../components/shelf';
import { Cover, ErrorBox, Screen, useUi } from '../../../components/ui';
import { useAudiobook, useAudiobooks, useAudioQueue } from '../../../data';
import { percent } from '../../../format';
import { listen } from '../../../play';
import { current, usePlayer } from '../../../player';
import { F, fs, useTheme } from '../../../theme';

function Lane({ label, right, value, color }: { label: string; right: string; value: number; color: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{label}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{right}</Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.track }}>
        <View style={{ width: `${Math.min(1, value) * 100}%`, height: 4, borderRadius: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

function Current({ id }: { id: number }) {
  const u = useUi();
  const { c } = useTheme();
  const res = useAudiobook(id);
  const player = usePlayer();
  const b = res.data;
  if (!b) return null;
  const t = current(player);
  const mine = t?.kind === 'book' && t.bookId === id;
  const before = (b.tracks ?? []).slice(0, mine ? t!.n! - 1 : 0).reduce((a, x) => a + x.seconds, 0);
  const listened = mine ? (before + player.time) / Math.max(1, b.seconds) : (b.resume?.progress ?? 0);
  const kindle = b.resume?.progress ?? 0;
  const gap = Math.abs(listened - kindle);
  return (
    <Pressable accessibilityRole="button" onPress={() => listen(id)} style={({ pressed }) => [{ borderRadius: 18, backgroundColor: c.panel, padding: 14, flexDirection: 'row', gap: 14, opacity: pressed ? 0.85 : 1 }]}>
      <Cover id={id} title={b.title} width={80} height={118} radius={6} />
      <View style={{ flex: 1, gap: 7 }}>
        <Text style={{ fontFamily: F.heavy, fontSize: fs(17), lineHeight: fs(20), color: c.text }}>{b.title}</Text>
        <Text style={u.muted}>{voiceOf(b)}</Text>
        <Lane label="kindle" right={percent(kindle)} value={kindle} color={c.text} />
        <Lane label="listening" right={gap < 0.01 ? 'in sync' : percent(listened)} value={listened} color={c.accent} />
      </View>
    </Pressable>
  );
}

export default function Audiobooks() {
  const u = useUi();
  const { c } = useTheme();
  const lib = useLibrary('listen');
  const res = useAudiobooks();
  const queue = useAudioQueue();
  const player = usePlayer();
  const t = current(player);
  const top = t?.kind === 'book' ? t.bookId : res.data?.[0]?.id;
  const ticked = (queue.data ?? []).filter((q) => q.kind === 'listening' || q.kind === 'tapped');
  return (
    <Screen refreshing={lib.loading && !!lib.items.length} onRefresh={lib.refresh} gap={18}>
      <Text style={u.h1}>audiobooks</Text>
      {lib.error ? <ErrorBox error={lib.error} onRetry={lib.refresh} /> : null}
      {top ? <Current id={top} /> : null}
      <RandomButton scope="audio" lib={lib} mode="listen" />
      <View>
        <ShelfLink label="ready to listen" sub="human voice and ares voice" n={lib.audio.size} onPress={() => openShelf('audio', 'listen')} />
      </View>
      <Shelves lib={lib} mode="listen" />
      <Pressable accessibilityRole="button" onPress={() => router.push('/tonight')} style={({ pressed }) => [u.row, { borderRadius: 16, backgroundColor: c.panel, padding: 14, gap: 12, opacity: pressed ? 0.85 : 1 }]}>
        <Icon name="moon" size={22} color={c.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>tonight on ares</Text>
          <Text style={u.muted}>{ticked.length ? `${ticked.length} ${ticked.length === 1 ? 'book' : 'books'} ticked · kokoro runs 01:00–07:00` : 'nothing ticked · kokoro runs 01:00–07:00'}</Text>
        </View>
        <Text style={u.link}>pick</Text>
      </Pressable>
      <Text style={u.muted}>every other book is in reading → library: read it there, or queue it for tonight from its page.</Text>
    </Screen>
  );
}
