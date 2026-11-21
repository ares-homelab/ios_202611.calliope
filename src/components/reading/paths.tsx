import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { openBook, openPath, openSection } from '../bits';
import { Cover, Empty, ErrorBox, Segmented, useUi } from '../ui';
import { useAudiobooks, usePaths, useRecap, useSections } from '../../data';
import type { Path } from '../../api';
import { count, roman } from '../../format';
import { F, useTheme, fs } from '../../theme';

function Row({ mark, title, about, counts, pinned, onPress, last }: { mark?: string; title: string; about?: string | null; counts: string; pinned?: boolean; onPress: () => void; last?: boolean }) {
  const u = useUi();
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line, opacity: pressed ? 0.75 : 1 },
        pinned && { backgroundColor: c.bar, marginHorizontal: -24, paddingHorizontal: 24 },
      ]}
    >
      {mark !== undefined ? <Text style={{ width: 26, marginTop: 2, fontFamily: F.serifItalic, fontSize: fs(22), color: c.link }}>{mark}</Text> : null}
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontFamily: F.serifBold, fontSize: fs(21), lineHeight: fs(23), color: c.text }}>{title}</Text>
        {about ? <Text style={[u.soft, { color: c.muted }]}>{about}</Text> : null}
        <Text style={[u.muted, { color: c.soft }]}>
          {counts}
          {pinned ? <Text style={{ color: c.link }}> · pinned</Text> : null}
        </Text>
      </View>
    </Pressable>
  );
}

function Pinned({ p }: { p: Path }) {
  const u = useUi();
  const { c } = useTheme();
  const recap = useRecap();
  const audio = new Set((useAudiobooks().data ?? []).map((b) => b.id));
  const entries = p.entries ?? [];
  const total = entries.length || p.books.length;
  const share = total ? p.read / total : 0;
  const nextAt = entries.findIndex((e) => e.status !== 'read' && e.status !== 'dnf');
  const rail = entries.slice(Math.max(0, nextAt - 1), Math.max(0, nextAt - 1) + 5);
  const eta = recap.data?.path?.name === p.name ? recap.data.path.eta : null;
  return (
    <Pressable accessibilityRole="button" onPress={() => openPath(p.number)} style={{ gap: 14 }}>
      <View style={[u.row, { justifyContent: 'space-between', alignItems: 'baseline' }]}>
        <Text style={u.h2}>{p.name}</Text>
        <Text style={u.muted}>
          {p.pinned ? 'pinned · ' : ''}
          {p.read} of {total} read
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {rail.map((e, i) => {
          const now = entries.indexOf(e) === nextAt;
          const w = now ? 92 : 56;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={e.title} key={e.n} onPress={() => openBook(e.calibre_id)} style={{ alignItems: 'center', gap: 8, opacity: e.calibre_id ? 1 : 0.55 }}>
              <View style={now ? { borderRadius: 8, borderWidth: 3, borderColor: c.accent } : undefined}>
                <Cover id={e.calibre_id} title={e.title} hasCover={e.has_cover} width={w} height={w * 1.48} radius={6} plain={!now} />
              </View>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: e.status === 'read' || now ? c.accent : c.track }} />
            </Pressable>
          );
        })}
        {i_pad(rail.length)}
      </View>
      <View style={[u.row, { borderRadius: 18, backgroundColor: c.panel, padding: 14, gap: 14 }]}>
        <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 7, borderColor: c.track, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: -7, right: -7, top: -7, bottom: -7, borderRadius: 30, borderWidth: 7, borderColor: c.accent, borderRightColor: share > 0.25 ? c.accent : 'transparent', borderBottomColor: share > 0.5 ? c.accent : 'transparent', borderLeftColor: share > 0.75 ? c.accent : 'transparent', opacity: share > 0 ? 1 : 0 }} />
          <Text style={{ fontFamily: F.black, fontSize: 14, color: c.text }}>{Math.round(share * 100)}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>{eta ? `at your pace, done around ${eta}` : `${count(total - p.read, 'book')} to go`}</Text>
          <Text style={u.muted}>reading and listening both count</Text>
        </View>
      </View>
      <View>
        {entries.slice(Math.max(0, nextAt - 1), Math.max(0, nextAt - 1) + 4).map((e) => (
          <Pressable accessibilityRole="button" key={e.n} disabled={!e.calibre_id} onPress={() => openBook(e.calibre_id)} style={[u.row, u.line, { gap: 12, paddingVertical: 8, alignItems: 'flex-start' }]}>
            <Text style={{ width: 54, fontFamily: F.heavy, fontSize: 12, color: e.status === 'read' || entries.indexOf(e) === nextAt ? c.accent : c.muted }}>
              {e.status === 'read' ? 'read' : entries.indexOf(e) === nextAt ? 'now' : 'next'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: c.text }}>{e.title}</Text>
              <Text style={u.muted}>{[e.author, e.calibre_id ? (audio.has(e.calibre_id) ? 'audio ready' : 'on kindle') : 'to find'].filter(Boolean).join(' · ')}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

const i_pad = (n: number) => (n < 5 ? Array.from({ length: 5 - n }, (_, i) => <View key={`pad${i}`} style={{ width: 56 }} />) : null);

export function PathsBody() {
  const paths = usePaths();
  const sections = useSections();
  const [view, setView] = useState<'paths' | 'sections'>('paths');
  const cross = (paths.data ?? []).filter((p) => p.number != null).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const secs = sections.data ?? [];
  const current = view === 'paths' ? paths : sections;
  const pinned = cross.find((p) => p.pinned) ?? cross.find((p) => p.up_next);
  return (
    <>
      {pinned ? <Pinned p={pinned} /> : null}
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'paths', label: `paths · ${cross.length}` },
          { value: 'sections', label: `sections · ${secs.length}` },
        ]}
      />
      {current.error ? <ErrorBox error={current.error} onRetry={current.refresh} stale={!!current.data} /> : null}
      <View>
        {view === 'paths'
          ? cross.map((p, i) => (
              <Row
                key={p.name}
                mark={roman(p.number ?? i + 1)}
                title={p.name}
                about={p.description}
                counts={`${count(p.entries?.length ?? p.books.length, 'book')} · ${p.in_library ?? p.books.length} in library · ${p.read} read`}
                pinned={p.pinned}
                last={i === cross.length - 1}
                onPress={() => openPath(p.number)}
              />
            ))
          : secs.map((s, i) => (
              <Row
                key={s.name}
                title={s.title}
                about={s.description}
                counts={`${count(s.entries.length, 'book')} · ${s.in_library} in library · ${s.read} read`}
                pinned={s.pinned}
                last={i === secs.length - 1}
                onPress={() => openSection(s.name)}
              />
            ))}
        {!current.data && current.loading ? <Empty>loading…</Empty> : null}
      </View>
    </>
  );
}
