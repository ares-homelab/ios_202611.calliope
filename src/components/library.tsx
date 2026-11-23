import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useArticles, useHome } from '../data';
import { percent } from '../format';
import { openReader, useMarks } from '../read';
import { ARTICLE_MODE, fandoms, find, hasStatus, hint, lists, sectionOf, STATUSES, title, vaultOrder, type Status } from '../shelves';
import { F, fs, useTheme } from '../theme';
import { openRandomArticle } from './articles';
import { openBook } from './bits';
import { Icon } from './icon';
import { openShelf, RandomButton, ShelfLink, shelfBooks, type Library, type Mode } from './shelf';
import { Chips, Cover, SectionHead, useUi } from './ui';

/** sections, shelves and lists of the library; listening shows only those with audio, with their audio counts */
export function Shelves({ lib, mode }: { lib: Library; mode: Mode }) {
  const count = (scope: string, n: number) => (mode === 'listen' ? shelfBooks(scope, lib, mode).length : n);
  const calliope = find(lib.root, 'calliope');
  const sections = (calliope ? vaultOrder(calliope.children, lib.sections) : []).map((n) => ({ n, c: count(`type:${n.path}`, n.count) })).filter((x) => x.c);
  const shelves = lib.root.children.filter((n) => n.path !== 'calliope').map((n) => ({ n, c: count(`type:${n.path}`, n.count) })).filter((x) => x.c);
  const named = lists(lib.items, lib.lists)
    .map((l) => ({ ...l, n: count(`list:${l.name}`, l.n) }))
    .filter((l) => mode === 'read' || l.n);
  return (
    <>
      {sections.length ? (
        <View>
          <SectionHead title="sections" />
          {sections.map(({ n, c }) => (
            <ShelfLink key={n.path} label={title(`type:${n.path}`)} sub={sectionOf(n.path, lib.sections)?.summary} n={c} onPress={() => openShelf(`type:${n.path}`, mode)} />
          ))}
        </View>
      ) : null}
      {shelves.length ? (
        <View>
          <SectionHead title="shelves" />
          {shelves.map(({ n, c }) => (
            <ShelfLink key={n.path} label={n.name} sub={hint(n)} n={c} onPress={() => openShelf(`type:${n.path}`, mode)} />
          ))}
        </View>
      ) : null}
      {named.length ? (
        <View>
          <SectionHead title="lists" />
          {named.map((l) => (
            <ShelfLink key={l.name} label={l.name} n={l.n} onPress={() => openShelf(`list:${l.name}`, mode)} />
          ))}
        </View>
      ) : null}
    </>
  );
}

/** the book open on this iphone or the kindle, whichever was read last */
function Continue({ lib }: { lib: Library }) {
  const u = useUi();
  const { c } = useTheme();
  const marks = useMarks();
  const home = useHome();
  const phone = Object.values(marks).sort((a, b) => b.at - a.at)[0];
  const kindle = home.data?.reading?.[0];
  const usePhone = phone && (!kindle || phone.at >= Date.parse(kindle.last_read));
  if (!usePhone && !kindle?.calibre_id) return null;
  const item = usePhone ? lib.items.find((b) => b.lib === phone.lib && b.id === phone.id) : lib.items.find((b) => b.lib === 'calliope' && b.id === kindle!.calibre_id);
  const t = usePhone ? phone.title : kindle!.title;
  const id = usePhone ? phone.id : kindle!.calibre_id!;
  const which = usePhone ? phone.lib : 'calliope';
  const share = usePhone ? phone.s : kindle!.progress;
  return (
    <Pressable accessibilityRole="button" onPress={() => openBook(id, which)} style={({ pressed }) => [{ borderRadius: 18, backgroundColor: c.panel, padding: 14, flexDirection: 'row', gap: 14, opacity: pressed ? 0.85 : 1 }]}>
      <Cover id={id} lib={which} title={t} hasCover={item?.has_cover ?? true} width={80} height={118} radius={6} />
      <View style={{ flex: 1, gap: 7 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), color: c.accent }}>{usePhone ? 'continue on the iphone' : 'continue · from the kindle'}</Text>
        <Text style={{ fontFamily: F.heavy, fontSize: fs(17), lineHeight: fs(20), color: c.text }} numberOfLines={2}>
          {t}
        </Text>
        <Text style={u.muted}>{percent(share)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`read ${t}`} onPress={() => openReader(which, id)} hitSlop={5} style={{ marginTop: 'auto', alignSelf: 'flex-start', height: 34, paddingHorizontal: 18, borderRadius: 17, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="book" size={16} color={c.onAccent} />
          <Text style={{ fontFamily: F.heavy, fontSize: fs(13), color: c.onAccent }}>read</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

/** the bookbindery-style library, in the reading tab: every book of both libraries, read on the phone or the kindle */
export function LibraryBody({ lib }: { lib: Library }) {
  const u = useUi();
  const { c } = useTheme();
  const fanfic = fandoms(lib.items);
  const articles = useArticles().data ?? [];
  const n = (s: Status) => lib.items.filter((b) => b.lib === 'calliope' && hasStatus(b, s)).length;
  return (
    <>
      <Continue lib={lib} />
      <RandomButton scope="all" lib={lib} mode="read" />
      <Pressable accessibilityRole="button" accessibilityLabel="search the library" onPress={() => router.push('/library')} style={[u.row, { gap: 10, height: 44, paddingHorizontal: 14, backgroundColor: c.panel, borderRadius: 12 }]}>
        <Icon name="search" size={18} color={c.muted} />
        <Text style={[u.soft, { color: c.muted }]}>title, author, series or fandom</Text>
      </Pressable>
      <Chips items={STATUSES.map((s) => [s, `${title(`status:${s}`)} ${n(s)}`] as [string, string])} value="" onChange={(s) => openShelf(`status:${s}`)} />
      <View>
        <ShelfLink label="the whole library" sub="what is on the kindle, and books under review" n={lib.items.length} onPress={() => openShelf('all')} />
        <ShelfLink label="with audio" sub="read here or listen" n={lib.items.filter((b) => b.lib === 'calliope' && lib.audio.has(b.id)).length} onPress={() => openShelf('audio')} />
      </View>
      <Shelves lib={lib} mode="read" />
      {fanfic.length ? (
        <View>
          <SectionHead title="fanfic" right="all" onPress={() => openShelf('fanfic')} />
          {fanfic.map((f) => (
            <ShelfLink key={f.name} label={f.name} n={f.n} onPress={() => openShelf(`fandom:${f.name}`)} />
          ))}
        </View>
      ) : null}
      {articles.length ? (
        <View>
          <SectionHead title="articles" right="random" onPress={() => openRandomArticle(articles)} />
          <ShelfLink label="wallabag" sub={`${ARTICLE_MODE} · newest: ${articles[0].title}`} n={articles.length} onPress={() => openShelf('articles')} />
        </View>
      ) : null}
    </>
  );
}
