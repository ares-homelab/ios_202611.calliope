import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { api, type FindKind, type Found, type FoundResults } from '../api';
import { useFindRequests } from '../data';
import { dayMonth } from '../format';
import { addNote, canPick, FIND_KINDS, foundLine, isWork, mergeFound, pickedLine, requestLine, requestSource, sourceLine } from '../found';
import { refreshKeys } from '../store';
import { F, fs, useTheme } from '../theme';
import { Icon, type IconName } from './icon';
import { PickRelease } from './releases';
import { Bar, Button, Chips, Empty, ErrorBox, SectionHead, StatusPill, useUi } from './ui';

const ICON: Record<FindKind, IconName> = { tv: 'play', movies: 'play', music: 'music', books: 'book', comics: 'book', manga: 'book' };
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

function FoundRow({ f, busy, onAdd, onPick }: { f: Found; busy: boolean; onAdd: () => void; onPick?: () => void }) {
  const u = useUi();
  return (
    <View style={[u.row, u.line, { gap: 14, paddingVertical: 10 }]}>
      <Poster kind={f.kind} uri={f.poster} />
      <View style={{ flex: 1, gap: 2 }}>
        <Title>{f.title}</Title>
        <Text numberOfLines={1} style={u.muted}>
          {foundLine(f)}
        </Text>
        <Text numberOfLines={1} style={u.muted}>
          {sourceLine(f)}
        </Text>
        {f.overview ? (
          <Text numberOfLines={2} style={u.soft}>
            {f.overview}
          </Text>
        ) : null}
        {onPick ? <Button label="pick release" kind="outline" onPress={onPick} style={{ alignSelf: 'flex-start', marginTop: 6 }} /> : null}
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
            {r.detail && r.detail !== requestLine(r) ? (
              <Text numberOfLines={2} style={u.soft}>
                {r.detail}
              </Text>
            ) : null}
            {r.releases?.slice(0, 3).map((p) => (
              <Text key={p.id} numberOfLines={2} style={u.soft}>
                {[pickedLine(p), p.title].filter(Boolean).join(' · ')}
              </Text>
            ))}
          </View>
        </View>
      ))}
      {res.data && !res.data.length ? <Empty>nothing added yet. what you add here shows up with its status.</Empty> : null}
    </View>
  );
}

export type Finding = { q: string; loading: boolean; editions?: boolean; results?: FoundResults; error?: string };

/** one search at a time, run on return: the metadata servers turn away a search per letter */
export function useFind() {
  const [state, setState] = useState<Finding>({ q: '', loading: false });
  const latest = useRef(0);
  const typed = useRef('');
  /** `editions` lists what can be downloaded of one book, to choose by hand */
  const run = (text: string, editions = false) => {
    const q = text.trim();
    const n = ++latest.current;
    if (!editions) typed.current = q;
    if (!q) return setState({ q: '', loading: false });
    setState({ q, loading: true, editions });
    api
      .find(q, editions ? 'books' : undefined, editions)
      .then((results) => latest.current === n && setState({ q, loading: false, editions, results }))
      .catch((e: Error) => latest.current === n && setState({ q, loading: false, editions, error: e.message }));
  };
  const { q, results, editions } = state;
  const asking = results?.pending?.[0];
  // musicbrainz takes seconds and shelfmark up to minutes: ask again until they're in, through an api restart too
  const misses = useRef(0);
  useEffect(() => {
    if (!asking) return;
    const n = latest.current;
    const timer = setTimeout(() => {
      api
        .find(q, asking, editions)
        .then((next) => {
          misses.current = 0;
          if (latest.current === n) setState((s) => (s.results ? { ...s, results: mergeFound(s.results, asking, next) } : s));
        })
        .catch((e: Error) => {
          const again = ++misses.current < 8;
          if (!again) misses.current = 0;
          if (latest.current === n)
            setState((s) => {
              if (!s.results) return s;
              const kept = s.results.results.filter((f) => f.kind === asking);
              return { ...s, results: mergeFound(s.results, asking, again ? { results: kept, errors: s.results.errors, pending: [asking] } : { results: kept, errors: { [asking]: e.message } }) };
            });
        });
    }, 3000);
    return () => clearTimeout(timer);
  }, [q, results, asking, editions]);
  const added = (f: Found) =>
    setState((s) => (s.results ? { ...s, results: { ...s.results, results: s.results.results.map((x) => (key(x) === key(f) ? { ...x, in_library: true, status: f.status } : x)) } } : s));
  return { ...state, run, added, back: () => run(typed.current) };
}

