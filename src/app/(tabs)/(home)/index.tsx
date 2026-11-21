import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Art, swatch } from '../../../components/art';
import { Icon } from '../../../components/icon';
import { Avatar, Button, Cover, ErrorBox, Screen, SectionHead, useUi } from '../../../components/ui';
import { useAudiobooks, useHome, useMixes, useRecap } from '../../../data';
import { clock, hm } from '../../../format';
import { listen, openContext } from '../../../play';
import { current, remaining, useHistory, usePlayer, type Context } from '../../../player';
import { refreshAll, useNet, useOutbox, type Pending } from '../../../store';
import { F, fs, inkOn, S, useTheme } from '../../../theme';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const pendingLabel = (p: Pending) =>
  p.kind === 'status'
    ? `${p.title} → ${p.workflow.toLowerCase()}`
    : p.kind === 'position'
        ? `listening position in ${p.title}`
        : p.kind === 'readpos'
          ? `reading place in ${p.title} → kindle`
          : p.label;

export function PickCard({ eyebrow, title, sub, color, onPress, width = 165 }: { eyebrow: string; title: string; sub: string; color: string; onPress: () => void; width?: number }) {
  const on = inkOn(color);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ width, height: 152, borderRadius: 14, backgroundColor: color, padding: 12, justifyContent: 'space-between', opacity: pressed ? 0.85 : 1 })}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), color: on.soft }}>{eyebrow}</Text>
      <View>
        <Text numberOfLines={3} style={{ fontFamily: F.black, fontSize: fs(17), lineHeight: fs(19), color: on.ink }}>
          {title}
        </Text>
        <Text numberOfLines={2} style={{ marginTop: 6, fontFamily: F.sansBold, fontSize: fs(12), color: on.soft }}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

function Recent({ h }: { h: Context }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => openContext(h)} style={{ width: 108, gap: 6 }}>
      {h.kind === 'book' ? <Cover id={h.bookId} title={h.title} width={108} height={108} radius={10} plain /> : <Art id={h.coverArt} seed={h.id} size={108} radius={10} />}
      <Text numberOfLines={2} style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: c.text }}>
        {h.title}
      </Text>
    </Pressable>
  );
}

export default function Home() {
  const u = useUi();
  const { c } = useTheme();
  const home = useHome();
  const recap = useRecap();
  const mixes = useMixes();
  const books = useAudiobooks();
  const history = useHistory();
  const player = usePlayer();
  const net = useNet();
  const outbox = useOutbox();
  const offline = net.online === false;
  const h = home.data;
  const r = recap.data;
  const month = MONTHS[new Date().getMonth()];
  const t = current(player);
  const lastBook = t?.kind === 'book' ? t : null;
  const ongoing = (books.data ?? []).find((b) => b.id !== lastBook?.bookId && b.resume && b.resume.progress > 0);

  const picks: { key: string; eyebrow: string; title: string; sub: string; color: string; onPress: () => void }[] = [];
  if (lastBook)
    picks.push({
      key: 'book',
      eyebrow: 'continue · audiobook',
      title: lastBook.album ?? lastBook.title,
      sub: `${hm(remaining(player) / 3600)} left · ${lastBook.title}`,
      color: swatch(String(lastBook.bookId)),
      onPress: () => listen(lastBook.bookId!),
    });
  else if (ongoing)
    picks.push({
      key: 'book',
      eyebrow: 'continue · audiobook',
      title: ongoing.title,
      sub: `${Math.round((ongoing.resume?.progress ?? 0) * 100)}% on the kindle`,
      color: swatch(String(ongoing.id)),
      onPress: () => listen(ongoing.id),
    });
  (mixes.data ?? []).forEach((m) =>
    picks.push({
      key: m.id,
      eyebrow: m.kind === 'daylist' ? 'daylist' : m.kind === 'cotd' ? 'card of the day' : 'made for you',
      title: m.title,
      sub: m.sub,
      color: m.color ?? swatch(m.id),
      onPress: () => router.push({ pathname: '/mix/[id]', params: { id: m.id } }),
    }),
  );

  const listening = r ? hm((r.music_seconds + r.audiobook_seconds) / 3600) : null;
  const reading = r ? hm(r.reading_seconds / 3600) : null;
  const top = r?.top.find((x) => x.kind === 'artist');
  const path = r?.path;

  return (
    <Screen refreshing={home.loading && !!h} onRefresh={() => refreshAll()} gap={22}>
      <View style={[u.row, { justifyContent: 'space-between' }]}>
        <Text accessibilityRole="header" style={u.h1}>home</Text>
        <Avatar />
      </View>

      {offline ? (
        <View style={{ backgroundColor: c.warnBg, borderColor: c.warnLine, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 }}>
          <View style={[u.row, { gap: 12 }]}>
            <Icon name="offline" size={20} color={c.warn} />
            <Text style={[u.body, { flex: 1, fontFamily: F.sansBold }]}>
              can&apos;t reach ares{home.at ? ` · saved ${clock(home.at)}` : ''}
            </Text>
          </View>
          <Text style={u.soft}>downloads still play. connect tailscale or come home to sync.</Text>
          {outbox.map((p, i) => (
            <Text key={i} style={u.muted}>
              waiting: {pendingLabel(p)}
            </Text>
          ))}
          <Button label="try again" kind="warn" onPress={() => refreshAll()} busy={home.loading} />
        </View>
      ) : home.error && !h ? (
        <ErrorBox error={home.error} onRetry={() => refreshAll()} />
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => router.push('/recap')} style={({ pressed }) => [u.row, { borderRadius: 16, backgroundColor: c.panel, padding: 14, gap: 14, opacity: pressed ? 0.85 : 1 }]}>
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.black, fontSize: fs(13), color: c.onAccent }}>{month.slice(0, 3)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>your {month} so far</Text>
          <Text style={u.soft}>{[listening && `${listening} listening`, reading && `${reading} reading`, top && `top: ${top.name}`].filter(Boolean).join(' · ') || 'listening and reading this month'}</Text>
          {path ? (
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: c.accent, marginTop: 2 }}>
              {path.name} path · {path.eta ? `done around ${path.eta} at your pace` : `${path.read} of ${path.total} read`}
            </Text>
          ) : null}
        </View>
        <Icon name="next" size={20} color={c.muted} />
      </Pressable>

      {history.length ? (
        <View style={{ gap: 10 }}>
          <SectionHead title="recently played" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.page }} contentContainerStyle={{ paddingHorizontal: S.page, gap: 12 }}>
            {history.slice(0, 10).map((x) => (
              <Recent key={`${x.kind}-${x.id}`} h={x} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {picks.length ? (
        <View style={{ gap: 10 }}>
          <SectionHead title="top picks for you" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.page }} contentContainerStyle={{ paddingHorizontal: S.page, gap: 12 }}>
            {picks.map(({ key, ...p }) => (
              <PickCard key={key} {...p} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Screen>
  );
}
