import { router } from 'expo-router';
import { voiceOf } from '../../../components/bits';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../../../components/icon';
import { openShelf, RandomButton, ShelfLink, useLibrary } from '../../../components/shelf';
import { Chips, Cover, ErrorBox, Screen, SectionHead, useUi } from '../../../components/ui';
import { useAudiobook, useAudiobooks, useAudioQueue } from '../../../data';
import { percent } from '../../../format';
import { fandoms, find, hasStatus, hint, lists, sectionOf, STATUSES, title, vaultOrder, type Status } from '../../../shelves';
import { listen } from '../../../play';
import { current, usePlayer } from '../../../player';
import { F, fs, useTheme } from '../../../theme';

function Lane({ label, right, value, color }: { label: string; right: string; value: number; color: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{label}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{right}</Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.track }}>
        <View style={{ width: `${Math.min(1, value) * 100}%`, height: 4, borderRadius: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

function Current({ id }: { id: number }) {
  const u = useUi();
  const { c } = useTheme();
  const res = useAudiobook(id);
  const player = usePlayer();
  const b = res.data;
  if (!b) return null;
  const t = current(player);
  const mine = t?.kind === 'book' && t.bookId === id;
  const before = (b.tracks ?? []).slice(0, mine ? t!.n! - 1 : 0).reduce((a, x) => a + x.seconds, 0);
  const listened = mine ? (before + player.time) / Math.max(1, b.seconds) : (b.resume?.progress ?? 0);
  const kindle = b.resume?.progress ?? 0;
  const gap = Math.abs(listened - kindle);
  return (
    <Pressable onPress={() => listen(id)} style={({ pressed }) => [{ borderRadius: 18, backgroundColor: c.panel, padding: 14, flexDirection: 'row', gap: 14, opacity: pressed ? 0.85 : 1 }]}>
      <Cover id={id} title={b.title} width={80} height={118} radius={6} />
      <View style={{ flex: 1, gap: 7 }}>
        <Text style={{ fontFamily: F.heavy, fontSize: fs(17), lineHeight: fs(20), color: c.text }}>{b.title}</Text>
        <Text style={u.muted}>{voiceOf(b)}</Text>
        <Lane label="kindle" right={percent(kindle)} value={kindle} color={c.text} />
        <Lane label="listening" right={gap < 0.01 ? 'in sync' : percent(listened)} value={listened} color={c.accent} />
      </View>
    </Pressable>
  );
}

export default function Audiobooks() {
  const u = useUi();
  const { c } = useTheme();
  const lib = useLibrary();
  const res = useAudiobooks();
  const queue = useAudioQueue();
  const player = usePlayer();
  const t = current(player);
  const top = t?.kind === 'book' ? t.bookId : res.data?.[0]?.id;
  const ticked = (queue.data ?? []).filter((q) => q.kind === 'listening' || q.kind === 'tapped');
  const calliope = find(lib.root, 'calliope');
  const sections = calliope ? vaultOrder(calliope.children, lib.sections) : [];
  const shelves = lib.root.children.filter((n) => n.path !== 'calliope');
  const fanfic = fandoms(lib.items);
  const named = lists(lib.items, lib.lists);
  const count = (s: Status) => lib.items.filter((b) => b.lib === 'calliope' && hasStatus(b, s)).length;
  return (
    <Screen refreshing={lib.loading && !!lib.items.length} onRefresh={lib.refresh} gap={18}>
      <Text style={u.h1}>audiobooks</Text>
      {lib.error ? <ErrorBox error={lib.error} onRetry={lib.refresh} /> : null}
      {top ? <Current id={top} /> : null}
      <RandomButton scope="all" lib={lib} />
      <Chips items={STATUSES.map((s) => [s, `${title(`status:${s}`)} ${count(s)}`] as [string, string])} value="" onChange={(s) => openShelf(`status:${s}`)} />
      <View>
        <ShelfLink label="ready to listen" sub="human voice and ares voice" n={lib.audio.size} onPress={() => openShelf('audio')} />
        <ShelfLink label="the whole library" n={lib.items.length} onPress={() => openShelf('all')} />
      </View>
      {sections.length ? (
        <View>
          <SectionHead title="sections" />
          {sections.map((n) => (
            <ShelfLink key={n.path} label={title(`type:${n.path}`)} sub={sectionOf(n.path, lib.sections)?.summary} n={n.count} onPress={() => openShelf(`type:${n.path}`)} />
          ))}
        </View>
      ) : null}
      {shelves.length ? (
        <View>
          <SectionHead title="shelves" />
          {shelves.map((n) => (
            <ShelfLink key={n.path} label={n.name} sub={hint(n)} n={n.count} onPress={() => openShelf(`type:${n.path}`)} />
          ))}
        </View>
      ) : null}
      <View>
        <SectionHead title="lists" />
        {named.map((l) => (
          <ShelfLink key={l.name} label={l.name} n={l.n} onPress={() => openShelf(`list:${l.name}`)} />
        ))}
      </View>
      {fanfic.length ? (
        <View>
          <SectionHead title="fanfic" right="all" onPress={() => openShelf('fanfic')} />
          {fanfic.map((f) => (
            <ShelfLink key={f.name} label={f.name} n={f.n} onPress={() => openShelf(`fandom:${f.name}`)} />
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => router.push('/tonight')} style={({ pressed }) => [u.row, { borderRadius: 16, backgroundColor: c.panel, padding: 14, gap: 12, opacity: pressed ? 0.85 : 1 }]}>
        <Icon name="moon" size={22} color={c.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>tonight on ares</Text>
          <Text style={u.muted}>{ticked.length ? `${ticked.length} ${ticked.length === 1 ? 'book' : 'books'} ticked · kokoro runs 01:00–07:00` : 'nothing ticked · kokoro runs 01:00–07:00'}</Text>
        </View>
        <Text style={u.link}>pick</Text>
      </Pressable>
    </Screen>
  );
}
