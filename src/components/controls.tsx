import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { setRate, setSleep, type Sleep } from '../player';
import { F, fs, useTheme } from '../theme';
import { Icon } from './icon';

export const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

/** a bar you tap or drag; reports the share 0..1 on release */
export function Scrubber({ value, onSeek, color, track, height = 6 }: { value: number; onSeek: (share: number) => void; color: string; track: string; height?: number }) {
  const width = useRef(1);
  const [drag, setDrag] = useState<number | null>(null);
  const share = (x: number) => Math.max(0, Math.min(1, x / width.current));
  const v = drag ?? value;
  return (
    <View
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
    <Pressable accessibilityLabel={`speed ${rate}`} onPress={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1)} style={{ width: 52, height: 44, alignItems: 'center', justifyContent: 'center' }}>
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
    <Pressable accessibilityLabel="sleep timer" onPress={() => pickSleep(book)} style={{ height: 44, minWidth: 44, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="moon" size={22} color={label ? active : color} />
      {label ? <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: label ? active : c.muted }}>{label}</Text> : null}
    </Pressable>
  );
}