/** tv, movies, music, books, comics and manga that aren't on ares yet: results of the last search, or what was added from here */
export function FindNew({ find }: { find: ReturnType<typeof useFind> }) {
  const u = useUi();
  const { c } = useTheme();
  const [kind, setKind] = useState<'all' | FindKind>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ q: string; f: Found } | null>(null);

  const add = async (f: Found) => {
    setBusy(key(f));
    try {
      find.added(await api.findAdd(f));
      refreshKeys('search/requests');
    } catch (e) {
      Alert.alert('not added', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const confirm = (f: Found) =>
    Alert.alert(`add ${f.title}?`, addNote(f), [
      { text: 'add', onPress: () => add(f) },
      ...(isWork(f) ? [{ text: 'choose an edition', onPress: () => find.run([f.title, f.creator?.split(', ')[0]].filter(Boolean).join(' '), true) }] : []),
      { text: 'cancel', style: 'cancel' as const },
    ]);

  if (!find.q) return <Requests />;
  if (picking && picking.q === find.q) return <PickRelease key={key(picking.f)} f={picking.f} onBack={() => setPicking(null)} onGrabbed={find.added} />;
  const kinds = FIND_KINDS.filter((k) => (find.editions ? k === 'books' : kind === 'all' || k === kind));
  const all = find.results?.results ?? [];
  const errors = kinds.filter((k) => find.results?.errors?.[k]);
  const waiting = kinds.filter((k) => find.results?.pending?.includes(k));
  const needs = kind !== 'all' && !find.editions ? find.results?.needs?.[kind] : undefined;
  return (
    <>
      {find.editions ? <SectionHead title={`editions of ${find.q}`} right="all results" onPress={find.back} /> : <Chips<'all' | FindKind> items={['all', ...FIND_KINDS]} value={kind} onChange={setKind} />}
      {find.loading ? <ActivityIndicator accessibilityLabel="searching" color={c.muted} style={{ paddingVertical: 24 }} /> : null}
      {find.error ? <ErrorBox error={find.error} onRetry={() => find.run(find.q, find.editions)} /> : null}
      {errors.map((k) => (
        <Text key={k} style={[u.soft, { color: c.warn }]}>
          {k}: {find.results!.errors![k]}
        </Text>
      ))}
      {kinds.map((k) => {
        const of = all.filter((f) => f.kind === k);
        const shown = kind === 'all' && !find.editions ? of.slice(0, 5) : of;
        if (!of.length) return null;
        return (
          <View key={k}>
            {find.editions ? null : <SectionHead title={k} right={of.length > shown.length ? `all ${of.length}` : undefined} onPress={() => setKind(k)} />}
            {shown.map((f) => (
              <FoundRow key={key(f)} f={f} busy={busy === key(f)} onAdd={() => confirm(f)} onPick={canPick(f) ? () => setPicking({ q: find.q, f }) : undefined} />
            ))}
          </View>
        );
      })}
      {needs ? <Empty>{needs}</Empty> : null}
      {waiting.length && !find.loading ? (
        <View style={[u.row, { gap: 10, paddingVertical: 8 }]}>
          <ActivityIndicator color={c.muted} />
          <Text style={u.soft}>{waiting.includes('books') ? 'asking shelfmark for books, up to a few minutes…' : 'asking musicbrainz…'}</Text>
        </View>
      ) : null}
      {find.results && !waiting.length && !needs && !errors.length && !all.some((f) => kinds.includes(f.kind)) ? <Empty>nothing found for “{find.q}”.</Empty> : null}
    </>
  );
}
