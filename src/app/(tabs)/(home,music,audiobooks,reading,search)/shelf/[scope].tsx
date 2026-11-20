import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { ArticleRow, RandomArticle } from '../../../../components/articles';
import { BackBar, Empty, ErrorBox, useUi } from '../../../../components/ui';
import { useArticles } from '../../../../data';
import { BookTile, openShelf, playable, RandomButton, shelfBooks, ShelfLink, useLibrary, type Mode } from '../../../../components/shelf';
import { fandoms, find, hint, key, sectionOf, title, vaultOrder } from '../../../../shelves';
import { F, fs, S, useTheme } from '../../../../theme';

const COLS = 3;

export default function Shelf() {
  const { scope = 'all', mode } = useLocalSearchParams<{ scope: string; mode?: Mode }>();
  return scope === 'articles' ? <Articles /> : <Books scope={scope} mode={mode === 'listen' ? 'listen' : 'read'} />;
}

function Articles() {
  const u = useUi();
  const { c } = useTheme();
  const res = useArticles();
  const items = res.data ?? [];
  const minutes = items.reduce((a, x) => a + (x.reading_time ?? 0), 0);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="" />
      <FlatList
        data={items}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ paddingHorizontal: S.page, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={res.loading && !!items.length} onRefresh={res.refresh} tintColor={c.muted} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 8 }}>
            <Text style={{ fontFamily: F.serifBold, fontSize: fs(34), lineHeight: fs(38), color: c.text }}>articles</Text>
            <Text style={u.muted}>
              {items.length} from wallabag · {minutes} min of reading · no audio yet
            </Text>
            {res.error ? <ErrorBox error={res.error} onRetry={res.refresh} stale={!!res.data} /> : null}
            {items.length ? <RandomArticle items={items} /> : null}
          </View>
        }
        ListEmptyComponent={<Empty>{res.loading ? 'loading…' : 'no articles in wallabag.'}</Empty>}
        renderItem={({ item }) => <ArticleRow a={item} />}
      />
    </View>
  );
}

function Books({ scope, mode }: { scope: string; mode: Mode }) {
  const u = useUi();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const lib = useLibrary(mode);
  const books = useMemo(() => shelfBooks(scope, lib, mode), [scope, lib, mode]);
  const [kind, ...rest] = scope.split(':');
  const arg = rest.join(':');
  const node = kind === 'type' ? find(lib.root, arg) : undefined;
  const count = (path: string, n: number) => (mode === 'listen' ? shelfBooks(`type:${path}`, lib, mode).length : n);
  const children = (node ? (node.path === 'calliope' ? vaultOrder(node.children, lib.sections) : node.children) : []).filter((n) => count(n.path, n.count) > 0);
  const summary = kind === 'type' ? sectionOf(arg, lib.sections)?.summary : null;
  const tile = Math.floor((width - S.page * 2 - S.gap * (COLS - 1)) / COLS);
  const voiced = books.filter((b) => playable(b, lib)).length;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="" />
      <FlatList
        data={books}
        key={COLS}
        numColumns={COLS}
        keyExtractor={key}
        columnWrapperStyle={{ gap: S.gap }}
        contentContainerStyle={{ paddingHorizontal: S.page, paddingBottom: 40, gap: 18 }}
        refreshControl={<RefreshControl refreshing={lib.loading && !!lib.items.length} onRefresh={lib.refresh} tintColor={c.muted} />}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <Text style={{ fontFamily: F.serifBold, fontSize: fs(34), lineHeight: fs(38), color: c.text }}>{title(scope)}</Text>
            {summary ? <Text style={[u.soft, { fontSize: fs(14), lineHeight: fs(20) }]}>{summary}</Text> : null}
            <Text style={u.muted}>
              {books.length} {books.length === 1 ? 'book' : 'books'}{mode === 'read' && voiced ? ` · ${voiced} with audio` : ''}
            </Text>
            {lib.error ? <ErrorBox error={lib.error} onRetry={lib.refresh} /> : null}
            {books.length ? <RandomButton scope={scope} lib={lib} mode={mode} /> : null}
            {children.length ? (
              <View>
                {children.map((n) => (
                  <ShelfLink key={n.path} label={title(`type:${n.path}`)} sub={sectionOf(n.path, lib.sections)?.summary ?? hint(n)} n={count(n.path, n.count)} onPress={() => openShelf(`type:${n.path}`, mode)} />
                ))}
              </View>
            ) : null}
            {kind === 'fanfic' && mode === 'read' ? (
              <View>
                {fandoms(lib.items).map((f) => (
                  <ShelfLink key={f.name} label={f.name} n={f.n} onPress={() => openShelf(`fandom:${f.name}`)} />
                ))}
              </View>
            ) : null}
            {children.length || kind === 'fanfic' ? <Text style={u.h2}>every book</Text> : null}
          </View>
        }
        ListEmptyComponent={<Empty>{lib.loading ? 'loading…' : 'no books here.'}</Empty>}
        renderItem={({ item }) => <BookTile b={item} lib={lib} width={tile} mode={mode} />}
      />
    </View>
  );
}
