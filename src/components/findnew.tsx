import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { api, type FindKind, type Found, type FoundResults } from '../api';
import { useFindRequests } from '../data';
import { dayMonth } from '../format';
import { addNote, FIND_KINDS, foundLine, mergeFound, requestLine, requestSource } from '../found';
import { refreshKeys } from '../store';
import { F, fs, useTheme } from '../theme';
import { Icon, type IconName } from './icon';
import { Bar, Button, Chips, Empty, ErrorBox, SectionHead, StatusPill, useUi } from './ui';

const ICON: Record<FindKind, IconName> = { tv: 'play', movies: 'play', music: 'music', books: 'book' };
const key = (f: { kind: string; id: string }) => `${f.kind}/${f.id}`;

function Poster({ kind, uri }: { kind: FindKind; uri?: string | null }) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width: 48, height: kind === 'music' ? 48 : 72, borderRadius: 6, overflow: 'hidden', backgroundColor: c.raised, borderWidth: 1, borderColor: c.coverEdge, alignItems: 'center', justifyContent: 'center' }}>
      {uri && !failed ? (
        <Image source={{ uri }} cachePolicy="disk" recyclingKey={uri} transition={120} contentFit="cover" onError={() => setFailed(true)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : (
        <Icon name={ICON[kind]} size={20} color={c.muted} />
      )}
    </View>
  );
}

function Title({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <Text numberOfLines={2} style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>
      {children}
    </Text>
  );
}

function FoundRow({ f, busy, onAdd }: { f: Found; busy: boolean; onAdd: () => void }) {
  const u = useUi();
  return (
    <View style={[u.row, u.line, { gap: 14, paddingVertical: 10 }]}>
      <Poster kind={f.kind} uri={f.poster} />
      <View style={{ flex: 1, gap: 2 }}>
        <Title>{f.title}</Title>
        <Text numberOfLines={1} style={u.muted}>
          {foundLine(f)}
        </Text>
        {f.detail ? <Text style={u.muted}>{f.detail}</Text> : null}
        {f.overview ? (
          <Text numberOfLines={2} style={u.soft}>
            {f.overview}
          </Text>
        ) : null}
      </View>
      {f.in_library ? <StatusPill status={f.status === 'wanted' ? 'added' : 'in library'} /> : <Button label="add" kind="outline" busy={busy} onPress={onAdd} />}
    </View>
  );
}

function Requests() {
  const u = useUi();
  const res = useFindRequests();
  return (
    <View>
      <SectionHead title="requests" />
      {res.error ? <ErrorBox error={res.error} stale={!!res.data} onRetry={res.refresh} /> : null}
      {res.data?.map((r) => (
        <View key={key(r)} style={[u.row, u.line, { gap: 14, paddingVertical: 10 }]}>
          <Poster kind={r.kind} uri={r.poster} />
          <View style={{ flex: 1, gap: 3 }}>
            <Title>{r.title}</Title>
            <Text numberOfLines={1} style={u.muted}>
              {[requestLine(r), requestSource(r), dayMonth(r.added)].join(' · ')}
            </Text>
            {r.status === 'downloading' && r.progress != null ? <Bar value={r.progress} /> : null}
            {r.detail ? (
              <Text numberOfLines={2} style={u.soft}>
                {r.detail}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
      {res.data && !res.data.length ? <Empty>nothing added yet. what you add here shows up with its status.</Empty> : null}
    </View>
  );
}

export type Finding = { q: string; loading: boolean; results?: FoundResults; error?: string };

/** one search at a time, run on return: lidarr's metadata server turns away a search per letter */
export function useFind() {
  const [state, setState] = useState<Finding>({ q: '', loading: false });
  const latest = useRef(0);
  const run = (text: string) => {
    const q = text.trim();
    const n = ++latest.current;
    if (!q) return setState({ q: '', loading: false });
    setState({ q, loading: true });
    api
      .find(q)
      .then((results) => latest.current === n && setState({ q, loading: false, results }))
      .catch((e: Error) => latest.current === n && setState({ q, loading: false, error: e.message }));
  };
  const { q, results } = state;
  // shelfmark takes up to a few minutes: ask again for the books until they're in
  useEffect(() => {
    if (!results?.pending?.includes('books')) return;
    const n = latest.current;
    const timer = setTimeout(() => {
      api
        .find(q, 'books')
        .then((next) => latest.current === n && setState((s) => (s.results ? { ...s, results: mergeFound(s.results, 'books', next) } : s)))
        .catch((e: Error) => latest.current === n && setState((s) => (s.results ? { ...s, results: mergeFound(s.results, 'books', { results: s.results.results.filter((f) => f.kind === 'books'), errors: { books: e.message } }) } : s)));
    }, 4000);
    return () => clearTimeout(timer);
  }, [q, results]);
  const added = (f: Found) =>
    setState((s) => (s.results ? { ...s, results: { ...s.results, results: s.results.results.map((x) => (key(x) === key(f) ? { ...x, in_library: true, status: f.status } : x)) } } : s));
  return { ...state, run, added };
}

/** tv, movies, music and books that aren't on ares yet: results of the last search, or what was added from here */
export function FindNew({ find }: { find: ReturnType<typeof useFind> }) {
  const u = useUi();
  const { c } = useTheme();
  const [kind, setKind] = useState<'all' | FindKind>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (f: Found) => {
    setBusy(key(f));
    try {
      find.added(await api.findAdd(f.kind, f.id));
      refreshKeys('search/requests');
    } catch (e) {
      Alert.alert('not added', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const confirm = (f: Found) =>
    Alert.alert(`add ${f.title}?`, addNote(f), [
      { text: 'cancel', style: 'cancel' },
      { text: 'add', onPress: () => add(f) },
    ]);

  if (!find.q) return <Requests />;
  const kinds = FIND_KINDS.filter((k) => kind === 'all' || k === kind);
  const all = find.results?.results ?? [];
  const errors = kinds.filter((k) => find.results?.errors?.[k]);
  const waiting = kinds.includes('books') && find.results?.pending?.includes('books');
  return (
    <>
      <Chips<'all' | FindKind> items={['all', ...FIND_KINDS]} value={kind} onChange={setKind} />
      {find.loading ? <ActivityIndicator accessibilityLabel="searching" color={c.muted} style={{ paddingVertical: 24 }} /> : null}
      {find.error ? <ErrorBox error={find.error} onRetry={() => find.run(find.q)} /> : null}
      {errors.map((k) => (
        <Text key={k} style={[u.soft, { color: c.warn }]}>
          {k}: {find.results!.errors![k]}
        </Text>
      ))}
      {kinds.map((k) => {
        const of = all.filter((f) => f.kind === k);
        const shown = kind === 'all' ? of.slice(0, 5) : of;
        if (!of.length) return null;
        return (
          <View key={k}>
            <SectionHead title={k} right={of.length > shown.length ? `all ${of.length}` : undefined} onPress={() => setKind(k)} />
            {shown.map((f) => (
              <FoundRow key={key(f)} f={f} busy={busy === key(f)} onAdd={() => confirm(f)} />
            ))}
          </View>
        );
      })}
      {waiting ? (
        <View style={[u.row, { gap: 10, paddingVertical: 8 }]}>
          <ActivityIndicator color={c.muted} />
          <Text style={u.soft}>asking shelfmark for books, up to a few minutes…</Text>
        </View>
      ) : null}
      {find.results && !waiting && !errors.length && !all.some((f) => kinds.includes(f.kind)) ? <Empty>nothing found for “{find.q}”.</Empty> : null}
    </>
  );
}
