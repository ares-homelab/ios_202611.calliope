import { api, type Para } from './api';
import type { Track } from './player';
import { useResource } from './store';

export const atTime = (paras: Para[], t: number) => {
  let i = -1;
  for (let k = 0; k < paras.length && paras[k].start <= t + 0.2; k++) i = k;
  return i;
};

export function useBookText(t: Track | undefined) {
  const key = t?.kind === 'book' ? `text/${t.bookId}/${t.n}` : 'text/none';
  return useResource(key, () => (t?.kind === 'book' ? api.audioText(t.bookId!, t.n!) : Promise.resolve(null)));
}
