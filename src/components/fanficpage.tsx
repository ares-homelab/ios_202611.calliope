import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { api, WORKFLOWS, type FanficBook, type Workflow } from '../api';
import { useFanficBooks } from '../data';
import { authors, plainText, statusOf } from '../format';
import { patch, useResource } from '../store';
import { F, fs, useTheme } from '../theme';
import { ReadActions } from './readactions';
import { BackBar, Cover, Empty, ErrorBox, Eyebrow, Screen, Segmented, Tag, useUi } from './ui';

/** a fanfic's page: read it, keep it offline, its status and summary */
export function FanficPage({ id }: { id: number }) {
  const u = useUi();
  const { c } = useTheme();
  const list = useFanficBooks();
  const res = useResource(`fanfic/book/${id}`, () => api.fanficBook(id));
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const b = res.data ?? list.data?.find((x) => x.id === id);
  if (!b)
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <BackBar label="back" />
        <Screen top={false}>{res.error ? <ErrorBox error={res.error} onRetry={res.refresh} /> : <Empty>loading…</Empty>}</Screen>
      </View>
    );
  const status = statusOf({ workflow: b.workflow ?? [] });
  const setStatus = async (w: Workflow) => {
    if (w === status) return;
    setBusy(true);
    try {
      await api.setFanficStatus(id, w);
      patch<FanficBook[]>('fanfic/books', (bs) => bs.map((x) => (x.id === id ? { ...x, workflow: [w] } : x)));
      res.refresh();
    } catch (e) {
      Alert.alert("ares didn't take it", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const about = plainText(res.data?.description ?? null);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="back" />
      <Screen top={false} gap={22} refreshing={res.loading && !!res.data} onRefresh={res.refresh}>
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-end' }}>
          <Cover id={id} lib="fanfic" title={b.title} author={b.authors[0]} hasCover={b.has_cover ?? false} width={118} height={177} shadow />
          <View style={{ flex: 1, gap: 6, paddingBottom: 4 }}>
            <Text style={{ fontFamily: F.serifBold, fontSize: fs(26), lineHeight: fs(29), color: c.text }}>{b.title}</Text>
            <Text style={[u.soft, { fontSize: fs(14) }]}>{authors(b.authors)}</Text>
            <Text style={u.muted}>{['fanfic', b.fandom, b.series ? `${b.series}${b.series_index ? ` ${b.series_index}` : ''}` : null].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        <ReadActions lib="fanfic" id={id} title={b.title} formats={res.data?.formats ?? ['epub']} />
        <View style={{ gap: 10 }}>
          <Eyebrow>status</Eyebrow>
          <Segmented strong value={status} onChange={setStatus} options={WORKFLOWS.map((w) => ({ value: w, label: w.toLowerCase() }))} />
          <Text style={u.muted}>{busy ? 'saving…' : 'saved to the fanfic library on ares'}</Text>
        </View>
        {about ? (
          <Pressable onPress={() => setMore(!more)} style={{ gap: 10 }}>
            <Eyebrow>summary</Eyebrow>
            <Text style={[u.soft, { fontSize: fs(14), lineHeight: fs(21) }]} numberOfLines={more ? undefined : 8}>
              {about}
            </Text>
          </Pressable>
        ) : null}
        {res.data?.tags?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {res.data.tags.filter((t) => t !== 'fanfic').map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        ) : null}
      </Screen>
    </View>
  );
}
