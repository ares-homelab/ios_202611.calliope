import { router } from 'expo-router';
import { openAudiobook, voiceOf } from '../../../components/bits';
import { Pressable, Text, View } from 'react-native';
import type { Audiobook } from '../../../api';
import { Icon } from '../../../components/icon';
import { Cover, Empty, ErrorBox, Screen, SectionHead, useUi } from '../../../components/ui';
import { useAudiobook, useAudiobooks, useAudioQueue } from '../../../data';
import { groupState, useDownloads } from '../../../downloads';
import { hm, percent } from '../../../format';
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
    <Pressable onPress={() => listen(id)} style={({ pressed }) => [{ borderRadius: 18, backgroundColor: c.panel, padding: 14, flexDirection: 'row', gap: 14, opacity: pressed ? 0.85 : 1 }]}>
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

function Row({ b }: { b: Audiobook }) {
  const u = useUi();
  const { c } = useTheme();
  const dl = useDownloads();
  const keys = Array.from({ length: b.track_count ?? 0 }, (_, i) => `b:${b.id}:${i + 1}`);
  const saved = Object.keys(dl.saved).some((k) => k.startsWith(`b:${b.id}:`));
  const state = groupState(dl, String(b.id), keys);
  const sub =
    b.source === 'kokoro' && !b.complete
      ? `ares voice · ${b.chapters_total ? `${b.track_count ?? 0} of ${b.chapters_total} chapters` : hm(b.seconds / 3600)}, more tonight`
      : `${b.source === 'kokoro' ? 'ares voice' : 'human voice'} · ${hm(b.seconds / 3600)}`;
  return (
    <Pressable onPress={() => openAudiobook(b.id)} style={({ pressed }) => [u.row, u.line, { gap: 14, paddingVertical: 10, opacity: pressed ? 0.7 : 1 }]}>
      <Cover id={b.id} title={b.title} width={44} height={64} radius={4} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{b.title}</Text>
        <Text style={u.muted}>{sub}</Text>
      </View>
      {saved || state.all ? <Icon name="downloaded" size={20} color={c.accent} /> : null}
    </Pressable>
  );
}

export default function Audiobooks() {
  const u = useUi();
  const { c } = useTheme();
  const res = useAudiobooks();
  const queue = useAudioQueue();
  const player = usePlayer();
  const t = current(player);
  const books = res.data ?? [];
  const top = t?.kind === 'book' ? t.bookId : books[0]?.id;
  const ticked = (queue.data ?? []).filter((q) => q.kind === 'listening' || q.kind === 'tapped');
  return (
    <Screen refreshing={res.loading && !!res.data} onRefresh={() => (res.refresh(), queue.refresh())} gap={18}>
      <Text style={u.h1}>audiobooks</Text>
      {res.error && !res.data ? <ErrorBox error={res.error} onRetry={res.refresh} /> : null}
      {top ? <Current id={top} /> : null}
      <View>
        <SectionHead title="ready to listen" />
        {books.filter((b) => b.id !== top).map((b) => (
          <Row key={b.id} b={b} />
        ))}
        {!books.length ? <Empty>{res.loading ? 'loading…' : 'no audio yet. tick books for tonight and ares voices them overnight.'}</Empty> : null}
      </View>
      <Pressable onPress={() => router.push('/tonight')} style={({ pressed }) => [u.row, { borderRadius: 16, backgroundColor: c.panel, padding: 14, gap: 12, opacity: pressed ? 0.85 : 1 }]}>
        <Icon name="moon" size={22} color={c.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>tonight on ares</Text>
          <Text style={u.muted}>{ticked.length ? `${ticked.length} ${ticked.length === 1 ? 'book' : 'books'} ticked · kokoro runs 01:00–07:00` : 'nothing ticked · kokoro runs 01:00–07:00'}</Text>
        </View>
        <Text style={u.link}>pick</Text>
      </Pressable>
    </Screen>
  );
}
