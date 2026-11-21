import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import type { Article } from '../api';
import { ARTICLE_MODE, articleLine } from '../shelves';
import { F, fs, useTheme } from '../theme';
import { Icon } from './icon';
import { useUi } from './ui';

export const openArticle = (id: number) => router.push({ pathname: '/article/[id]', params: { id: String(id) } });

export function openRandomArticle(items: Article[] = []) {
  if (!items.length) return Alert.alert('nothing here', 'no articles in wallabag.');
  openArticle(items[Math.floor(Math.random() * items.length)].id);
}

export function RandomArticle({ items }: { items: Article[] }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openRandomArticle(items)}
      style={({ pressed }) => ({ height: 44, borderRadius: 22, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <Icon name="shuffle" size={18} color={c.onAccent} />
      <Text style={{ fontFamily: F.heavy, fontSize: fs(14), color: c.onAccent }}>read something random</Text>
    </Pressable>
  );
}

export function ArticleRow({ a }: { a: Article }) {
  const u = useUi();
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => openArticle(a.id)} style={({ pressed }) => [u.row, u.line, { gap: 12, paddingVertical: 11, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), lineHeight: fs(19), color: a.archived ? c.muted : c.text }} numberOfLines={2}>
          {a.title}
        </Text>
        <Text style={u.muted} numberOfLines={1}>
          {articleLine(a)}
        </Text>
        <Text style={[u.muted, { fontSize: fs(10.5) }]}>{a.starred ? `★ ${ARTICLE_MODE}` : ARTICLE_MODE}</Text>
      </View>
      <Icon name="next" size={16} color={c.muted} />
    </Pressable>
  );
}
