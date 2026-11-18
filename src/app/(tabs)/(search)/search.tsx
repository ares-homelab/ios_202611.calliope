import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api, type Highlights } from '../../../api';
import { Art } from '../../../components/art';
import { openAudiobook, openBook, openPath } from '../../../components/bits';
import { Icon } from '../../../components/icon';
import { openAlbum, openArtist, SongRow } from '../../../components/music';
import { StatsBody } from '../../../components/reading/stats';
import { Chips, Cover, Empty, Screen, SectionHead, useUi } from '../../../components/ui';
import { useAudiobooks, useBooks, usePaths } from '../../../data';
import { statusOf } from '../../../format';
import { nd } from '../../../navidrome';
import { playSongs } from '../../../play';
import { F, fs, useTheme } from '../../../theme';

type K = 'all' | 'music' | 'audiobooks' | 'books' | 'highlights';
type Music = Awaited<ReturnType<typeof nd.search>>;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function Row({ title, sub, left, onPress }: { title: string; sub: string; left: React.ReactNode; onPress: () => void }) {
  const u = useUi();
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [u.row, u.line, { gap: 14, paddingVertical: 9, opacity: pressed ? 0.7 : 1 }]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={u.muted}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Search() {
  const u = useUi();
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [k, setK] = useState<K>('all');
  const [found, setFound] = useState<{ q: string; music?: Music | null; hl?: Highlights | null }>({ q: '' });
  const books = useBooks();
  const audio = useAudiobooks();
  const paths = usePaths();
  const term = norm(q.trim());

  useEffect(() => {
    if (term.length < 2) return;
    const query = q.trim();
    const timer = setTimeout(() => {
      if (nd.ready())
        nd.search(query)
          .then((music) => setFound((f) => ({ ...(f.q === query ? f : {}), q: query, music })))
          .catch(() => {});
      api
        .highlights({ q: query })
        .then((hl) => setFound((f) => ({ ...(f.q === query ? f : {}), q: query, hl })))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [term, q]);
  const fresh = term.length > 1 && found.q === q.trim();
  const music = fresh ? found.music : null;
  const hl = fresh ? found.hl : null;

  const has = (...xs: (string | null | undefined)[]) => xs.some((x) => x && norm(x).includes(term));
  const ab = term.length > 1 ? (audio.data ?? []).filter((b) => has(b.title, ...b.authors)) : [];
  const bk = term.length > 1 ? (books.data ?? []).filter((b) => has(b.title, ...b.authors, b.series)).slice(0, 15) : [];
  const ph = term.length > 1 ? (paths.data ?? []).filter((p) => p.number != null && has(p.name)) : [];
  const show = (x: K) => k === 'all' || k === x;
  const audioIds = new Set((audio.data ?? []).map((b) => b.id));

  return (
    <Screen gap={14}>
      <Text style={u.h1}>search</Text>
      <View style={[u.row, { gap: 10, height: 46, paddingHorizontal: 14, backgroundColor: c.panel, borderRadius: 12 }]}>
        <Icon name="search" size={18} color={c.muted} />
        <TextInput
          accessibilityLabel="search"
          value={q}
          onChangeText={setQ}
          placeholder="songs, books, highlights"
          placeholderTextColor={c.muted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={{ flex: 1, color: c.text, fontFamily: F.sans, fontSize: fs(15) }}
        />
      </View>
      {term.length < 2 ? <StatsBody /> : <Chips<K> items={['all', 'music', 'audiobooks', 'books', 'highlights']} value={k} onChange={setK} />}

      {show('music') && music ? (
        <>
          {music.artist?.length ? (
            <View>
              <SectionHead title="artists" />
              {music.artist.map((a) => (
                <Row key={a.id} title={a.name} sub={`${a.albumCount ?? 0} albums`} left={<Art id={a.coverArt} seed={a.id} size={44} radius={22} />} onPress={() => openArtist(a.id)} />
              ))}
            </View>
          ) : null}
          {music.album?.length ? (
            <View>
              <SectionHead title="albums" />
              {music.album.map((a) => (
                <Row key={a.id} title={a.name} sub={[a.artist, a.year].filter(Boolean).join(' · ')} left={<Art id={a.coverArt} seed={a.id} size={44} radius={6} />} onPress={() => openAlbum(a.id)} />
              ))}
            </View>
          ) : null}
          {music.song?.length ? (
            <View>
              <SectionHead title="songs" />
              {music.song.map((s, i) => (
                <SongRow key={s.id} s={s} art onPress={() => playSongs(music.song!, i, { kind: 'songs', id: `search:${q}`, title: q })} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {show('audiobooks') && ab.length ? (
        <View>
          <SectionHead title="audiobooks" />
          {ab.map((b) => (
            <Row key={b.id} title={b.title} sub={`${b.source === 'kokoro' ? 'ares voice' : 'human voice'} · ${b.authors.join(', ')}`} left={<Cover id={b.id} title={b.title} width={40} height={58} radius={4} />} onPress={() => openAudiobook(b.id)} />
          ))}
        </View>
      ) : null}

      {show('books') && (bk.length || ph.length) ? (
        <View>
          <SectionHead title="books" />
          {bk.map((b) => (
            <Row
              key={b.id}
              title={b.title}
              sub={[b.authors.join(', '), statusOf(b)?.toLowerCase(), audioIds.has(b.id) ? 'audio ready' : null].filter(Boolean).join(' · ')}
              left={<Cover id={b.id} title={b.title} hasCover={b.has_cover} width={40} height={58} radius={4} />}
              onPress={() => openBook(b.id)}
            />
          ))}
          {ph.map((p) => (
            <Row key={p.name} title={p.name} sub={`path${p.pinned ? ' · pinned' : ''} · ${p.read} read`} left={<Icon name="paths" size={26} color={c.accent} />} onPress={() => openPath(p.number)} />
          ))}
        </View>
      ) : null}

      {show('highlights') && hl?.highlights.length ? (
        <View>
          <SectionHead title="highlights" />
          {hl.highlights.slice(0, 20).map((h) => (
            <Row key={h.id} title={`“${h.text ?? ''}”`} sub={[h.page ? `p. ${h.page}` : null, h.book_title].filter(Boolean).join(' · ')} left={null} onPress={() => openBook(h.calibre_id)} />
          ))}
        </View>
      ) : null}
      {term.length > 1 && !music?.song?.length && !music?.album?.length && !ab.length && !bk.length && !hl?.highlights.length ? <Empty>nothing found for “{q}”.</Empty> : null}
      {term.length > 1 ? (
        <Pressable onPress={() => router.push('/library')} style={{ paddingVertical: 8 }}>
          <Text style={u.link}>browse the whole library</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
