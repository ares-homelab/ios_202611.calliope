import type { Audiobook, Book, FanficBook, ListInfo, QueueItem, Section } from './api';

/** one book of either library, as bookbindery's index has it */
export type Item = {
  lib: 'calliope' | 'fanfic';
  id: number;
  title: string;
  authors: string[];
  types: string[];
  workflow: string[];
  series: string | null;
  series_index: number | null;
  has_cover: boolean;
  lists: string[];
  fandom?: string;
  kindle?: boolean | null;
  review?: string[] | null;
};

export type Status = 'reading' | 'tbr' | 'read' | 'dnf';
export const STATUSES: Status[] = ['reading', 'tbr', 'read', 'dnf'];
const WF: Record<Status, string> = { reading: 'ONGOING', tbr: 'TBR', read: 'READ', dnf: 'DNF' };
export const hasStatus = (b: Item, s: Status) => b.workflow.includes(WF[s]);

export const fromBook = (b: Book): Item => ({ ...b, lib: 'calliope', lists: b.lists ?? [] });
export const fromFanfic = (b: FanficBook): Item => ({
  lib: 'fanfic',
  id: b.id,
  title: b.title,
  authors: b.authors,
  types: [],
  workflow: b.workflow ?? [],
  series: b.series ?? null,
  series_index: b.series_index ?? null,
  has_cover: !!b.has_cover,
  lists: b.lists ?? [],
  fandom: b.fandom,
});

export const key = (b: Item) => `${b.lib}:${b.id}`;

export type Node = { name: string; path: string; count: number; children: Node[] };

const byCountThenName = (a: Node, b: Node) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/** dotted calibre types → nested shelves with book counts (Shelves.tree) */
export function tree(items: Item[]): Node {
  type M = Node & { map: Map<string, M> };
  const root: M = { name: '', path: '', count: 0, children: [], map: new Map() };
  for (const b of items) {
    if (b.lib !== 'calliope' || !b.types.length) continue;
    root.count++;
    const seen = new Set<string>();
    for (const t of b.types) {
      let node = root;
      let path = '';
      for (const seg of t.split('.').filter(Boolean)) {
        path = path ? `${path}.${seg}` : seg;
        let child = node.map.get(seg);
        if (!child) node.map.set(seg, (child = { name: seg, path, count: 0, children: [], map: new Map() }));
        if (!seen.has(path)) {
          seen.add(path);
          child.count++;
        }
        node = child;
      }
    }
  }
  const sort = (n: M): Node => ({ name: n.name, path: n.path, count: n.count, children: [...n.map.values()].map(sort).sort(byCountThenName) });
  return sort(root);
}

export function find(root: Node, path: string): Node | undefined {
  let node: Node | undefined = root;
  for (const seg of path.split('.').filter(Boolean)) node = node?.children.find((c) => c.name === seg);
  return node;
}

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

/** a shelf's children in the obsidian vault's section order, the rest by count then name (Shelves.vault_order) */
export function vaultOrder(children: Node[], sections: Section[] = []) {
  const rank = new Map(sections.map((s, i) => [slug(s.name), s.order ?? i + 1]));
  return [...children].sort((a, b) => (rank.get(a.name) ?? Infinity) - (rank.get(b.name) ?? Infinity) || byCountThenName(a, b));
}

export const shelfName = (path: string) => (path === 'calliope' ? 'sections' : (path.split('.').pop() ?? ''));

export function hint(node: Node) {
  const k = node.children;
  if (node.path === 'calliope') return `${k.length}, vault order`;
  if (k.length === 1) return k[0].name;
  if (k.length === 2) return `${k[0].name} ${k[0].count} · ${k[1].name} ${k[1].count}`;
  if (k.length > 2) return `${k.slice(0, 3).map((c) => c.name).join(' · ')}${k.length > 3 ? ` · ${k.length - 3} more` : ''}`;
  return '';
}

export const inShelf = (b: Item, path: string) => b.types.some((t) => t === path || t.startsWith(`${path}.`));

const lower = (s: string | null | undefined) => (s ?? '').toLowerCase();

/** series together in volume order, the rest by title (Shelves volume_order) */
export function volumeOrder(a: Item, b: Item) {
  const ka = lower(a.series ?? a.title);
  const kb = lower(b.series ?? b.title);
  if (ka !== kb) return ka < kb ? -1 : 1;
  const d = (a.series_index ?? Infinity) - (b.series_index ?? Infinity);
  if (d) return d;
  return lower(a.title) < lower(b.title) ? -1 : 1;
}

