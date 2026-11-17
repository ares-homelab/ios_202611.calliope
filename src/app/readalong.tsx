import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, OfflineError } from '../api';
import { mmss } from '../components/controls';
import { Icon } from '../components/icon';
import { current, getPlayer, pause, usePlayer } from '../player';
import { F, fs, useTheme } from '../theme';
import { atTime, useBookText } from '../booktext';

/** a note on the sentence being read aloud; saved by ares into the book's vault note */
export default function ReadAlong() {
  const { c } = useTheme();
  const inset = useSafeAreaInsets();
  const s = usePlayer();
  const t = current(s);
  const text = useBookText(t);
  const [at] = useState(() => getPlayer().time);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const paras = text.data?.paras ?? [];
  const i = atTime(paras, at);
  const sentence = paras[i];
  const before = paras.slice(Math.max(0, i - 2), Math.max(0, i));
  if (!t || t.kind !== 'book') return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const save = async () => {
    setBusy(true);
    try {
      await api.note({ book_id: t.bookId!, track: t.n!, seconds: Math.round(at), text: note.trim(), quote: sentence?.text ?? '' });
      router.back();
    } catch (e) {
      Alert.alert(e instanceof OfflineError ? "can't reach ares" : 'not saved', e instanceof OfflineError ? 'the note stays here; try again when ares is reachable.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
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
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="your note"
            placeholderTextColor={c.muted}
            multiline
            autoFocus
            style={{ minHeight: 90, borderRadius: 12, backgroundColor: c.bg, color: c.text, padding: 12, fontFamily: F.sans, fontSize: fs(15), textAlignVertical: 'top' }}
          />
          <Pressable disabled={busy} onPress={save} style={{ height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
            <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: c.onAccent }}>{busy ? 'saving…' : 'save to vault'}</Text>
          </Pressable>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: c.muted }}>goes into this book&apos;s note in the vault, with the quote and the time.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
