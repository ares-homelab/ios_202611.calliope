import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { TrackArt } from '../components/art';
import { mmss, pickSleep, sleepLabel } from '../components/controls';
import { Icon } from '../components/icon';
import { Chip } from '../components/ui';
import { clearUpNext, current, jump, removeAt, setRepeat, setSmart, usePlayer } from '../player';
import { F, fs, useTheme } from '../theme';

export default function Queue() {
  const { c } = useTheme();
  const s = usePlayer();
  const t = current(s);
  const book = t?.kind === 'book';
  const rest = s.queue.map((x, i) => ({ x, i })).slice(s.index + 1);
  const eyebrow = { fontFamily: F.sansBold, fontSize: fs(12), color: c.muted, marginTop: 8 };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="close" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="down" size={22} color={c.text} />
        </Pressable>
        <Text style={{ fontFamily: F.heavy, fontSize: fs(16), color: c.text }}>up next</Text>
        <Pressable accessibilityRole="button" onPress={clearUpNext} style={{ width: 54, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: c.accent }}>clear</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 6 }}>
        {t ? (
          <>
            <Text style={eyebrow}>now playing</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
              <TrackArt t={t} size={48} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>
                  {t.title}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(13), color: c.muted }}>
                  {book ? `${t.album} · ${mmss(s.time)}` : t.artist}
                </Text>
              </View>
            </View>
          </>
        ) : null}
        {rest.length ? <Text style={eyebrow}>{book ? 'next in this book' : s.label ? `next from ${s.label}` : 'next'}</Text> : null}
        {rest.map(({ x, i }) => (
          <Pressable accessibilityRole="button" key={`${x.key}-${i}`} onPress={() => jump(i)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
            {book ? null : <TrackArt t={x} size={44} />}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>
                {x.title}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>
                {x.smart ? 'smart shuffle · ' : ''}
                {book ? `${Math.round(x.duration / 60)} min` : x.artist}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="remove from queue" onPress={() => removeAt(i)} hitSlop={8} style={{ padding: 6 }}>
              <Icon name="close" size={18} color={c.muted} />
            </Pressable>
          </Pressable>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <Chip label={`sleep · ${sleepLabel(s.sleep) ?? 'off'}`} on={!!s.sleep} onPress={() => pickSleep(!!book)} />
          {book ? null : <Chip label="smart shuffle" on={s.smart} onPress={() => setSmart(!s.smart)} />}
          <Chip label={s.repeat ? 'repeat on' : 'repeat off'} on={s.repeat} onPress={() => setRepeat(!s.repeat)} />
        </View>
      </ScrollView>
    </View>
  );
}
