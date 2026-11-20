import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, useWindowDimensions, type ViewToken } from 'react-native';
import type { ReadInfo } from '../api';
import { pageSource } from '../read';
import type { Tint } from './reader';

const ASPECT = 1.414;

/** a pdf as page images rendered on ares; each page zooms with a pinch */
export function PdfPages({ info, k, start, onPage }: { info: ReadInfo; k: Tint; start: number; onPage: (page: number) => void }) {
  const { width } = useWindowDimensions();
  const w = width - 28;
  const h = Math.round(w * ASPECT);
  const pages = Array.from({ length: info.pages ?? 0 }, (_, i) => i + 1);
  const seen = useRef(onPage);
  useEffect(() => {
    seen.current = onPage;
  });
  const [viewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
    if (viewableItems[0]?.item) seen.current(viewableItems[0].item);
  });
  return (
    <FlatList
      data={pages}
      keyExtractor={String}
      style={{ flex: 1, marginHorizontal: 14 }}
      initialScrollIndex={Math.max(0, Math.min(pages.length - 1, start - 1))}
      getItemLayout={(_, i) => ({ length: h + 10, offset: (h + 10) * i, index: i })}
      onViewableItemsChanged={viewable}
      viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
      windowSize={5}
      initialNumToRender={2}
      renderItem={({ item }) => (
        <ScrollView maximumZoomScale={4} minimumZoomScale={1} bouncesZoom centerContent style={{ width: w, height: h, marginBottom: 10, borderRadius: 6, backgroundColor: k.page }}>
          <Image source={pageSource(info.lib, info.id, item)} cachePolicy="disk" contentFit="contain" style={{ width: w, height: h }} recyclingKey={`${info.id}-${item}`} />
        </ScrollView>
      )}
    />
  );
}
