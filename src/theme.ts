import { useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { readJson, writeJson } from './files';
import { NOTIFY_DEFAULTS, type NotifyPrefs } from './notify-defaults';

export type Colors = {
  bg: string;
  panel: string;
  raised: string;
  selected: string;
  bar: string;
  text: string;
  soft: string;
  muted: string;
  line: string;
  track: string;
  trackOn: string;
  accent: string;
  onAccent: string;
  link: string;
  progress: string;
  ok: string;
  warn: string;
  warnBg: string;
  warnLine: string;
  dnf: string;
  tbr: string;
  coverEdge: string;
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) =>
  '#' + hex(a).map((x, i) => Math.round(x + (hex(b)[i] - x) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** text on a coloured card (swatches, mix colours): white on dark ones, ink on light ones, both above 4.5:1 */
export const inkOn = (bg: string) => {
  const ink = lum(bg) > 0.18 ? '#1A1510' : '#FFFFFF';
  return { ink, soft: mix(ink, bg, 0.12), line: mix(ink, bg, 0.6) };
};

const dark = (accent: string): Colors => ({
  bg: '#0D0D0F',
  panel: '#1A1A1E',
  raised: '#26262C',
  selected: '#303037',
  bar: '#151518',
  text: '#F4F4F6',
  soft: '#CACAD1',
  muted: '#A0A0A9',
  line: '#2A2A30',
  track: '#33333A',
  trackOn: mix('#33333A', accent, 0.45),
  accent,
  onAccent: '#0D0D0F',
  link: accent,
  progress: accent,
  ok: '#6FBF7E',
  warn: '#E8A06A',
  warnBg: '#2A1F17',
  warnLine: '#4D3826',
  dnf: '#B07A6A',
  tbr: '#4A4A52',
  coverEdge: 'rgba(255,255,255,0.08)',
});

const light = (accent: string): Colors => ({
  bg: '#FFFFFF',
  panel: '#F2F2F5',
  raised: '#E9E9EE',
  selected: '#FFFFFF',
  bar: '#F7F7F9',
  text: '#111114',
  soft: '#3C3C44',
  muted: '#62626B',
  line: '#E1E1E6',
  track: '#DADAE0',
  trackOn: mix('#DADAE0', accent, 0.45),
  accent,
  onAccent: '#FFFFFF',
  link: accent,
  progress: accent,
  ok: '#357A42',
  warn: '#A8643A',
  warnBg: '#F7EBE1',
  warnLine: '#E6CDB6',
  dnf: '#A0604F',
  tbr: '#BDBDC5',
  coverEdge: 'rgba(0,0,0,0.08)',
});

const ACCENT = { dark: '#8FB8E0', light: '#2C5A85' };
export const COLORS = { dark: dark(ACCENT.dark), light: light(ACCENT.light) };

export type Mode = 'dark' | 'light' | 'system';
export type Quality = 'original' | '320' | '192' | '128';
export type Spacing = 'tight' | 'normal' | 'loose';
export type Reader = { size: number; spacing: Spacing; page: string };
type Prefs = { mode: Mode; v?: number; wifi: Quality; cellular: Quality; lrclib: boolean; name: string; crossfade: number; notify: NotifyPrefs; reader: Reader; kosyncWrite: boolean };

export const READER_SIZE = { min: 14, max: 32, step: 2 };
export const LINE: Record<Spacing, number> = { tight: 1.25, normal: 1.45, loose: 1.75 };
const DEFAULTS: Prefs = { mode: 'system', v: 2, wifi: 'original', cellular: '192', lrclib: true, name: 'mars', crossfade: 0, notify: NOTIFY_DEFAULTS, reader: { size: 18, spacing: 'normal', page: 'book' }, kosyncWrite: true };
const saved = readJson<Partial<Prefs>>('prefs.json', {});
let prefs: Prefs = saved.v === 2 ? { ...DEFAULTS, ...saved, reader: { ...DEFAULTS.reader, ...saved.reader } } : DEFAULTS;
export const getPrefs = () => prefs;
const listeners = new Set<() => void>();

export function setPrefs(next: Partial<Prefs>) {
  prefs = { ...prefs, ...next };
  writeJson('prefs.json', prefs);
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const usePrefs = () => useSyncExternalStore(subscribe, () => prefs);
export const setReader = (next: Partial<Reader>) => setPrefs({ reader: { ...prefs.reader, ...next } });

export function useTheme() {
  const p = usePrefs();
  const system = useColorScheme();
  const scheme: 'dark' | 'light' = p.mode === 'system' ? (system === 'light' ? 'light' : 'dark') : p.mode;
  return { c: COLORS[scheme], scheme };
}

export function useStyles<T extends StyleSheet.NamedStyles<T>>(make: (c: Colors) => T): T {
  const { c } = useTheme();
  return useMemo(() => StyleSheet.create(make(c)), [c, make]);
}

export const F = {
  sans: 'Inter_400Regular',
  italic: 'Inter_400Regular_Italic',
  sansMedium: 'Inter_500Medium',
  sansBold: 'Inter_600SemiBold',
  heavy: 'Inter_700Bold',
  heavyItalic: 'Inter_700Bold_Italic',
  black: 'Inter_800ExtraBold',
  serif: 'Inter_400Regular',
  serifItalic: 'Inter_400Regular_Italic',
  serifMediumItalic: 'Inter_500Medium_Italic',
  serifBold: 'Inter_700Bold',
};

export const TEXT_SCALE = 1.12;
export const fs = (n: number) => Math.round(n * TEXT_SCALE);

export const S = { page: 20, gap: 10, radius: 14, card: 16 };
