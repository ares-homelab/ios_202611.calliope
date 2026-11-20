import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { api, type Audiobook, type Lib } from '../api';
import { useAudioQueue } from '../data';
import { useDownloads } from '../downloads';
import { listen } from '../play';
import { markOf, offlineGroup, openReader, removeOffline, saveOffline, useMarks } from '../read';
import { percent } from '../format';
import { Button, useUi } from './ui';

/** read (every epub or pdf), listen (with audio), voice it tonight (calliope without audio), keep it offline */
export function ReadActions({ lib, id, title, formats, audio }: { lib: Lib; id: number; title: string; formats: string[]; audio?: Audiobook }) {
  const u = useUi();
  const dl = useDownloads();
  const queue = useAudioQueue();
  useMarks();
  const [busy, setBusy] = useState(false);
  const readable = formats.some((f) => f === 'epub' || f === 'pdf');
  const group = offlineGroup(lib, id);
  const keys = Object.values(dl.saved).filter((s) => s.group === group);
  const saving = [...dl.busy].some((k) => k === group || k.startsWith(`p:${lib}:${id}:`));
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
      await saveOffline(await api.readInfo(lib, id));
    } catch (e) {
      Alert.alert("couldn't save it", (e as Error).message);
    } finally {
      setBusy(false);
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
            label={saving || busy ? 'saving…' : keys.length ? 'saved for offline' : 'save for offline'}
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
      {!readable ? <Text style={u.muted}>no epub or pdf of this book in calibre.</Text> : null}
    </View>
  );
}
