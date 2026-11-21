import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { openBook } from '../../../components/bits';
import { HighlightsBody } from '../../../components/reading/highlights';
import { LibraryBody } from '../../../components/library';
import { useLibrary } from '../../../components/shelf';
import { IssuesBody } from '../../../components/reading/issues';
import { PathsBody } from '../../../components/reading/paths';
import { swatch } from '../../../components/art';
import { Bar, Button, Chips, Cover, Empty, ErrorBox, Screen, SectionHead, useUi } from '../../../components/ui';
import { useAudiobooks, useHome, useRecap } from '../../../data';
import { clock } from '../../../format';
import { listen } from '../../../play';
import { refreshAll } from '../../../store';
import { F, fs, inkOn, S, useTheme } from '../../../theme';

const VIEWS = ['now', 'library', 'paths', 'highlights', 'issues'] as const;
type View_ = (typeof VIEWS)[number];

function Now({ onLibrary }: { onLibrary: () => void }) {
  const u = useUi();
  const { c } = useTheme();
  const home = useHome();
  const recap = useRecap();
  const books = useAudiobooks();
  const reading = home.data?.reading ?? [];
  const audio = new Set((books.data ?? []).map((b) => b.id));
  const [first, ...rest] = reading;
  const today = recap.data?.today;
  const tile = (value: string, label: string) => (
    <View style={{ flex: 1, borderRadius: 16, backgroundColor: c.panel, padding: 12 }}>
      <Text style={{ fontFamily: F.black, fontSize: fs(20), color: c.text }}>{value}</Text>
      <Text style={u.muted}>{label}</Text>
    </View>
  );
  if (home.error && !home.data) return <ErrorBox error={home.error} onRetry={home.refresh} />;
  if (!first)
    return home.loading ? (
      <Empty>loading…</Empty>
    ) : (
      <View style={{ gap: 12 }}>
        <Empty>nothing open on the kindle right now. pick a book in the library to read it here or on the kindle.</Empty>
        <Button label="open the library" icon="book" onPress={onLibrary} />
      </View>
    );
  const bg = swatch(String(first.calibre_id ?? first.title));
  const on = inkOn(bg);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => openBook(first.calibre_id)} style={{ borderRadius: 22, backgroundColor: bg, padding: 18, flexDirection: 'row', gap: 16 }}>
        <Cover id={first.calibre_id} title={first.title} width={110} height={162} radius={6} shadow />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), color: on.soft }}>continue</Text>
          <Text style={{ fontFamily: F.black, fontSize: fs(19), lineHeight: fs(22), color: on.ink }}>{first.title}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: on.soft }}>
            p. {first.page} of {first.pages}
          </Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: on.line }}>
            <View style={{ width: `${first.progress * 100}%`, height: 4, borderRadius: 2, backgroundColor: on.ink }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' }}>
            {first.calibre_id && audio.has(first.calibre_id) ? (
              <Pressable accessibilityRole="button" onPress={() => listen(first.calibre_id!)} hitSlop={4} style={{ flex: 1, height: 36, borderRadius: 18, backgroundColor: on.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.heavy, fontSize: fs(13), color: bg }}>listen</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`details of ${first.title}`} onPress={() => openBook(first.calibre_id)} hitSlop={4} style={{ flex: 1, height: 36, borderRadius: 18, borderWidth: 1, borderColor: on.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: on.ink }}>details</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {tile(today ? `${Math.round(today.reading / 60)} min` : '–', 'read today')}
        {tile(today ? `${Math.round(today.listening / 60)} min` : '–', 'heard today')}
        {tile(recap.data ? String(recap.data.streak) : '–', 'day streak')}
      </View>
      {rest.length ? (
        <View style={{ gap: 10 }}>
          <SectionHead title="also in progress" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.page }} contentContainerStyle={{ paddingHorizontal: S.page, gap: 12 }}>
            {rest.map((r) => (
              <Pressable accessibilityRole="button" key={`${r.calibre_id}-${r.title}`} onPress={() => openBook(r.calibre_id)} style={{ width: 112, gap: 6 }}>
                <Cover id={r.calibre_id} title={r.title} width={112} height={160} radius={6} />
                <Text numberOfLines={2} style={{ fontFamily: F.sansBold, fontSize: fs(13), color: c.text }}>
                  {r.title}
                </Text>
                <Bar value={r.progress} height={4} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

export default function Reading() {
  const u = useUi();
  const params = useLocalSearchParams<{ view?: View_ }>();
  const [view, setView] = useState<View_>(params.view && VIEWS.includes(params.view) ? params.view : 'now');
  const home = useHome();
  const lib = useLibrary();
  return (
    <Screen refreshing={home.loading && !!home.data} onRefresh={() => refreshAll()} gap={16}>
      <View style={[u.row, { justifyContent: 'space-between' }]}>
        <Text style={u.h1}>reading</Text>
        <Text style={u.muted}>{home.data?.last_sync ? `kindle synced ${clock(home.data.last_sync)}` : ''}</Text>
      </View>
      <Chips items={[...VIEWS]} value={view} onChange={(v) => setView(v as View_)} />
      {view === 'now' ? <Now onLibrary={() => setView('library')} /> : view === 'library' ? <LibraryBody lib={lib} /> : view === 'paths' ? <PathsBody /> : view === 'highlights' ? <HighlightsBody /> : <IssuesBody />}
    </Screen>
  );
}
