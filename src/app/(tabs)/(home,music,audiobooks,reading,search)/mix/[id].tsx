import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { swatch } from '../../../../components/art';
import { Collection } from '../../../../components/collection';
import { useMix } from '../../../../data';
import { songsById } from '../../../../play';
import { useResource } from '../../../../store';
import { F, fs } from '../../../../theme';

function Cards({ cards }: { cards: { name: string; numeral: string; how: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
      {cards.map((k, i) => (
        <View key={k.name} style={{ flex: 1, borderRadius: 14, backgroundColor: i ? '#2A2D55' : '#C9A46A', padding: 14, gap: 18, minHeight: 130 }}>
          <Text style={{ fontFamily: F.black, fontSize: 28, color: i ? '#E6E4F4' : '#2A1C10' }}>{k.numeral}</Text>
          <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: i ? '#E6E4F4' : '#2A1C10' }}>
            {k.name} · {k.how}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function MixScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = useMix(id);
  const m = res.data;
  const ids = (m?.sections ?? []).flatMap((s) => s.songs.map((x) => x.id));
  const songs = useResource(`mixsongs/${id}/${ids.length}`, () => songsById(ids));
  const lines = Object.fromEntries((m?.sections ?? []).flatMap((s) => s.songs.map((x) => [x.id, x.line])));
  return (
    <Collection
      ctx={{ kind: 'mix', id, title: m?.title ?? '', sub: m?.sub }}
      title={m?.title ?? ''}
      meta={m?.sub}
      hero={m?.cards?.length ? <Cards cards={m.cards} /> : <View style={{ width: 220, height: 220, borderRadius: 14, backgroundColor: m?.color ?? swatch(id) }} />}
      songs={songs.data ?? []}
      sections={m?.sections.map((s) => ({ title: s.title, sub: s.sub, ids: s.songs.map((x) => x.id) }))}
      lines={lines}
      loading={res.loading || songs.loading}
      error={res.error ?? songs.error}
      refresh={res.refresh}
    />
  );
}
