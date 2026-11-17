import { useLocalSearchParams } from 'expo-router';
import { Collection } from '../../../../components/collection';
import { useAlbum } from '../../../../data';
import { albumContext } from '../../../../play';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = useAlbum(id);
  const a = res.data;
  const meta = [a?.genre, a?.year, 'on ares'].filter(Boolean).join(' · ');
  return (
    <Collection
      ctx={a ? albumContext(a) : { kind: 'album', id, title: '' }}
      title={a?.name ?? ''}
      sub={a?.artist}
      meta={a ? meta : undefined}
      art={a?.coverArt}
      songs={a?.song ?? []}
      numbered
      loading={res.loading}
      error={res.error}
      refresh={res.refresh}
    />
  );
}
