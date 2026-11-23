import { useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Art } from '../../../../components/art';
import { Collection } from '../../../../components/collection';
import { AlbumTile } from '../../../../components/music';
import { SectionHead } from '../../../../components/ui';
import { useArtist } from '../../../../data';
import { nd } from '../../../../navidrome';
import { useResource } from '../../../../store';
import { S } from '../../../../theme';
import { count } from '../../../../format';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = useArtist(id);
  const a = res.data;
  const albums = a?.album ?? [];
  const songs = useResource(`nd/artistsongs/${id}/${albums.length}`, async () => (await Promise.all(albums.map((x) => nd.album(x.id)))).flatMap((x) => x.song ?? []));
  const { width } = useWindowDimensions();
  const size = Math.floor((width - S.page * 2 - 14) / 2);
  return (
    <Collection
      ctx={{ kind: 'artist', id, title: a?.name ?? '', coverArt: a?.coverArt }}
      title={a?.name ?? ''}
      meta={a ? `${count(albums.length, 'album')} · ${songs.data ? count(songs.data.length, 'song') : '… songs'} on ares` : undefined}
      hero={<Art id={a?.coverArt ?? `ar-${id}`} seed={id} size={200} radius={100} />}
      songs={songs.data ?? []}
      sections={[]}
      loading={res.loading}
      error={res.error}
      refresh={res.refresh}
    >
      <View style={{ gap: 10 }}>
        <SectionHead title="albums" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }}>
          {albums.map((x) => (
            <AlbumTile key={x.id} a={x} size={size} />
          ))}
        </View>
      </View>
    </Collection>
  );
}
