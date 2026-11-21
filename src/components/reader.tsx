import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Note, Run } from '../api';
import { F, fs, mix, COLORS, READER_SIZE, setReader, usePrefs, useTheme, type Spacing } from '../theme';
import { swatch } from './art';

export function tint(base: string, scheme: 'dark' | 'light') {
  return scheme === 'dark'
    ? { bg: mix(base, '#000000', 0.72), page: mix(base, '#000000', 0.55), ink: '#F3ECE8', past: mix('#F3ECE8', base, 0.45), mark: mix(base, '#000000', 0.25), text: '#FFFFFF', muted: mix('#FFFFFF', base, 0.35), track: mix(base, '#000000', 0.4), chip: mix(base, '#000000', 0.45) }
    : { bg: mix(base, '#FFFFFF', 0.82), page: '#FBF8F4', ink: '#211A16', past: mix('#211A16', '#FFFFFF', 0.45), mark: mix(base, '#FFFFFF', 0.7), text: '#160F0C', muted: mix('#160F0C', base, 0.4), track: mix(base, '#FFFFFF', 0.6), chip: mix(base, '#FFFFFF', 0.65) };
}
export type Tint = ReturnType<typeof tint>;

const DARK: Tint = { bg: '#0D0D0F', page: '#151518', ink: '#E6E6EA', past: '#7A7A82', mark: '#3A3A42', text: '#F4F4F6', muted: '#A0A0A9', track: '#33333A', chip: '#26262C' };

export const PAGES = ['book', 'dark', 'aegean'];

export function useReaderTint(seed: string): Tint {
  const { scheme } = useTheme();
  const page = usePrefs().reader.page;
  if (page === 'dark') return DARK;
  return page === 'aegean' ? tint(COLORS.dark.accent, 'dark') : tint(swatch(seed), scheme);
}

const Chip = ({ label, on, onPress, k, dot }: { label: string; on: boolean; onPress: () => void; k: Tint; dot?: string }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    accessibilityState={{ selected: on }}
    hitSlop={{ top: 5, bottom: 5 }}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: on ? k.text : k.chip }}
  >
    {dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} /> : null}
    <Text style={{ fontFamily: F.sansBold, fontSize: 13, color: on ? k.bg : k.text }}>{label}</Text>
  </Pressable>
);

const Row = ({ label, k, children }: { label: string; k: Tint; children: React.ReactNode }) => (
  <View style={{ gap: 8 }}>
    <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), color: k.muted }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</View>
  </View>
);

export function ReaderPanel({ k }: { k: Tint }) {
  const r = usePrefs().reader;
  const size = (d: number) => setReader({ size: Math.min(READER_SIZE.max, Math.max(READER_SIZE.min, r.size + d * READER_SIZE.step)) });
  const step = (label: string, d: number, off: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={d < 0 ? 'smaller text' : 'bigger text'}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={() => size(d)}
      hitSlop={{ top: 2, bottom: 2 }}
      style={{ width: 52, height: 40, borderRadius: 20, backgroundColor: k.chip, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.35 : 1 }}
    >
      <Text style={{ fontFamily: F.heavy, fontSize: d < 0 ? 14 : 20, color: k.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ marginHorizontal: 14, marginBottom: 10, padding: 14, gap: 14, borderRadius: 18, backgroundColor: k.page }}>
      <Row label="size" k={k}>
        {step('A−', -1, r.size <= READER_SIZE.min)}
        <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: k.text, minWidth: 28, textAlign: 'center' }}>{r.size}</Text>
        {step('A+', 1, r.size >= READER_SIZE.max)}
      </Row>
      <Row label="line spacing" k={k}>
        {(['tight', 'normal', 'loose'] as Spacing[]).map((x) => (
          <Chip key={x} label={x} on={r.spacing === x} onPress={() => setReader({ spacing: x })} k={k} />
        ))}
      </Row>
      <Row label="page" k={k}>
        {PAGES.map((x) => {
          const dot = x === 'aegean' ? COLORS.dark.accent : x === 'dark' ? '#0D0D0F' : undefined;
          return <Chip key={x} label={x} on={r.page === x} onPress={() => setReader({ page: x })} k={k} dot={dot} />;
        })}
      </Row>
    </View>
  );
}

const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