/** favorites, the registry's order, then names only books carry, alphabetically (Lists.all) */
export function lists(items: Item[], registry: ListInfo[] = []) {
  const count = new Map<string, number>();
  for (const b of items) for (const n of new Set(b.lists)) count.set(n, (count.get(n) ?? 0) + 1);
  const names = ['favorites', ...registry.map((r) => r.name).filter((n) => n !== 'favorites')];
  const rest = [...count.keys()].filter((n) => !names.includes(n)).sort();
  return [...names, ...rest].map((name) => ({ name, n: count.get(name) ?? 0 }));
}

export function fandoms(items: Item[]) {
  const count = new Map<string, number>();
  for (const b of items) if (b.lib === 'fanfic') count.set(b.fandom ?? 'unsorted', (count.get(b.fandom ?? 'unsorted') ?? 0) + 1);
  return [...count.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || (a.name < b.name ? -1 : 1));
}

/** what a shelf scope holds: all, audio, status:<s>, type:<path>, list:<name>, fanfic, fandom:<name> */
export function select(scope: string, items: Item[], audio: Map<number, Audiobook> = new Map()): Item[] {
  const [kind, ...rest] = scope.split(':');
  const arg = rest.join(':');
  const pick =
    kind === 'status'
      ? (b: Item) => b.lib === 'calliope' && hasStatus(b, arg as Status)
      : kind === 'type'
        ? (b: Item) => b.lib === 'calliope' && inShelf(b, arg)
        : kind === 'list'
          ? (b: Item) => b.lists.includes(arg)
          : kind === 'fanfic'
            ? (b: Item) => b.lib === 'fanfic'
            : kind === 'fandom'
              ? (b: Item) => b.lib === 'fanfic' && (b.fandom ?? 'unsorted') === arg
              : kind === 'audio'
                ? (b: Item) => b.lib === 'calliope' && audio.has(b.id)
                : () => true;
  return items.filter(pick).sort(volumeOrder);
}

export function title(scope: string) {
  const [kind, ...rest] = scope.split(':');
  const arg = rest.join(':');
  if (kind === 'type') return arg.startsWith('calliope.') ? arg.slice(9).replace(/-/g, ' ') : shelfName(arg);
  if (kind === 'status') return ({ reading: 'reading', tbr: 'to read', read: 'read', dnf: 'dnf' } as Record<string, string>)[arg] ?? arg;
  if (kind === 'fanfic') return 'fanfic';
  if (kind === 'articles') return 'articles';
  if (kind === 'audio') return 'ready to listen';
  if (kind === 'all') return 'the whole library';
  return arg;
}

export const sectionOf = (path: string, sections: Section[] = []) => (path.startsWith('calliope.') ? sections.find((s) => slug(s.name) === path.slice(9)) : undefined);

export type AudioState = { playable: boolean; line: string };

/** what the phone can do with a book's audio: play it, or say why not */
export function audioState(b: Item, audio: Map<number, Audiobook>, queue: Map<number, QueueItem>, hm: (h: number) => string): AudioState {
  if (b.lib === 'fanfic') return { playable: false, line: 'fanfic · not voiced on ares' };
  const a = audio.get(b.id);
  if (a) {
    if (a.source === 'kokoro')
      return { playable: true, line: a.complete ? `ares voice · ${hm(a.seconds / 3600)}` : `ares voice · ${a.chapters_total ? `${a.track_count ?? 0} of ${a.chapters_total} chapters` : hm(a.seconds / 3600)}, more tonight` };
    return { playable: true, line: `human voice · ${hm(a.seconds / 3600)}` };
  }
  const q = queue.get(b.id);
  if (q) return { playable: false, line: q.kind === 'tapped' || q.kind === 'listening' ? `no audio yet · ticked, #${q.position} tonight` : `no audio yet · #${q.position} in the night queue` };
  return { playable: false, line: 'no audio yet' };
}

/** a wallabag article's line: site · reading time, and that it has no audio */
export const articleLine = (a: { domain?: string | null; reading_time?: number | null }) =>
  [a.domain?.replace(/^www\./, ''), a.reading_time ? `${a.reading_time} min` : null].filter(Boolean).join(' · ');

export const ARTICLE_MODE = 'article · read only';
