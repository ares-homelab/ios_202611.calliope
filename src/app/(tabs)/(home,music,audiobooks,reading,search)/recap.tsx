import { useState } from 'react';
import { Text, View } from 'react-native';
import { BackBar, Chips, Empty, ErrorBox, Screen, useUi } from '../../../components/ui';
import { useRecap } from '../../../data';
import { count, hm } from '../../../format';
import { F, fs, useTheme } from '../../../theme';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export default function Recap() {
  const u = useUi();
  const { c } = useTheme();
  const res = useRecap();
  const r = res.data;
  const [k, setK] = useState<'mixed' | 'music' | 'books'>('mixed');
  const month = r ? MONTHS[Number(r.month.slice(5, 7)) - 1] : MONTHS[new Date().getMonth()];
  const top = (r?.top ?? []).filter((x) => k === 'mixed' || (k === 'music' ? x.kind === 'artist' : x.kind === 'author')).slice(0, 5);
  const big = (value: string, label: string) => (
    <View style={{ width: '48%', borderRadius: 16, backgroundColor: c.panel, padding: 14 }}>
      <Text style={{ fontFamily: F.black, fontSize: fs(26), color: c.text }}>{value}</Text>
      <Text style={u.muted}>{label}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label={`your ${month}`} />
      <Screen top={false} gap={16} refreshing={res.loading && !!r} onRefresh={res.refresh}>
        <Text style={u.h1}>ears and eyes</Text>
        {res.error && !r ? <ErrorBox error={res.error} onRetry={res.refresh} /> : null}
        {r ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
              {big(hm((r.music_seconds + r.audiobook_seconds) / 3600), 'listening')}
              {big(hm(r.reading_seconds / 3600), 'reading on kindle')}
              {big(String(r.books_finished), 'books finished')}
              {big(String(r.streak), 'days in a row')}
            </View>
            <Text style={u.h2}>top this month</Text>
            <Chips items={['mixed', 'music', 'books'] as const} value={k} onChange={setK} />
            {top.map((x, i) => (
              <View key={`${x.kind}-${x.name}`} style={[u.row, u.line, { gap: 14, paddingVertical: 10 }]}>
                <Text style={{ width: 24, fontFamily: F.black, fontSize: fs(20), color: c.accent }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>{x.name}</Text>
                  <Text style={u.muted}>{x.kind === 'artist' ? `${hm(x.seconds / 3600)} listened · ${count(x.plays, 'play')}` : `${hm(x.seconds / 3600)} · ${count(x.books, 'book')}`}</Text>
                </View>
              </View>
            ))}
            {!top.length ? <Empty>nothing yet this month.</Empty> : null}
            {r.path ? (
              <View style={{ borderRadius: 16, backgroundColor: c.panel, padding: 14, gap: 4 }}>
                <Text style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>{r.path.name} path</Text>
                <Text style={u.muted}>
                  {r.path.read} of {r.path.total} books{r.path.eta ? ` · done around ${r.path.eta} at your pace` : ''}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </Screen>
    </View>
  );
}
