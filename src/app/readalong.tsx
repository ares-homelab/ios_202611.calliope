import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, OfflineError } from '../api';
import { mmss } from '../components/controls';
import { Icon } from '../components/icon';
import { current, getPlayer, pause, playbackMode, usePlayer } from '../player';
import { F, fs, useTheme } from '../theme';
import { atTime, useBookText } from '../booktext';
import { sendVoice, transcript, VOICE } from '../voice';

type Heard = { state: 'sending' | 'transcribing' | 'done' | 'failed' | 'queued'; text?: string };

/** a note on the sentence being read aloud, typed or spoken; saved by ares into the book's vault note */
export default function ReadAlong() {
  const { c } = useTheme();
  const inset = useSafeAreaInsets();
  const s = usePlayer();
  const t = current(s);
  const text = useBookText(t);
  const recorder = useAudioRecorder(VOICE);
  const rec = useAudioRecorderState(recorder, 250);
  const [at] = useState(() => getPlayer().time);
  const [note, setNote] = useState('');
  const [clip, setClip] = useState<{ uri: string; ms: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<Heard | null>(null);
  const paras = text.data?.paras ?? [];
  const i = atTime(paras, at);
  const sentence = paras[i];
  const before = paras.slice(Math.max(0, i - 2), Math.max(0, i));
  if (!t || t.kind !== 'book') return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const record = async () => {
    if (rec.isRecording) {
      await recorder.stop();
      await playbackMode();
      if (recorder.uri) setClip({ uri: recorder.uri, ms: rec.durationMillis });
      return;
    }
    if (!(await requestRecordingPermissionsAsync()).granted) {
      Alert.alert('microphone is off', 'turn it on for calliope in the iphone settings to record voice notes.');
      return;
    }
    pause();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setClip(null);
  };

  const save = async () => {
    if (rec.isRecording) await record();
    setBusy(true);
    try {
      const r = await api.note({ book_id: t.bookId!, track: t.n!, seconds: Math.round(at), text: note.trim(), quote: sentence?.text ?? '', voice: !!clip });
      if (!clip) return router.back();
      setHeard({ state: 'sending' });
      if (!(await sendVoice(r.id, clip.uri))) return setHeard({ state: 'queued' });
      setHeard({ state: 'transcribing' });
      const out = await transcript(r.id);
      setHeard(out ? { state: out.state === 'done' ? 'done' : 'failed', text: out.text } : { state: 'transcribing' });
    } catch (e) {
      Alert.alert(e instanceof OfflineError ? "can't reach ares" : 'not saved', e instanceof OfflineError ? 'the note stays here; try again when ares is reachable.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const status = heard
    ? {
        sending: 'sending the recording to ares…',
        transcribing: 'transcribing on ares… it goes to the vault either way.',
        done: 'saved. this goes into the vault with the recording:',
        failed: "saved with the recording; ares couldn't transcribe it.",
        queued: "saved. the recording waits on this iphone and goes to ares when it's reachable.",
      }[heard.state]
    : null;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg, paddingTop: inset.top + 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        <Pressable accessibilityLabel="close" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} color={c.text} />
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>
          {t.title}
        </Text>
        {s.playing ? (
          <Pressable onPress={pause} hitSlop={8}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: c.accent }}>pause</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontFamily: F.sans, fontSize: fs(17), lineHeight: fs(25), color: c.muted }}>
          {before.map((x) => x.text).join(' ')}{' '}
          <Text style={{ color: c.text, fontFamily: F.sansBold }}>{sentence?.text ?? (text.loading ? 'loading…' : '')}</Text>
        </Text>
        <View style={{ borderRadius: 16, backgroundColor: c.panel, padding: 14, gap: 10 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 11, letterSpacing: 0.7, color: c.accent }}>
            NOTE AT {mmss(at)} · {t.title.toUpperCase()}
          </Text>
          {sentence ? (
            <Text style={{ fontFamily: F.italic, fontSize: fs(14), color: c.soft }} numberOfLines={3}>
              “{sentence.text}”
            </Text>
          ) : null}
          {heard ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: c.muted }}>{status}</Text>
              {heard.text ? <Text style={{ fontFamily: F.sans, fontSize: fs(15), lineHeight: fs(22), color: c.text }}>{heard.text}</Text> : null}
              <Pressable onPress={() => router.back()} style={{ height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: c.onAccent }}>done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={clip ? 'add to the voice note (optional)' : 'your note, or record one'}
                placeholderTextColor={c.muted}
                multiline
                style={{ minHeight: 90, borderRadius: 12, backgroundColor: c.bg, color: c.text, padding: 12, fontFamily: F.sans, fontSize: fs(15), textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  accessibilityLabel={rec.isRecording ? 'stop recording' : 'record a voice note'}
                  onPress={record}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: rec.isRecording ? c.accent : c.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={rec.isRecording ? { width: 14, height: 14, borderRadius: 3, backgroundColor: c.onAccent } : { width: 16, height: 16, borderRadius: 8, backgroundColor: c.accent }} />
                </Pressable>
                <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), color: rec.isRecording ? c.text : c.muted }}>
                  {rec.isRecording ? `recording ${mmss(rec.durationMillis / 1000)} · tap to stop` : clip ? `voice note ${mmss(clip.ms / 1000)} · tap to record again` : 'record a voice note'}
                </Text>
                {clip && !rec.isRecording ? (
                  <Pressable onPress={() => setClip(null)} hitSlop={8}>
                    <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: c.muted }}>remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                disabled={busy || (!note.trim() && !clip && !rec.isRecording)}
                onPress={save}
                style={{ height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: busy || (!note.trim() && !clip && !rec.isRecording) ? 0.6 : 1 }}>
                <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: c.onAccent }}>{busy ? 'saving…' : 'save to vault'}</Text>
              </Pressable>
              <Text style={{ fontFamily: F.sans, fontSize: 12, color: c.muted }}>
                goes into this book&apos;s note in the vault, with the quote and the time. voice notes are transcribed on ares and keep the recording.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
