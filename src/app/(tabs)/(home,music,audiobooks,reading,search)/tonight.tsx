import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../../api';
import { BackBar, Cover, Empty, ErrorBox, Screen, SectionHead, useUi } from '../../../components/ui';
import { useAudiobooks, useAudioQueue, useBooks } from '../../../data';
import { F, fs, useTheme } from '../../../theme';

const KIND: Record<string, string> = { listening: 'you are listening', tapped: 'ticked', ongoing: 'reading now', familiar: 'tarot', library: 'library' };

/** the night audio queue on ares: kokoro voices books 01:00–07:00, ticked ones first */
export default function Tonight() {
  const u = useUi();
  const { c } = useTheme();
  const queue = useAudioQueue();
  const books = useBooks();
  const audio = useAudiobooks();
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const ready = new Set((audio.data ?? []).filter((b) => b.complete).map((b) => b.id));
  const ticked = new Set((queue.data ?? []).filter((x) => x.kind === 'listening' || x.kind === 'tapped').map((x) => x.id));
  const found = t.length > 1 ? (books.data ?? []).filter((b) => !ready.has(b.id) && `${b.title} ${b.authors.join(' ')}`.toLowerCase().includes(t)).slice(0, 12) : [];
  const tick = async (id: number, title: string) => {
    try {
      const r = await api.queueBook(id);
      queue.refresh();
      Alert.alert('ticked for tonight', `${title}: number ${r.position} of ${r.of}.`);
    } catch (e) {
      Alert.alert("can't reach ares", (e as Error).message);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="" />
      <Screen top={false} gap={14} refreshing={queue.loading && !!queue.data} onRefresh={queue.refresh}>
        <Text style={u.h1}>tonight on ares</Text>
        <Text style={u.soft}>kokoro reads books aloud between 01:00 and 07:00, ticked books first. books with a human recording skip the queue.</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="find a book to tick" placeholderTextColor={c.muted} style={{ height: 44, borderRadius: 12, paddingHorizontal: 14, backgroundColor: c.panel, color: c.text, fontFamily: F.sans, fontSize: fs(15) }} />
        {found.map((b) => (
          <Pressable accessibilityRole="button" accessibilityState={{ checked: ticked.has(b.id) }} key={b.id} onPress={() => tick(b.id, b.title)} style={[u.row, u.line, { gap: 12, paddingVertical: 8 }]}>
            <Cover id={b.id} title={b.title} hasCover={b.has_cover} width={36} height={52} radius={3} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{b.title}</Text>
              <Text style={u.muted}>{b.authors.join(', ')}</Text>
            </View>
            <Text style={u.link}>{ticked.has(b.id) ? 'ticked' : 'tick'}</Text>
          </Pressable>
        ))}
        {queue.error && !queue.data ? <ErrorBox error={queue.error} onRetry={queue.refresh} /> : null}
        <SectionHead title="the queue" />
        {(queue.data ?? []).slice(0, 25).map((x) => (
          <View key={x.id} style={[u.row, u.line, { gap: 12, paddingVertical: 8 }]}>
            <Text style={{ width: 26, fontFamily: F.heavy, fontSize: fs(14), color: ticked.has(x.id) ? c.accent : c.muted }}>{x.position}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{x.title}</Text>
              <Text style={u.muted}>
                {KIND[x.kind] ?? x.kind}
                {x.chapters_ready ? ` · ${x.chapters_ready} chapters voiced` : ''}
              </Text>
            </View>
          </View>
        ))}
        {queue.data && !queue.data.length ? <Empty>the queue is empty.</Empty> : null}
      </Screen>
    </View>
  );
}
