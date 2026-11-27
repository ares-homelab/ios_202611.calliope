/** pure queue rules for the player: shuffle that can be undone, and repeat off → all → one */
export type Repeat = 'off' | 'all' | 'one';

export const nextRepeat = (r: Repeat): Repeat => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off');

export function shuffled<T>(xs: T[], rand = Math.random) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** the item at `index` moves to the front, everything else follows in random order */
export const startShuffled = <T,>(queue: T[], index: number, rand = Math.random) =>
  queue.length ? [queue[index], ...shuffled(queue.filter((_, i) => i !== index), rand)] : [];

/** shuffles only what comes after `index`; what has played and the current item stay put */
export const shuffleRest = <T,>(queue: T[], index: number, rand = Math.random) => [...queue.slice(0, index + 1), ...shuffled(queue.slice(index + 1), rand)];

/** back to the original order, standing on the same item */
export function unshuffle<T extends { key: string }>(order: T[], current: T | undefined) {
  if (!current) return { queue: order, index: 0 };
  const i = order.findIndex((x) => x.key === current.key);
  return i >= 0 ? { queue: order, index: i } : { queue: [current, ...order], index: 0 };
}

/** where playback goes when a track ends by itself; null stops */
export function afterEnd(index: number, length: number, repeat: Repeat): number | null {
  if (!length) return null;
  if (repeat === 'one') return index;
  if (index + 1 < length) return index + 1;
  return repeat === 'all' ? 0 : null;
}

/** where a manual or crossfaded next goes: repeat-one still moves on */
export const nextIndex = (index: number, length: number, repeat: Repeat) => afterEnd(index, length, repeat === 'one' ? 'all' : repeat);
