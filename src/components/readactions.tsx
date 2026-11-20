import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { api, type Audiobook, type Lib } from '../api';
import { useAudioQueue } from '../data';
import { fmtBytes, useDownloads } from '../downloads';
import { listen } from '../play';
import { imagePrefix, markOf, offlineGroup, openReader, removeImages, removeOffline, saveImages, saveOffline, useMarks } from '../read';
import { percent } from '../format';
import { useTheme } from '../theme';
import { Button, useUi } from './ui';

/** read (every epub or pdf), listen (with audio), voice it tonight (calliope without audio), keep it offline */
export function ReadActions({ lib, id, title, formats, audio }: { lib: Lib; id: number; title: string; formats: string[]; audio?: Audiobook }) {
  const u = useUi();
  const { c } = useTheme();
  const dl = useDownloads();
  const [withImages, setWithImages] = useState(false);
  const queue = useAudioQueue();
  useMarks();
  const [busy, setBusy] = useState(false);
  const readable = formats.some((f) => f === 'epub' || f === 'pdf');
  const group = offlineGroup(lib, id);
  const keys = Object.values(dl.saved).filter((s) => s.group === group);
  const saving = [...dl.busy].some((k) => k === group || k.startsWith(`p:${lib}:${id}:`) || k.startsWith(imagePrefix(lib, id)));
  const images = keys.filter((k) => k.key.startsWith(imagePrefix(lib, id)));
  const bytes = keys.reduce((a, k) => a + k.bytes, 0);
  const epub = formats.includes('epub');
  const mark = markOf(lib, id);
  const queued = (queue.data ?? []).find((q) => q.id === id);

  const offline = async () => {
    if (keys.length && !saving)
      return Alert.alert('remove the offline copy?', title, [
        { text: 'cancel', style: 'cancel' },
        { text: 'remove', style: 'destructive', onPress: () => removeOffline(lib, id) },
      ]);
    setBusy(true);
    try {
      await saveOffline(await api.readInfo(lib, id), withImages);
    } catch (e) {
      Alert.alert("couldn't save it", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggleImages = async (on: boolean) => {
    if (!keys.length) return setWithImages(on);
    if (!on) return removeImages(lib, id, images.map((k) => k.key));
    try {
      const failed = await saveImages(lib, id);
      if (failed) Alert.alert('some images are missing', `${failed} couldn't be fetched; try again when ares is reachable.`);
    } catch (e) {
      Alert.alert("couldn't save the images", (e as Error).message);
    }
  };
  const tonight = () =>
    api.queueBook(id).then(
      (r) => (queue.refresh(), Alert.alert('ticked for tonight', `number ${r.position} of ${r.of} in the audio queue. kokoro runs 01:00–07:00.`)),
      (e: Error) => Alert.alert("can't reach ares", e.message),
    );

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {readable ? <Button label={mark ? `read · ${percent(mark.s)}` : 'read'} icon="book" onPress={() => openReader(lib, id)} style={{ flex: 1, height: 52, borderRadius: 14 }} /> : null}
        {audio ? (
          <Button label={audio.source === 'kokoro' && !audio.complete ? 'listen · more tonight' : 'listen'} icon="headphones" kind={readable ? 'outline' : 'primary'} onPress={() => listen(audio.id)} style={{ flex: 1, height: 52, borderRadius: 14 }} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {readable ? (
          <Button
            label={saving || busy ? 'saving…' : keys.length ? `saved · ${fmtBytes(bytes)}` : 'save for offline'}
            icon={keys.length && !saving ? 'downloaded' : 'download'}
            kind="outline"
            onPress={offline}
            style={{ flex: 1, height: 44, borderRadius: 14 }}
          />
        ) : null}
        {!audio && lib === 'calliope' ? (
          <Button label={queued ? `tonight · #${queued.position}` : 'queue for tonight'} icon="moon" kind="outline" onPress={tonight} style={{ flex: 1, height: 44, borderRadius: 14 }} />
        ) : null}
      </View>
      {readable && epub ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[u.muted, { flex: 1 }]}>
            {keys.length ? (images.length ? `offline with ${images.length} ${images.length === 1 ? 'image' : 'images'}` : 'offline copy is text only') : 'save with images'}
          </Text>
          <Switch accessibilityLabel="with images" value={keys.length ? images.length > 0 : withImages} onValueChange={toggleImages} disabled={saving || busy} trackColor={{ true: c.accent }} />
        </View>
      ) : null}
      {!readable ? <Text style={u.muted}>no epub or pdf of this book in calibre.</Text> : null}
    </View>
  );
}
