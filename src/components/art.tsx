import { Image } from 'expo-image';
import { View } from 'react-native';
import { nd } from '../navidrome';
import type { Track } from '../player';
import { useTheme } from '../theme';
import { Cover } from './ui';

const SWATCH = ['#7A2E2A', '#2B3F6B', '#3E6B5A', '#5E4A7A', '#C9A46A', '#8A5A3C', '#6B2B4A', '#3E5A8A'];
export const swatch = (key: string) => SWATCH[[...key].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % SWATCH.length];

/** square music artwork from navidrome, a colour swatch until it loads */
export function Art({ id, seed, size, radius = 8 }: { id?: string; seed: string; size: number; radius?: number }) {
  const { c } = useTheme();
  const uri = nd.coverUrl(id, size > 120 ? 600 : 300);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: swatch(seed), overflow: 'hidden', borderWidth: 1, borderColor: c.coverEdge }}>
      {uri ? <Image source={{ uri }} cachePolicy="disk" recyclingKey={id} transition={120} contentFit="cover" style={{ flex: 1 }} /> : null}
    </View>
  );
}

export function TrackArt({ t, size, radius = 6 }: { t: Track; size: number; radius?: number }) {
  if (t.kind === 'book') return <Cover id={t.bookId} title={t.album ?? t.title} width={size} height={size} radius={radius} plain />;
  return <Art id={t.song?.coverArt} seed={t.song?.albumId ?? t.key} size={size} radius={radius} />;
}
