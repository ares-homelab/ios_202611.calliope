import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { swatch } from '../../../../components/art';
import { Collection } from '../../../../components/collection';
import { useMix } from '../../../../data';
import { songsById } from '../../../../play';
import { useResource } from '../../../../store';
import type { MixCard } from '../../../../api';
import { F, fs, useTheme } from '../../../../theme';

/** Familiar's markdown-lite: paragraphs, "- " bullets and **bold** */
function Interpretation({ text }: { text: string }) {
  const { c } = useTheme();
  const body = {
    fontFamily: F.sans,
    fontSize: fs(15),
    lineHeight: fs(22),
    color: c.text,
  };
  const spans = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <Text key={i} style={{ fontFamily: F.heavy }}>
          {part.slice(2, -2)}
        </Text>
      ) : (
        part
      ),
    );
  return (
    <View style={{ width: '100%', gap: 8, marginTop: 14 }}>
      <Text
        style={{
          fontFamily: F.heavy,
          fontSize: 11,
          letterSpacing: 0.7,
          color: c.muted,
        }}
      >
        YOUR READING
      </Text>
      {text
        .split('\n')
        .filter((l) => l.trim())
        .map((l, i) =>
          /^\s*[-•]\s+/.test(l) ? (
            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 4 }}>
              <Text style={body}>•</Text>
              <Text style={[body, { flex: 1 }]}>{spans(l.replace(/^\s*[-•]\s+/, ''))}</Text>
            </View>
          ) : (
            <Text key={i} style={body}>
              {spans(l)}
            </Text>
          ),
        )}
    </View>
  );
}

function Cards({ cards, interpretation }: { cards: MixCard[]; interpretation?: string | null }) {
  return (
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
        {cards.map((k, i) => (
          <View
            key={k.name}
            style={{
              flex: 1,
              borderRadius: 14,
              backgroundColor: i ? '#2A2D55' : '#C9A46A',
              padding: 14,
              gap: 18,
              minHeight: 130,
            }}
          >
            <Text
              style={{
                fontFamily: F.black,
                fontSize: 28,
                color: i ? '#E6E4F4' : '#2A1C10',
              }}
            >
              {k.numeral}
            </Text>
            <Text
              style={{
                fontFamily: F.heavy,
                fontSize: fs(14),
                color: i ? '#E6E4F4' : '#2A1C10',
              }}
            >
              {k.name} · {k.how}
              {k.reversed ? ' · reversed' : ''}
            </Text>
          </View>
        ))}
      </View>
      {interpretation ? <Interpretation text={interpretation} /> : null}
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
      hero={
        m?.cards?.length ? (
          <Cards cards={m.cards} interpretation={m.interpretation} />
        ) : (
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 14,
              backgroundColor: m?.color ?? swatch(id),
            }}
          />
        )
      }
      songs={songs.data ?? []}
      sections={m?.sections.map((s) => ({
        title: s.title,
        sub: s.sub,
        ids: s.songs.map((x) => x.id),
      }))}
      lines={lines}
      loading={res.loading || songs.loading}
      error={res.error ?? songs.error}
      refresh={res.refresh}
    />
  );
}
