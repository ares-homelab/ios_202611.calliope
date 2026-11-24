import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';
import { api, type Found, type Part, type Release, type Releases } from '../api';
import { bytes, langBadge, partOf, releaseLine, releaseSource } from '../found';
import { refreshKeys } from '../store';
import { F, fs, useTheme } from '../theme';
import { Button, Empty, ErrorBox, SectionHead, StatusPill, useUi } from './ui';

type State = { ask: { part: Part; n: number }; loading: boolean; results?: Releases; error?: string };

/** prowlarr waits for its slowest indexer, so this asks again until the list is in */
function useReleases({ kind, id }: Found) {
  const [state, setState] = useState<State>({ ask: { part: {}, n: 0 }, loading: true });
  const { ask } = state;
  useEffect(() => {
    let on = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      api
        .releases({ kind, id }, ask.part)
        .then((results) => {
          if (!on) return;
          if (results.pending) timer = setTimeout(load, 3000);
          else setState((s) => ({ ask: s.ask, loading: false, results }));
        })
        .catch((e: Error) => {
          if (on) setState((s) => ({ ask: s.ask, loading: false, error: e.message }));
        });
    load();
    return () => {
      on = false;
      clearTimeout(timer);
    };
  }, [kind, id, ask]);
  const run = (part: Part) => setState((s) => ({ ask: { part, n: s.ask.n + 1 }, loading: true }));
  return { part: ask.part, loading: state.loading, results: state.results, error: state.error, run };
}

function Num({ label, value, onChange, onDone }: { label: string; value: string; onChange: (t: string) => void; onDone: () => void }) {
  const { c } = useTheme();
  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={c.muted}
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onDone}
      keyboardType="number-pad"
      maxLength={4}
      style={{ flex: 1, minHeight: 44, borderRadius: 10, paddingHorizontal: 12, backgroundColor: c.raised, color: c.text, fontFamily: F.sans, fontSize: fs(15) }}
    />
  );
}

/** one title's releases, best first; picking one sends it to the import queue after a confirm */
export function PickRelease({ f, onBack, onGrabbed }: { f: Found; onBack: () => void; onGrabbed: (f: Found) => void }) {
  const u = useUi();
  const { c } = useTheme();
  const list = useReleases(f);
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const grab = async (r: Release) => {
    setBusy(r.guid);
    try {
      await api.grabRelease(f, r.guid, list.part);
      setSent((s) => [...s, r.guid]);
      onGrabbed({ ...f, in_library: true, status: f.in_library ? f.status : 'wanted' });
      refreshKeys('search/requests');
    } catch (e) {
      Alert.alert('not sent', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const confirm = (r: Release) =>
    Alert.alert('download this release?', `${r.title}\n\n${bytes(r.size)}, ${r.seeders} seeding. ${f.title} is followed on ares without a search of its own.`, [
      { text: 'download', onPress: () => grab(r) },
      { text: 'cancel', style: 'cancel' },
    ]);
  const search = () => list.run(partOf(season, episode));
  const found = list.results?.results;
  return (
    <>
      <SectionHead title={`releases of ${f.title}`} right="all results" onPress={onBack} />
      {f.kind === 'tv' ? (
        <View style={[u.row, { gap: 10 }]}>
          <Num label="season" value={season} onChange={setSeason} onDone={search} />
          <Num label="episode" value={episode} onChange={setEpisode} onDone={search} />
          <Button label="search" kind="outline" busy={list.loading} onPress={search} style={{ minHeight: 44 }} />
        </View>
      ) : null}
      {list.loading ? (
        <View style={[u.row, { gap: 10, paddingVertical: 8 }]}>
          <ActivityIndicator color={c.muted} />
          <Text style={u.soft}>asking the indexers, up to a minute or two…</Text>
        </View>
      ) : null}
      {list.error ? <ErrorBox error={list.error} onRetry={() => list.run(list.part)} /> : null}
      {found?.map((r) => {
        const badge = langBadge(r.language);
        return (
          <View key={r.guid} style={[u.row, u.line, { gap: 14, paddingVertical: 10 }]}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14), color: c.text }}>{r.title}</Text>
              <Text style={u.muted}>{releaseLine(r)}</Text>
              <View style={[u.row, { gap: 8 }]}>
                <Text numberOfLines={1} style={[u.muted, { flexShrink: 1 }]}>
                  {releaseSource(r)}
                </Text>
                {badge ? <StatusPill status={badge} /> : null}
              </View>
            </View>
            {sent.includes(r.guid) ? <StatusPill status="queued" /> : <Button label="get" kind="outline" busy={busy === r.guid} onPress={() => confirm(r)} />}
          </View>
        );
      })}
      {found && !found.length ? <Empty>no release found for this.</Empty> : null}
    </>
  );
}
