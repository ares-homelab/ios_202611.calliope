import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Art, swatch } from '../../../components/art';
import { Icon } from '../../../components/icon';
import { AlbumTile, openArtist, SongRow } from '../../../components/music';
import { Button, Chips, Empty, ErrorBox, Screen, SectionHead, useUi } from '../../../components/ui';
import { useAlbums, useArtists, useMixes, usePlaylists, useSongs, useStarred } from '../../../data';
import { useDownloads } from '../../../downloads';
import { nd } from '../../../navidrome';
import { playSongs } from '../../../play';
import { COLORS, F, fs, S, useTheme } from '../../../theme';
import { count } from '../../../format';

type V = 'pinned' | 'playlists' | 'albums' | 'artists' | 'songs' | 'downloaded';

function ListRow({ title, sub, color, art, onPress, icon }: { title: string; sub: string; color?: string; art?: string; onPress: () => void; icon?: 'heart' | 'sparkle' }) {
  const u = useUi();
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [u.row, u.line, { gap: 14, paddingVertical: 9, opacity: pressed ? 0.7 : 1 }]}>
      {art ? (
        <Art id={art} seed={title} size={56} radius={8} />
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: color ?? swatch(title), alignItems: 'center', justifyContent: 'center' }}>
          {icon ? <Icon name={icon} size={24} color="#FFFFFF" filled={icon === 'heart'} /> : null}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={u.muted}>
          {sub}
        </Text>
      </View>
      <Icon name="next" size={18} color={c.muted} />
    </Pressable>
  );
}

function Pinned() {
  const mixes = useMixes();
  const playlists = usePlaylists();
  const starred = useStarred();
  const recent = useAlbums('newest', 12);
  return (
    <>
      <View>
        <ListRow title="favorites" sub={count(starred.data?.song?.length, 'song')} color={COLORS.light.accent} icon="heart" onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: 'favorites' } })} />
        {(mixes.data ?? []).map((m) => (
          <ListRow key={m.id} title={m.title} sub={`made for you · ${m.sub}`} color={m.color} icon="sparkle" onPress={() => router.push({ pathname: '/mix/[id]', params: { id: m.id } })} />
        ))}
        {(playlists.data ?? []).map((p) => (
          <ListRow key={p.id} title={p.name} sub={`yours · ${count(p.songCount, 'song')}`} art={p.coverArt} onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: p.id } })} />
        ))}
      </View>
      {recent.data?.length ? (
        <View style={{ gap: 10 }}>
          <SectionHead title="recently added" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.page }} contentContainerStyle={{ paddingHorizontal: S.page, gap: 12 }}>
            {recent.data.map((a) => (
              <AlbumTile key={a.id} a={a} size={150} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

function Albums() {
  const res = useAlbums('alphabeticalByName', 500);
  const { width } = useWindowDimensions();
  const size = Math.floor((width - S.page * 2 - 14) / 2);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }}>
      {(res.data ?? []).map((a) => (
        <AlbumTile key={a.id} a={a} size={size} />
      ))}
      {res.loading && !res.data ? <Empty>loading…</Empty> : null}
    </View>
  );
}

function Artists() {
  const u = useUi();
  const { c } = useTheme();
  const res = useArtists();
  return (
    <View>
      {(res.data ?? []).map((a) => (
        <Pressable accessibilityRole="button" key={a.id} onPress={() => openArtist(a.id)} style={[u.row, u.line, { gap: 14, paddingVertical: 8 }]}>
          <Art id={a.coverArt ?? `ar-${a.id}`} seed={a.id} size={48} radius={24} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{a.name}</Text>
            <Text style={u.muted}>{a.albumCount ?? 0} albums</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Songs() {
  const res = useSongs();
  const songs = useMemo(() => [...(res.data ?? [])].sort((a, b) => a.title.localeCompare(b.title)), [res.data]);
  return (
    <View>
      <Button label="shuffle all" icon="shuffle" onPress={() => playSongs(songs, 0, { kind: 'songs', id: 'all', title: 'all songs' }, true)} style={{ marginBottom: 8 }} />
      {songs.slice(0, 400).map((s, i) => (
        <SongRow key={s.id} s={s} art onPress={() => playSongs(songs, i, { kind: 'songs', id: 'all', title: 'all songs' })} />
      ))}
      {res.loading && !res.data ? <Empty>loading…</Empty> : null}
    </View>
  );
}

function Downloaded() {
  const dl = useDownloads();
  const songs = useSongs();
  const have = (songs.data ?? []).filter((s) => dl.saved[`s:${s.id}`]);
  const books = [...new Set(Object.values(dl.saved).filter((x) => x.key.startsWith('b:')).map((x) => x.label))];
  return (
    <View>
      {books.length ? <Empty>audiobooks: {books.join(', ')}</Empty> : null}
      {have.map((s, i) => (
        <SongRow key={s.id} s={s} art onPress={() => playSongs(have, i, { kind: 'songs', id: 'downloaded', title: 'downloaded' })} />
      ))}
      {!have.length ? <Empty>nothing downloaded yet. albums and playlists have a download button.</Empty> : null}
    </View>
  );
}

export default function Music() {
  const u = useUi();
  const { c } = useTheme();
  const [view, setView] = useState<V>('pinned');
  const starred = useStarred();
  return (
    <Screen gap={16} refreshing={starred.loading && !!starred.data} onRefresh={starred.refresh}>
      <View style={[u.row, { justifyContent: 'space-between' }]}>
        <Text accessibilityRole="header" style={u.h1}>music</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="wanted songs" onPress={() => router.push('/wanted')} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={20} color={c.text} />
        </Pressable>
      </View>
      {!nd.ready() ? (
        <ErrorBox error="navidrome isn't signed in yet" onRetry={() => router.push('/settings/connection')} />
      ) : (
        <>
          <Chips<V> items={['pinned', 'playlists', 'albums', 'artists', 'songs', 'downloaded']} value={view} onChange={setView} />
          {view === 'pinned' || view === 'playlists' ? <Pinned /> : view === 'albums' ? <Albums /> : view === 'artists' ? <Artists /> : view === 'songs' ? <Songs /> : <Downloaded />}
        </>
      )}
    </Screen>
  );
}
