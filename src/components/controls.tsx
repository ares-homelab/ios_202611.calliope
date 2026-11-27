import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { setRate, setRepeat, setShuffle, setSleep, setSmart, usePlayer, type Sleep } from '../player';
import { nextRepeat, type Repeat } from '../queue';
import { F, fs, useTheme } from '../theme';
import { Icon } from './icon';

export const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

/** a bar you tap or drag; reports the share 0..1 on release. VoiceOver swipes it up and down by `step` */
export function Scrubber({ value, onSeek, color, track, height = 6, label, valueText, step = 0.05 }: { value: number; onSeek: (share: number) => void; color: string; track: string; height?: number; label: string; valueText?: string; step?: number }) {
  const width = useRef(1);
  const [drag, setDrag] = useState<number | null>(null);
  const share = (x: number) => Math.max(0, Math.min(1, x / width.current));
  const v = drag ?? value;
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText ?? `${Math.round(v * 100)}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onSeek(Math.max(0, Math.min(1, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
      onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => setDrag(share(e.nativeEvent.locationX))}
      onResponderMove={(e) => setDrag(share(e.nativeEvent.locationX))}
      onResponderRelease={(e) => {
        onSeek(share(e.nativeEvent.locationX));
        setDrag(null);
      }}
      onResponderTerminate={() => setDrag(null)}
      style={{ paddingVertical: 10 }}
    >
      <View pointerEvents="none" style={{ height: drag != null ? height + 4 : height, borderRadius: height, backgroundColor: track }}>
        <View style={{ width: `${Math.min(1, Math.max(0, v)) * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
      </View>
    </View>
  );
}

const RATES = [0.8, 1, 1.1, 1.25, 1.5, 1.75, 2];
export function RateButton({ rate, color }: { rate: number; color: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`speed ${rate}`} onPress={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1)} style={{ width: 52, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color }}>{rate % 1 ? String(rate) : rate.toFixed(1)}×</Text>
    </Pressable>
  );
}

export const sleepLabel = (s: Sleep) => (!s ? null : 'endOfTrack' in s ? 'end of chapter' : `${Math.max(1, Math.round((s.until - Date.now()) / 60000))} min`);

export function pickSleep(book: boolean) {
  const min = (m: number) => ({ text: `${m} minutes`, onPress: () => setSleep({ until: Date.now() + m * 60000 }) });
  Alert.alert('sleep timer', undefined, [
    min(15),
    min(30),
    min(45),
    min(60),
    { text: book ? 'end of chapter' : 'end of song', onPress: () => setSleep({ endOfTrack: true }) },
    { text: 'off', onPress: () => setSleep(null) },
    { text: 'cancel', style: 'cancel' },
  ]);
}

export function SleepButton({ sleep, book, color, active }: { sleep: Sleep; book: boolean; color: string; active: string }) {
  const { c } = useTheme();
  const label = sleepLabel(sleep);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ? `sleep timer, ${label}` : 'sleep timer, off'} onPress={() => pickSleep(book)} style={{ height: 44, minWidth: 44, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="moon" size={22} color={label ? active : color} />
      {label ? <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: label ? active : c.muted }}>{label}</Text> : null}
    </Pressable>
  );
}

const REPEAT_LABEL = { off: 'repeat off', all: 'repeat all', one: 'repeat one' } as const;

export function RepeatIcon({ repeat, size, color }: { repeat: Repeat; size: number; color: string }) {
  return (
    <View>
      <Icon name="repeat" size={size} color={color} />
      {repeat === 'one' ? <Text style={{ position: 'absolute', right: -5, top: -6, fontFamily: F.heavy, fontSize: size * 0.5, color }}>1</Text> : null}
    </View>
  );
}

/** apple music's three queue toggles: shuffle, repeat (off → all → one) and smart shuffle */
export function ModeButtons({ book }: { book: boolean }) {
  const { c } = useTheme();
  const s = usePlayer();
  const box = (on: boolean) => ({ flex: 1, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: 6, backgroundColor: on ? c.accent : c.raised });
  const fg = (on: boolean) => (on ? c.onAccent : c.text);
  const label = (on: boolean) => ({ fontFamily: F.sansBold, fontSize: fs(13), color: fg(on) });
  const rep = s.repeat !== 'off';
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {book ? null : (
        <Pressable accessibilityRole="switch" accessibilityLabel="shuffle" accessibilityState={{ checked: s.shuffle }} onPress={() => setShuffle(!s.shuffle)} style={box(s.shuffle)}>
          <Icon name="shuffle" size={18} color={fg(s.shuffle)} />
          <Text style={label(s.shuffle)}>shuffle</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="repeat" accessibilityValue={{ text: s.repeat }} onPress={() => setRepeat(nextRepeat(s.repeat))} style={box(rep)}>
        <RepeatIcon repeat={s.repeat} size={18} color={fg(rep)} />
        <Text style={label(rep)}>{REPEAT_LABEL[s.repeat].replace('repeat off', 'repeat')}</Text>
      </Pressable>
      {book ? null : (
        <Pressable accessibilityRole="switch" accessibilityLabel="smart shuffle" accessibilityState={{ checked: s.smart }} onPress={() => setSmart(!s.smart)} style={box(s.smart)}>
          <Icon name="sparkle" size={18} color={fg(s.smart)} />
          <Text style={label(s.smart)}>smart</Text>
        </Pressable>
      )}
    </View>
  );
}

/** small icons on the player for the modes that are on; tapping opens the queue where they're changed */
export function ModeBadges({ color, onPress }: { color: string; onPress: () => void }) {
  const s = usePlayer();
  const on = [s.shuffle && 'shuffle', s.repeat !== 'off' && REPEAT_LABEL[s.repeat], s.smart && 'smart shuffle', s.sleep && `sleep timer ${sleepLabel(s.sleep)}`].filter(Boolean) as string[];
  if (!on.length) return <View style={{ flex: 1 }} />;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${on.join(', ')}. open the queue`} onPress={onPress} hitSlop={6} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, height: 44 }}>
      {s.shuffle ? <Icon name="shuffle" size={16} color={color} /> : null}
      {s.repeat !== 'off' ? <RepeatIcon repeat={s.repeat} size={16} color={color} /> : null}
      {s.smart ? <Icon name="sparkle" size={16} color={color} /> : null}
      {s.sleep ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Icon name="moon" size={16} color={color} />
          <Text style={{ fontFamily: F.sansBold, fontSize: 11, color }}>{sleepLabel(s.sleep)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
