import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { BackBar, Empty, ErrorBox, useUi } from '../../../../components/ui';
import { BookTile, openShelf, playableCount, RandomButton, ShelfLink, useLibrary } from '../../../../components/shelf';
import { fandoms, find, hint, key, sectionOf, select, title, vaultOrder } from '../../../../shelves';
import { F, fs, S, useTheme } from '../../../../theme';

const COLS = 3;

export default function Shelf() {
  const { scope = 'all' } = useLocalSearchParams<{ scope: string }>();
  const u = useUi();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const lib = useLibrary();
  const books = useMemo(() => select(scope, lib.items, lib.audio), [scope, lib.items, lib.audio]);
  const [kind, ...rest] = scope.split(':');
  const arg = rest.join(':');
  const node = kind === 'type' ? find(lib.root, arg) : undefined;
  const children = node ? (node.path === 'calliope' ? vaultOrder(node.children, lib.sections) : node.children) : [];
  const summary = kind === 'type' ? sectionOf(arg, lib.sections)?.summary : null;
  const tile = Math.floor((width - S.page * 2 - S.gap * (COLS - 1)) / COLS);
  const voiced = playableCount(books, lib);
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
              {books.length} {books.length === 1 ? 'book' : 'books'} · {voiced} with audio
            </Text>
            {lib.error ? <ErrorBox error={lib.error} onRetry={lib.refresh} /> : null}
            {books.length ? <RandomButton scope={scope} lib={lib} /> : null}
            {children.length ? (
              <View>
                {children.map((n) => (
                  <ShelfLink key={n.path} label={title(`type:${n.path}`)} sub={sectionOf(n.path, lib.sections)?.summary ?? hint(n)} n={n.count} onPress={() => openShelf(`type:${n.path}`)} />
                ))}
              </View>
            ) : null}
            {kind === 'fanfic' ? (
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
        renderItem={({ item }) => <BookTile b={item} lib={lib} width={tile} />}
      />
    </View>
  );
}
