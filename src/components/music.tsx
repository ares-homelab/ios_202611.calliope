import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { download, groupState, removeGroup, useDownloads } from '../downloads';
import { nd, type Album, type Song } from '../navidrome';
import { addLast, addNext, current, songTrack, usePlayer } from '../player';
import { F, fs, useTheme } from '../theme';
import { mmss } from './controls';
import { Art } from './art';
import { Icon } from './icon';
import { useUi } from './ui';

export const openAlbum = (id?: string) => id && router.push({ pathname: '/album/[id]', params: { id } });
export const openArtist = (id?: string) => id && router.push({ pathname: '/artist/[id]', params: { id } });

export function songMenu(s: Song) {
  Alert.alert(s.title, s.artist, [
    { text: 'play next', onPress: () => addNext([songTrack(s)]) },
    { text: 'add to queue', onPress: () => addLast([songTrack(s)]) },
    ...(s.albumId ? [{ text: 'go to album', onPress: () => openAlbum(s.albumId) }] : []),
    ...(s.artistId ? [{ text: 'go to artist', onPress: () => openArtist(s.artistId) }] : []),
    { text: s.starred ? 'remove from favorites' : 'favorite', onPress: () => nd.star(s.id, !s.starred).catch(() => {}) },
    { text: 'download', onPress: () => download(`s:${s.id}`, nd.downloadUrl(s.id), s.suffix ?? 'mp3', `song:${s.id}`, s.title).catch(() => {}) },
    { text: 'cancel', style: 'cancel' },
  ]);
}

export function SongRow({ s, n, art, sub, onPress }: { s: Song; n?: number; art?: boolean; sub?: string; onPress: () => void }) {
  const u = useUi();
  const { c } = useTheme();
  const p = usePlayer();
  const dl = useDownloads();
  const on = current(p)?.song?.id === s.id;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={() => songMenu(s)}
      style={({ pressed }) => [u.row, { gap: 14, paddingVertical: 9, paddingHorizontal: on ? 8 : 0, marginHorizontal: on ? -8 : 0, borderRadius: 10, backgroundColor: on ? c.panel : 'transparent', borderBottomWidth: 1, borderBottomColor: c.line, opacity: pressed ? 0.7 : 1 }]}
    >
      {art ? <Art id={s.coverArt} seed={s.albumId ?? s.id} size={44} radius={6} /> : <Text style={{ width: 22, fontFamily: F.sans, fontSize: fs(14), color: on ? c.accent : c.muted }}>{n ?? ''}</Text>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[u.row, { gap: 6 }]}>
          {on ? <Icon name="bars" size={14} color={c.accent} /> : null}
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: on ? F.heavy : F.sansBold, fontSize: fs(15), color: on ? c.accent : c.text }}>
            {s.title}
          </Text>
        </View>
        <Text numberOfLines={1} style={u.muted}>
          {sub ?? [art ? s.artist : null, s.duration ? mmss(s.duration) : null].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {dl.saved[`s:${s.id}`] ? <Icon name="downloaded" size={16} color={c.muted} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="more" onPress={() => songMenu(s)} hitSlop={8}>
        <Icon name="more" size={20} color={c.muted} />
      </Pressable>
    </Pressable>
  );
}

export function AlbumTile({ a, size = 160 }: { a: Album; size?: number }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => openAlbum(a.id)} style={{ width: size, gap: 6 }}>
      <Art id={a.coverArt} seed={a.id} size={size} radius={10} />
      <View>
        <Text numberOfLines={1} style={{ fontFamily: F.sansBold, fontSize: fs(13), color: c.text }}>
          {a.name}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>
          {a.artist}
        </Text>
      </View>
    </Pressable>
  );
}

/** download / remove a whole album or playlist */
export function useGroupDownload(group: string, label: string, songs: Song[]) {
  const dl = useDownloads();
  const keys = songs.map((s) => `s:${s.id}`);
  const st = groupState(dl, group, keys);
  const run = async () => {
    if (st.all)
      return Alert.alert('remove the download?', label, [
        { text: 'cancel', style: 'cancel' },
        { text: 'remove', style: 'destructive', onPress: () => removeGroup(group) },
      ]);
    try {
      for (const s of songs) await download(`s:${s.id}`, nd.downloadUrl(s.id), s.suffix ?? 'mp3', group, label);
    } catch (e) {
      Alert.alert('download stopped', (e as Error).message);
    }
  };
  return { ...st, run };
}
