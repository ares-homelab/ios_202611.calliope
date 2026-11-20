import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ArticleBlock } from '../../../../api';
import { ReaderPanel, useReaderTint, type Tint } from '../../../../components/reader';
import { Icon } from '../../../../components/icon';
import { ErrorBox } from '../../../../components/ui';
import { useArticle } from '../../../../data';
import { ARTICLE_MODE, articleLine } from '../../../../shelves';
import { F, fs, LINE, usePrefs } from '../../../../theme';

function Block({ b, k, size, line }: { b: ArticleBlock; k: Tint; size: number; line: number }) {
  if (b.kind === 'h') return <Text style={{ fontFamily: F.heavy, fontSize: size * 1.15, lineHeight: line * 1.1, color: k.text, marginTop: size * 0.4 }}>{b.text}</Text>;
  if (b.kind === 'quote')
    return <Text style={{ fontFamily: F.italic, fontSize: size, lineHeight: line, color: k.ink, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: k.mark }}>{b.text}</Text>;
  if (b.kind === 'caption') return <Text style={{ fontFamily: F.sans, fontSize: size * 0.8, lineHeight: line * 0.8, color: k.muted }}>{b.text}</Text>;
  return <Text style={{ fontFamily: F.sans, fontSize: size, lineHeight: line, color: k.ink }}>{b.kind === 'li' ? `•  ${b.text}` : b.text}</Text>;
}

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = useArticle(Number(id));
  const a = res.data;
  const k = useReaderTint(`article:${id}`);
  const { reader } = usePrefs();
  const [panel, setPanel] = useState(false);
  const inset = useSafeAreaInsets();
  const size = reader.size;
  const line = size * LINE[reader.spacing];
  const blocks = a?.blocks ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: k.bg }}>
      <View style={{ paddingTop: inset.top + 6, paddingHorizontal: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable accessibilityLabel="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8} style={{ height: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
          <Icon name="back" size={22} color={k.text} width={1.9} />
        </Pressable>
        <Pressable accessibilityLabel="reading settings" onPress={() => setPanel(!panel)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: panel ? k.chip : undefined }}>
          <Text style={{ fontFamily: F.sans, fontSize: 17, color: k.text }}>Aa</Text>
        </Pressable>
      </View>
      {panel ? <ReaderPanel k={k} /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ marginHorizontal: 14, padding: 18, paddingBottom: 60, gap: size * 0.7, borderRadius: 18, backgroundColor: k.page }}>
        {res.error && !a ? <ErrorBox error={res.error} onRetry={res.refresh} /> : null}
        {a ? (
          <View style={{ gap: 6, marginBottom: 6 }}>
            <Text style={{ fontFamily: F.serifBold, fontSize: fs(28), lineHeight: fs(32), color: k.text }}>{a.title}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: k.muted }}>{[articleLine(a), ARTICLE_MODE].filter(Boolean).join(' · ')}</Text>
            {a.url ? (
              <Text onPress={() => Linking.openURL(a.url!)} style={{ fontFamily: F.sansBold, fontSize: fs(13), color: k.text }}>
                open the original
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: k.muted }}>{res.loading ? 'loading the article…' : ''}</Text>
        )}
        {blocks.map((b, i) => (
          <Block key={i} b={b} k={k} size={size} line={line} />
        ))}
        {a && !blocks.length ? <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: k.muted }}>wallabag has no text for this article.</Text> : null}
      </ScrollView>
    </View>
  );
}
