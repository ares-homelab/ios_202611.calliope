import { Pressable, Text, View } from 'react-native';
import { F, mix, PALETTES, READER_SIZE, setReader, usePrefs, useTheme, type Spacing } from '../theme';
import { swatch } from './art';

export function tint(base: string, scheme: 'dark' | 'light') {
  return scheme === 'dark'
    ? { bg: mix(base, '#000000', 0.72), page: mix(base, '#000000', 0.55), ink: '#F3ECE8', past: mix('#F3ECE8', base, 0.45), mark: mix(base, '#000000', 0.25), text: '#FFFFFF', muted: mix('#FFFFFF', base, 0.35), track: mix(base, '#000000', 0.4), chip: mix(base, '#000000', 0.45) }
    : { bg: mix(base, '#FFFFFF', 0.82), page: '#FBF8F4', ink: '#211A16', past: mix('#211A16', '#FFFFFF', 0.45), mark: mix(base, '#FFFFFF', 0.7), text: '#160F0C', muted: mix('#160F0C', base, 0.4), track: mix(base, '#FFFFFF', 0.6), chip: mix(base, '#FFFFFF', 0.65) };
}
export type Tint = ReturnType<typeof tint>;

const DARK: Tint = { bg: '#0D0D0F', page: '#151518', ink: '#E6E6EA', past: '#7A7A82', mark: '#3A3A42', text: '#F4F4F6', muted: '#A0A0A9', track: '#33333A', chip: '#26262C' };

export const PAGES = ['book', 'dark', ...PALETTES.map((p) => p.id)];

export function useReaderTint(seed: string): Tint {
  const { scheme } = useTheme();
  const page = usePrefs().reader.page;
  if (page === 'dark') return DARK;
  const pal = PALETTES.find((p) => p.id === page);
  return pal ? tint(pal.dark.accent, 'dark') : tint(swatch(seed), scheme);
}

const Chip = ({ label, on, onPress, k, dot }: { label: string; on: boolean; onPress: () => void; k: Tint; dot?: string }) => (
  <Pressable
    onPress={onPress}
    accessibilityState={{ selected: on }}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: on ? k.text : k.chip }}
  >
    {dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} /> : null}
    <Text style={{ fontFamily: F.sansBold, fontSize: 13, color: on ? k.bg : k.text }}>{label}</Text>
  </Pressable>
);

const Row = ({ label, k, children }: { label: string; k: Tint; children: React.ReactNode }) => (
  <View style={{ gap: 8 }}>
    <Text style={{ fontFamily: F.heavy, fontSize: 11, letterSpacing: 0.7, color: k.muted }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</View>
  </View>
);

export function ReaderPanel({ k }: { k: Tint }) {
  const r = usePrefs().reader;
  const size = (d: number) => setReader({ size: Math.min(READER_SIZE.max, Math.max(READER_SIZE.min, r.size + d * READER_SIZE.step)) });
  const step = (label: string, d: number, off: boolean) => (
    <Pressable
      accessibilityLabel={d < 0 ? 'smaller text' : 'bigger text'}
      disabled={off}
      onPress={() => size(d)}
      style={{ width: 52, height: 40, borderRadius: 20, backgroundColor: k.chip, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.35 : 1 }}
    >
      <Text style={{ fontFamily: F.heavy, fontSize: d < 0 ? 14 : 20, color: k.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ marginHorizontal: 14, marginBottom: 10, padding: 14, gap: 14, borderRadius: 18, backgroundColor: k.page }}>
      <Row label="SIZE" k={k}>
        {step('A−', -1, r.size <= READER_SIZE.min)}
        <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: k.text, minWidth: 28, textAlign: 'center' }}>{r.size}</Text>
        {step('A+', 1, r.size >= READER_SIZE.max)}
      </Row>
      <Row label="LINE SPACING" k={k}>
        {(['tight', 'normal', 'loose'] as Spacing[]).map((x) => (
          <Chip key={x} label={x} on={r.spacing === x} onPress={() => setReader({ spacing: x })} k={k} />
        ))}
      </Row>
      <Row label="PAGE" k={k}>
        {PAGES.map((x) => {
          const pal = PALETTES.find((p) => p.id === x);
          return <Chip key={x} label={x} on={r.page === x} onPress={() => setReader({ page: x })} k={k} dot={pal ? pal.dark.accent : x === 'dark' ? '#0D0D0F' : undefined} />;
        })}
      </Row>
    </View>
  );
}