function font(base: string, r: Run) {
  const bold = r.b || base === F.heavy || base === F.heavyItalic;
  const italic = r.i || base === F.italic || base === F.heavyItalic;
  return bold && italic ? F.heavyItalic : bold ? F.heavy : italic ? F.italic : base;
}

/** a block's inline runs: italic, bold, superscripts (digits as real superscript characters), links, note marks */
export function Runs({ r, base, size, k, onNote }: { r: Run[]; base: string; size: number; k: Tint; onNote?: (key: string) => void }) {
  return (
    <>
      {r.map((x, j) => {
        const digits = x.sup && /^[0-9]+$/.test(x.t);
        const tap = x.note && onNote ? () => onNote(x.note!) : x.href ? () => Linking.openURL(x.href!).catch(() => {}) : undefined;
        return (
          <Text
            key={j}
            onPress={tap}
            suppressHighlighting={!tap}
            style={{ fontFamily: x.note ? F.heavy : font(base, x), fontSize: x.sup && !digits ? size * 0.7 : undefined, color: tap ? k.text : undefined, textDecorationLine: x.href ? 'underline' : undefined }}
          >
            {digits ? [...x.t].map((c) => SUP[c]).join('') : x.t}
          </Text>
        );
      })}
    </>
  );
}

/** a footnote over the text; the reader stays where it is */
export function NoteSheet({ note, k, size, line, onClose }: { note: Note | null; k: Tint; size: number; line: number; onClose: () => void }) {
  const inset = useSafeAreaInsets();
  return (
    <Modal visible={!!note} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="close the note" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ maxHeight: '60%', margin: 12, marginBottom: inset.bottom + 12, borderRadius: 18, backgroundColor: k.page, padding: 18, gap: 10 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), color: k.muted }}>note</Text>
          <ScrollView>
            <Text style={{ fontFamily: F.sans, fontSize: size * 0.9, lineHeight: line * 0.9, color: k.ink }}>{note?.r?.length ? <Runs r={note.r} base={F.sans} size={size * 0.9} k={k} /> : note?.t}</Text>
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: 'flex-end', minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: k.text }}>close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type BlockProps = { kind: string; t: string; r?: Run[] | null; k: Tint; size: number; line: number; image?: { uri: string; headers?: Record<string, string> }; onNote?: (key: string) => void };

/** one block of a book or article: headings, paragraphs, quotes, list items, captions, images; runs when the api sends them */
export function TextBlock({ kind, t, r, k, size, line, image, onNote }: BlockProps) {
  const body = (base: string, sz: number) => (r?.length ? <Runs r={r} base={base} size={sz} k={k} onNote={onNote} /> : t);
  if (kind === 'img')
    return image ? <Image source={image} contentFit="contain" style={{ width: '100%', aspectRatio: 1.5 }} accessibilityLabel={t} /> : t ? <Text style={{ fontFamily: F.italic, fontSize: size * 0.8, color: k.muted }}>[{t}]</Text> : null;
  if (/^h[1-6]$/.test(kind) || kind === 'h') {
    const lv = Number(kind[1]) || 3;
    const scale = lv <= 1 ? 1.45 : lv === 2 ? 1.3 : lv === 3 ? 1.15 : 1.05;
    return <Text style={{ fontFamily: F.heavy, fontSize: size * scale, lineHeight: size * scale * 1.25, color: k.text, marginTop: size * 0.6 }}>{body(F.heavy, size * scale)}</Text>;
  }
  if (kind === 'quote') return <Text style={{ fontFamily: F.italic, fontSize: size, lineHeight: line, color: k.ink, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: k.mark }}>{body(F.italic, size)}</Text>;
  if (kind === 'caption') return <Text style={{ fontFamily: F.sans, fontSize: size * 0.8, lineHeight: line * 0.8, color: k.muted }}>{body(F.sans, size * 0.8)}</Text>;
  if (kind === 'pre') return <Text style={{ fontFamily: F.sans, fontSize: size * 0.85, lineHeight: line * 0.9, color: k.ink }}>{body(F.sans, size * 0.85)}</Text>;
  return (
    <Text style={{ fontFamily: F.sans, fontSize: size, lineHeight: line, color: k.ink }}>
      {kind === 'li' ? '•  ' : null}
      {body(F.sans, size)}
    </Text>
  );
}
