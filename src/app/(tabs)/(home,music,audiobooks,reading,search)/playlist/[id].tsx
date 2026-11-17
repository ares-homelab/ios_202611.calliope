import { useLocalSearchParams } from 'expo-router';
import { Collection } from '../../../../components/collection';
import { usePlaylist, useStarred } from '../../../../data';
import { hm } from '../../../../format';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fav = id === 'favorites';
  const starred = useStarred();
  const pl = usePlaylist(fav ? '' : id);
  const res = fav ? starred : pl;
  const songs = (fav ? starred.data?.song : pl.data?.entry) ?? [];
  const title = fav ? 'favorites' : (pl.data?.name ?? '');
  const seconds = songs.reduce((a, s) => a + (s.duration ?? 0), 0);
  return (
    <Collection
      ctx={{ kind: 'playlist', id, title, coverArt: pl.data?.coverArt }}
      title={title}
      sub={fav ? 'songs you hearted' : pl.data?.comment}
      meta={`${songs.length} songs · ${hm(seconds / 3600)}`}
      art={fav ? undefined : pl.data?.coverArt}
      songs={songs}
      loading={res.loading}
      error={res.error}
      refresh={res.refresh}
    />
  );
}
