import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { BackBar, Empty, ErrorBox, Screen, useUi } from '../../../components/ui';
import { useWanted } from '../../../data';
import { F, fs, useTheme } from '../../../theme';
import { count } from '../../../format';

/** songs played on spotify / apple music and apple music library songs that aren't in navidrome yet (a list only; getting them is up to mars) */
export default function Wanted() {
  const u = useUi();
  const { c } = useTheme();
  const res = useWanted();
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const items = (res.data?.items ?? []).filter((x) => !t || `${x.title} ${x.artist} ${x.album ?? ''}`.toLowerCase().includes(t));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="" />
      <Screen top={false} gap={12} refreshing={res.loading && !!res.data} onRefresh={res.refresh}>
        <Text style={u.h1}>wanted</Text>
        <Text style={u.soft}>
          {res.data ? `${count(res.data.total, 'song')} from your apple music library and your spotify and apple music plays that aren't on ares yet, most played first.` : 'from your apple music library and play history.'}
        </Text>
        <TextInput value={q} onChangeText={setQ} placeholder="filter" placeholderTextColor={c.muted} style={{ height: 44, borderRadius: 12, paddingHorizontal: 14, backgroundColor: c.panel, color: c.text, fontFamily: F.sans, fontSize: fs(15) }} />
        {res.error && !res.data ? <ErrorBox error={res.error} onRetry={res.refresh} /> : null}
        {items.slice(0, 300).map((x, i) => (
          <View key={`${x.artist}-${x.title}-${i}`} style={[u.row, u.line, { gap: 12, paddingVertical: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{x.title}</Text>
              <Text style={u.muted}>{[x.artist, x.album].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={u.muted}>
              {x.plays ? `${x.plays} · ${x.source}` : x.source}
            </Text>
          </View>
        ))}
        {res.data && !items.length ? <Empty>nothing matches.</Empty> : null}
      </Screen>
    </View>
  );
}
