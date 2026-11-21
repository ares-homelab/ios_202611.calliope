import { reschedule, syncBackground } from '../../notify';
import type { NotifyPrefs } from '../../notify-defaults';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar, BackBar, Screen, useUi } from '../../components/ui';
import { useConfig } from '../../config';
import { useAudioQueue, useHome, useMixes, useWanted } from '../../data';
import { totalBytes, useDownloads } from '../../downloads';
import { clock, count } from '../../format';
import { nd } from '../../navidrome';
import { clearCache, refreshAll, useNet } from '../../store';
import { F, fs, getPrefs, setPrefs, usePrefs, useTheme, type Mode, type Quality } from '../../theme';
import { Icon } from '../../components/icon';

type Row = { label: string; value?: string; dot?: 'ok' | 'off'; onPress?: () => void; on?: boolean };

function Group({ title, rows }: { title: string; rows: Row[] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ marginTop: 6, fontFamily: F.sansBold, fontSize: fs(12), color: c.muted }}>{title}</Text>
      <View style={{ borderRadius: 14, backgroundColor: c.panel, paddingHorizontal: 14 }}>
        {rows.map((r, i) => (
          <Fragment key={r.label}>
            <Pressable accessibilityRole={r.on != null ? 'switch' : r.onPress ? 'button' : undefined} accessibilityState={r.on != null ? { checked: r.on } : undefined} onPress={r.onPress} disabled={!r.onPress} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ flexShrink: 1, fontFamily: F.sans, fontSize: fs(15), color: c.text }}>{r.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: '55%' }}>
                {r.dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.dot === 'ok' ? c.ok : c.warn }} /> : null}
                {r.value ? (
                  <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(14), color: c.muted, flexShrink: 1 }}>
                    {r.value}
                  </Text>
                ) : null}
                {r.onPress ? <Icon name="next" size={18} color={c.muted} /> : null}
              </View>
            </Pressable>
            {i < rows.length - 1 ? <View style={{ height: 1, backgroundColor: c.line }} /> : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const pick = <T extends string>(title: string, options: [T, string][], onPick: (v: T) => void) =>
  Alert.alert(title, undefined, [...options.map(([v, label]) => ({ text: label, onPress: () => onPick(v) })), { text: 'cancel', style: 'cancel' as const }]);

const QUALITY: [Quality, string][] = [
  ['original', 'lossless (original file)'],
  ['320', '320 kbps'],
  ['192', '192 kbps'],
  ['128', '128 kbps'],
];
const CROSSFADE: [string, string][] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => [String(n), n ? `${n} s` : 'off']);
const TIMES = (t: string[]): [string, string][] => [['off', 'off'], ...t.map((x): [string, string] => [x, x])];
const notify = (next: Partial<NotifyPrefs>) => {
  setPrefs({ notify: { ...getPrefs().notify, ...next } });
  reschedule().catch(() => {});
  syncBackground().catch(() => {});
};
const qLabel = (q: Quality) => (q === 'original' ? 'lossless' : `${q} kbps`);
const gb = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.round(b / 1e6)} MB`);

export default function Settings() {
  const u = useUi();
  const { c } = useTheme();
  const prefs = usePrefs();
  const cfg = useConfig();
  const net = useNet();
  const home = useHome();
  const queue = useAudioQueue();
  const wanted = useWanted();
  const mixes = useMixes();
  const dl = useDownloads();
  const tonight = (queue.data ?? []).filter((q) => q.kind === 'listening' || q.kind === 'tapped').length;
  const cotd = (mixes.data ?? []).some((m) => m.kind === 'cotd');
  const clear = () =>
    Alert.alert('clear the offline copy?', 'saved lists and covers on this iphone are fetched again from ares. downloads stay.', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'clear',
        style: 'destructive',
        onPress: async () => {
          clearCache();
          await Image.clearDiskCache();
          refreshAll();
        },
      },
    ]);
  const modeLabel: Record<Mode, string> = { system: 'follows iphone', dark: 'dark', light: 'light' };
  const section = (title: string, rows: Row[]): ReactNode => <Group title={title} rows={rows} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="" right={<Text accessibilityRole="header" pointerEvents="none" style={[u.body, { fontFamily: F.heavy, position: 'absolute', left: 0, right: 0, textAlign: 'center' }]}>account</Text>} />
      <Screen top={false} gap={12}>
        <View style={[u.row, { gap: 14, marginBottom: 4 }]}>
          <Avatar size={64} />
          <View>
            <Text style={{ fontFamily: F.black, fontSize: fs(20), color: c.text }}>{prefs.name}</Text>
            <Text style={u.muted}>calliope · music, audiobooks, reading</Text>
          </View>
        </View>
        {section('connections', [
          { label: 'ares', value: net.online === false ? 'not reachable' : cfg.token ? 'connected' : 'no token yet', dot: net.online === false || !cfg.token ? 'off' : 'ok', onPress: () => router.push('/settings/connection') },
          { label: 'navidrome', value: nd.ready() ? `${cfg.nd.user} · music` : 'not signed in', dot: nd.ready() ? 'ok' : 'off', onPress: () => router.push('/settings/connection') },
          { label: 'kindle', value: home.data?.last_sync ? `synced ${clock(home.data.last_sync)}` : 'not synced yet', dot: home.data?.last_sync ? 'ok' : 'off' },
          { label: 'familiar', value: cotd ? 'card of the day on' : 'card of the day off', onPress: () => router.push({ pathname: '/mix/[id]', params: { id: 'cotd' } }) },
        ])}
        {section('library', [
          { label: 'wanted from apple music & plays', value: wanted.data ? count(wanted.data.total, 'song') : undefined, onPress: () => router.push('/wanted') },
          { label: 'tonight on ares', value: tonight ? `${count(tonight, 'book')} ticked` : 'nothing ticked', onPress: () => router.push('/tonight') },
          { label: 'downloads', value: `${gb(totalBytes(dl))} on this iphone`, onPress: () => router.push('/settings/downloads') },
          {
            label: 'kindle sync',
            value: prefs.kosyncWrite ? 'read and write' : 'read only',
            onPress: () =>
              pick('kindle sync', [['write', 'read and write: the phone’s place goes to the kindle'], ['read', 'read only: open at the kindle’s place, keep mine here']], (v) => setPrefs({ kosyncWrite: v === 'write' })),
          },
        ])}
        {section('playback', [
          { label: 'quality on wi-fi', value: qLabel(prefs.wifi), onPress: () => pick('quality on wi-fi', QUALITY, (wifi) => setPrefs({ wifi })) },
          { label: 'quality on cellular', value: qLabel(prefs.cellular), onPress: () => pick('quality on cellular', QUALITY, (cellular) => setPrefs({ cellular })) },
          { label: 'lyrics', value: prefs.lrclib ? 'tags, then LRCLIB' : 'tags only', onPress: () => setPrefs({ lrclib: !prefs.lrclib }) },
          { label: 'crossfade', value: prefs.crossfade ? `${prefs.crossfade} s` : 'off', onPress: () => pick('crossfade', CROSSFADE, (v) => setPrefs({ crossfade: Number(v) })) },
        ])}
        {section('notifications', [
          { label: 'reading reminder', value: prefs.notify.reading, onPress: () => pick('reading reminder', TIMES(['19:00', '20:00', '21:00', '22:00', '23:00']), (reading) => notify({ reading })) },
          { label: 'card of the day', value: prefs.notify.card, onPress: () => pick('card of the day', TIMES(['07:00', '08:00', '09:00', '10:00', '12:00']), (card) => notify({ card })) },
          { label: 'new yorker on mondays', value: prefs.notify.issues ? 'on' : 'off', on: prefs.notify.issues, onPress: () => notify({ issues: !prefs.notify.issues }) },
          { label: 'audiobook ready', value: prefs.notify.audiobooks ? 'on' : 'off', on: prefs.notify.audiobooks, onPress: () => notify({ audiobooks: !prefs.notify.audiobooks }) },
        ])}
        {section('appearance', [
          {
            label: 'theme',
            value: modeLabel[prefs.mode],
            onPress: () =>
              pick<Mode>('theme', [
                ['system', 'follows iphone'],
                ['dark', 'dark'],
                ['light', 'light'],
              ], (mode) => setPrefs({ mode })),
          },
        ])}
        {section('app', [
          { label: 'offline copy', value: net.syncedAt ? `saved ${clock(net.syncedAt)}` : 'saved copy', onPress: clear },
          { label: 'version', value: `${Constants.expoConfig?.version ?? '?'} · marsign` },
        ])}
      </Screen>
    </View>
  );
}
