/** keeps the phone's copies in step with navidrome after lidarr replaces a file in place (same song id, new file) */
type SongLike = { id: string; size?: number; duration?: number };

/** downloaded songs whose file no longer matches navidrome's (original downloads are byte-for-byte navidrome's file) */
export function staleDownloads(saved: Record<string, { bytes: number }>, songs: SongLike[]) {
  const size = new Map(songs.map((s) => [s.id, s.size]));
  return Object.keys(saved).filter((k) => {
    const n = k.startsWith('s:') ? size.get(k.slice(2)) : undefined;
    return !!n && !!saved[k].bytes && n !== saved[k].bytes;
  });
}

/** queued songs with navidrome's current song (length, tags); returns null when nothing changed */
export function refreshQueue<T extends { kind: string; duration: number; song?: SongLike }>(queue: T[], byId: Map<string, SongLike>): T[] | null {
  let changed = false;
  const next = queue.map((t) => {
    const s = t.kind === 'song' && t.song ? byId.get(t.song.id) : undefined;
    if (!s || (s.size === t.song!.size && (s.duration ?? 0) === t.duration)) return t;
    changed = true;
    return { ...t, song: { ...t.song!, ...s }, duration: s.duration ?? t.duration };
  });
  return changed ? next : null;
}
