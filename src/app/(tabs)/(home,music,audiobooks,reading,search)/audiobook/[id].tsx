import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { api, authHeaders } from '../../../../api';
import { voiceOf } from '../../../../components/bits';
import { Icon } from '../../../../components/icon';
import { BackBar, Button, Cover, ErrorBox, Screen, useUi } from '../../../../components/ui';
import { useAudiobook } from '../../../../data';
import { download, groupState, removeGroup, useDownloads } from '../../../../downloads';
import { hm, percent } from '../../../../format';
import { listen, playBook } from '../../../../play';
import { current, usePlayer } from '../../../../player';
import { F, fs, useTheme } from '../../../../theme';

export default function AudiobookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const u = useUi();
  const { c } = useTheme();
  const res = useAudiobook(Number(id));
  const player = usePlayer();
  const dl = useDownloads();
  const b = res.data;
  const t = current(player);
  const playingN = t?.kind === 'book' && t.bookId === Number(id) ? t.n : b?.resume?.track;
  const keys = (b?.tracks ?? []).map((x) => `b:${id}:${x.n}`);
  const saved = groupState(dl, id, keys);
  const ext = b?.source === 'kokoro' ? 'm4a' : 'mp3';
  const downloadAll = async () => {
    if (!b) return;
    try {
      for (const x of b.tracks ?? []) await download(`b:${id}:${x.n}`, api.trackUrl(b.id, x.n), ext, id, b.title, authHeaders());
    } catch (e) {
      Alert.alert('download stopped', (e as Error).message);
    }
  };
  const tonight = async () => {
    try {
      const r = await api.queueBook(Number(id));
      Alert.alert('ticked for tonight', `number ${r.position} of ${r.of} in the audio queue.`);
    } catch (e) {
      Alert.alert("can't reach ares", (e as Error).message);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="" />
      <Screen top={false} gap={16} refreshing={res.loading && !!b} onRefresh={res.refresh}>
        {res.error && !b ? <ErrorBox error={res.error} onRetry={res.refresh} /> : null}
        {b ? (
          <>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Cover id={b.id} title={b.title} width={110} height={162} radius={6} shadow />
              <View style={{ flex: 1, gap: 6, justifyContent: 'flex-end' }}>
                <Text style={{ fontFamily: F.black, fontSize: fs(22), lineHeight: fs(25), color: c.text }}>{b.title}</Text>
                <Text style={[u.soft, { color: c.accent }]}>{b.authors.join(', ')}</Text>
                <Text style={u.muted}>
                  {voiceOf(b)} · {hm(b.seconds / 3600)}
                  {b.resume?.progress ? ` · ${percent(b.resume.progress)} via ${b.resume.source}` : ''}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label={b.resume?.progress ? 'resume' : 'play'} icon="play" onPress={() => listen(b.id)} style={{ flex: 1, borderRadius: 21 }} />
              <Button
                label={saved.all ? 'downloaded' : saved.busy ? 'downloading' : saved.have ? `${saved.have}/${keys.length}` : 'download'}
                icon={saved.all ? 'downloaded' : 'download'}
                kind="outline"
                onPress={() => (saved.all ? Alert.alert('remove the download?', b.title, [{ text: 'cancel', style: 'cancel' }, { text: 'remove', style: 'destructive', onPress: () => removeGroup(id) }]) : downloadAll())}
                style={{ flex: 1, height: 44, borderRadius: 21 }}
              />
            </View>
            <View style={[u.row, { gap: 16 }]}>
              <Pressable onPress={() => router.push({ pathname: '/book/[id]', params: { id } })} hitSlop={6}>
                <Text style={u.link}>book details</Text>
              </Pressable>
              {b.source === 'kokoro' && !b.complete ? (
                <Pressable onPress={tonight} hitSlop={6}>
                  <Text style={u.link}>voice the rest tonight</Text>
                </Pressable>
              ) : null}
              {b.page ? (
                <Pressable onPress={() => Linking.openURL(b.page!)} hitSlop={6}>
                  <Text style={u.link}>recording page</Text>
                </Pressable>
              ) : null}
            </View>
            <View>
              {(b.tracks ?? []).map((x) => {
                const on = x.n === playingN;
                return (
                  <Pressable key={x.n} onPress={() => playBook(b.id, { track: x.n, seconds: 0 })} style={({ pressed }) => [u.row, u.line, { gap: 14, paddingVertical: 11, opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={{ width: 24, fontFamily: F.sans, fontSize: fs(14), color: on ? c.accent : c.muted }}>{x.n}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: on ? F.heavy : F.sansBold, fontSize: fs(15), color: on ? c.accent : c.text }}>{x.title}</Text>
                      <Text style={u.muted}>{hm(x.seconds / 3600)}</Text>
                    </View>
                    {dl.saved[`b:${id}:${x.n}`] ? <Icon name="downloaded" size={18} color={c.muted} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </Screen>
    </View>
  );
}
