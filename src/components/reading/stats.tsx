import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Insights } from '../../api';
import { swatch } from '../art';
import { openBook } from '../bits';
import { Chips, Cover, Empty, ErrorBox, useUi } from '../ui';
import { useDay, useInsights } from '../../data';
import { readJson, writeJson } from '../../files';
import { count, seconds } from '../../format';
import { F, fs, mix, useTheme } from '../../theme';

const SECTIONS = ['week', 'month', 'year', 'habits'] as const;
type Section = (typeof SECTIONS)[number];
const TITLES: Record<Section, string> = { week: 'this week', month: 'this month', year: 'this year', habits: 'habits' };
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function Tiles({ items }: { items: [string, string][] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {items.map(([value, label]) => (
        <View key={label} style={{ flex: 1, borderRadius: 16, backgroundColor: c.panel, padding: 12 }}>
          <Text style={{ fontFamily: F.black, fontSize: fs(21), color: c.text }}>{value}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Card({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: 18, backgroundColor: c.panel, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.heavy, fontSize: fs(15), color: c.text }}>{title}</Text>
        {right ? <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      {items.map(([color, label]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Week({ s }: { s: Insights }) {
  const { c } = useTheme();
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const byDate = new Map(s.days.map((d) => [d.date, d]));
  const week = [...Array(7)].map((_, i) => byDate.get(iso(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))));
  const max = Math.max(1, ...week.map((d) => (d ? d.read + d.heard : 0)));
  const total = week.reduce((a, d) => a + (d ? d.read + d.heard : 0), 0);
  return (
    <>
      <Card title="this week" right={`${seconds(total)} total`}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {week.map((d, i) => (
            <View
              key={i}
              accessible
              accessibilityLabel={`${DAY_NAMES[i]}: ${d?.read || d?.heard ? [d.read ? `${seconds(d.read)} reading` : '', d.heard ? `${seconds(d.heard)} listening` : ''].filter(Boolean).join(', ') : 'nothing'}`}
              style={{ flex: 1, alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: '100%', height: 120, justifyContent: 'flex-end', gap: 2 }}>
                {d?.read ? <View style={{ height: (d.read / max) * 116, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: d.heard ? 0 : 4, borderBottomRightRadius: d.heard ? 0 : 4, backgroundColor: c.accent }} /> : null}
                {d?.heard ? <View style={{ height: (d.heard / max) * 116, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: d.read ? 0 : 4, borderTopRightRadius: d.read ? 0 : 4, backgroundColor: c.warn }} /> : null}
              </View>
              <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{'mtwtfss'[i]}</Text>
            </View>
          ))}
        </View>
        <Legend items={[[c.accent, 'reading'], [c.warn, 'listening']]} />
      </Card>
      <Tiles items={[[String(s.streak), 'day streak'], [String(s.books), 'books this year'], [String(Math.round(s.pages_per_day)), 'pages a day']]} />
    </>
  );
}

function Month({ s }: { s: Insights }) {
  const { c } = useTheme();
  const now = new Date();
  const [shown, setShown] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [picked, setPicked] = useState<string | null>(null);
  const byDate = new Map(s.days.map((d) => [d.date, d]));
  const first = new Date(shown.y, shown.m, 1);
  const count = new Date(shown.y, shown.m + 1, 0).getDate();
  const today = iso(now);
  const level = (secs: number) => (secs <= 0 ? c.raised : secs < 1800 ? mix(c.panel, c.accent, 0.3) : secs < 3600 ? mix(c.panel, c.accent, 0.6) : c.accent);
  const cells = [...Array(first.getDay())].map(() => null as string | null).concat([...Array(count)].map((_, i) => iso(new Date(shown.y, shown.m, i + 1))));
  const move = (delta: number) => {
    const d = new Date(shown.y, shown.m + delta, 1);
    setShown({ y: d.getFullYear(), m: d.getMonth() });
    setPicked(null);
  };
  const onCurrent = shown.y === now.getFullYear() && shown.m === now.getMonth();
  return (
    <>
      <Tiles items={[[String(s.streak), 'day streak'], [String(s.best_streak), 'best streak'], [`${s.active_30}/30`, 'active days']]} />
      <Card title={`${MONTH_NAMES[shown.m]}${shown.y !== now.getFullYear() ? ` ${shown.y}` : ''}`} right="reading + listening a day">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="earlier month" onPress={() => move(-1)} hitSlop={10}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: c.accent }}>‹ earlier</Text>
          </Pressable>
          {!onCurrent ? (
            <Pressable accessibilityRole="button" accessibilityLabel="later month" onPress={() => move(1)} hitSlop={10}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: c.accent }}>later ›</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {'smtwtfs'.split('').map((d, i) => (
            <Text key={`h${i}`} style={{ width: `${100 / 7}%`, textAlign: 'center', fontFamily: F.sans, fontSize: 11, color: c.muted, marginBottom: 4 }}>{d}</Text>
          ))}
          {cells.map((d, i) => {
            const v = d ? byDate.get(d) : undefined;
            const future = !!d && d > today;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, padding: 2.5 }}>
                {d ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={d}
                    accessibilityState={{ selected: picked === d, disabled: future }}
                    disabled={future}
                    onPress={() => setPicked(picked === d ? null : d)}
                    style={{ aspectRatio: 1, borderRadius: 6, backgroundColor: future ? c.bg : level(v ? v.read + v.heard : 0), borderWidth: picked === d ? 2 : 1, borderColor: picked === d ? c.text : c.line, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 3 }}>
                    <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{Number(d.slice(8))}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>less</Text>
          {[0, 1000, 2000, 4000].map((x) => (
            <View key={x} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: level(x) }} />
          ))}
          <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>more</Text>
        </View>
        {picked ? <DayDetail date={picked} /> : <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>tap a day: what you read and heard, in minutes</Text>}
      </Card>
    </>
  );
}

function DayDetail({ date }: { date: string }) {
  const { c } = useTheme();
  const day = useDay(date);
  const [y, m, d] = date.split('-').map(Number);
  return (
    <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
      <Text style={{ fontFamily: F.heavy, fontSize: fs(13), color: c.text }}>{`${d} ${MONTHS[m - 1]} ${y}`}</Text>
      {!day.data ? (
        <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: c.muted }}>{day.loading ? 'loading…' : "can't reach ares"}</Text>
      ) : day.data.length === 0 ? (
        <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: c.muted }}>nothing read or heard.</Text>
      ) : (
        day.data.map((b, i) => (
          <Pressable accessibilityRole="button" key={i} disabled={!b.calibre_id} onPress={() => openBook(b.calibre_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Cover id={b.calibre_id} title={b.title} width={26} height={38} radius={3} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.sansBold, fontSize: fs(14), color: c.text }}>{b.title}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>
                {[b.read ? `read ${seconds(b.read)}${b.pages ? ` · ${count(b.pages, 'page')}` : ''}` : '', b.heard ? `heard ${seconds(b.heard)}` : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

function Year({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  const { c } = useTheme();
  const now = new Date().getFullYear();
  const ins = useInsights(year);
  const s = ins.data;
  const perMonth = MONTHS.map((_, i) => (s?.finished ?? []).filter((f) => f.month === i + 1));
  const top = Math.max(1, ...(s?.sections ?? []).map((x) => x.books));
  return (
    <>
      <Chips items={[[String(now), String(now)], [String(now - 1), String(now - 1)], ['0', 'all time']]} value={String(year)} onChange={(v) => setYear(Number(v))} />
      {!s ? (
        <Empty>{ins.loading ? 'loading…' : ''}</Empty>
      ) : (
        <>
          <Tiles items={[[String(s.books), 'books'], [s.pages.toLocaleString('en'), 'pages'], [`${s.hours} h`, 'read + heard']]} />
          <Card title={year === 0 ? 'finished, month by month (all years)' : 'finished, month by month'}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {perMonth.map((books, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{ height: 96, justifyContent: 'flex-end', gap: 2 }}>
                    {books.slice(0, 4).map((b, j) => (
                      <Pressable key={j} accessibilityRole="button" accessibilityLabel={b.title} onPress={() => openBook(b.calibre_id)} style={{ width: 22, height: 20, borderRadius: 2, backgroundColor: swatch(String(b.calibre_id ?? b.title)) }} />
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{MONTHS[i]}</Text>
                </View>
              ))}
            </View>
          </Card>
          {s.sections.length ? (
            <Card title="by section">
              {s.sections.slice(0, 6).map((x) => (
                <View key={x.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text numberOfLines={1} style={{ width: 120, fontFamily: F.sans, fontSize: fs(13), color: c.text }}>{x.name}</Text>
                  <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.track }}>
                    <View style={{ width: `${(x.books / top) * 100}%`, height: 10, borderRadius: 5, backgroundColor: swatch(x.name) }} />
                  </View>
                  <Text style={{ width: 34, textAlign: 'right', fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>{x.books}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}

function Habits({ s }: { s: Insights }) {
  const { c } = useTheme();
  const max = Math.max(1, ...s.hours_of_day.map((h) => h.read + h.heard));
  return (
    <>
      <Card title="when you read and listen" right="last 30 days">
        <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: 80 }}>
          {s.hours_of_day.map((h, i) => (
            <View key={i} style={{ flex: 1, height: Math.max(0, ((h.read + h.heard) / max) * 80), borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: h.heard > h.read ? c.warn : c.accent }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {['00', '06', '12', '18', '23'].map((x) => (
            <Text key={x} style={{ fontFamily: F.sans, fontSize: 11, color: c.muted }}>{x}</Text>
          ))}
        </View>
        <Legend items={[[c.accent, 'kindle'], [c.warn, 'listening']]} />
      </Card>
      <Tiles items={[[`${Math.round(s.avg_session_min)} min`, 'avg session'], [String(Math.round(s.pages_per_hour)), 'pages an hour'], [`${Math.round(s.heard_share * 100)}%`, 'heard vs read']]} />
      {s.pace.length ? (
        <Card title="pace per book">
          {s.pace.map((p, i) => (
            <Pressable accessibilityRole="button" key={i} disabled={!p.calibre_id} onPress={() => openBook(p.calibre_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Cover id={p.calibre_id} title={p.title} width={30} height={44} radius={4} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{p.title}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>
                  {p.kind === 'heard'
                    ? `listening · ~${p.hours_left ?? '?'} h of audio left`
                    : `${p.pages_per_hour ?? '?'} pages an hour${p.hours_left != null ? ` · finishes in ~${p.hours_left} h` : ''}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </>
  );
}

export function StatsBody() {
  const u = useUi();
  const { c } = useTheme();
  const ins = useInsights();
  const s = ins.data;
  const [year, setYear] = useState(new Date().getFullYear());
  const [order, setOrder] = useState<Section[]>(() => {
    const saved = readJson<Section[]>('stats-order.json', [...SECTIONS]);
    return saved.length === SECTIONS.length && SECTIONS.every((x) => saved.includes(x)) ? saved : [...SECTIONS];
  });
  const [editing, setEditing] = useState(false);
  const shift = (i: number, d: number) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
    writeJson('stats-order.json', next);
  };
  if (ins.error && !s) return <ErrorBox error={ins.error} onRetry={ins.refresh} />;
  if (!s) return <Empty>{ins.loading ? 'loading…' : ''}</Empty>;
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" onPress={() => setEditing(!editing)} hitSlop={8} style={{ paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: c.accent }}>{editing ? 'done' : 'edit sections'}</Text>
        </Pressable>
      </View>
      {order.map((sec, i) => (
        <View key={sec} style={{ gap: 14 }}>
          <View style={[u.row, { justifyContent: 'space-between', marginTop: i ? 14 : 0 }]}>
            <Text style={{ fontFamily: F.black, fontSize: fs(22), color: c.text }}>{TITLES[sec]}</Text>
            {editing ? (
              <View style={{ flexDirection: 'row', gap: 18 }}>
                {i > 0 ? (
                  <Pressable accessibilityRole="button" onPress={() => shift(i, -1)} hitSlop={8} accessibilityLabel={`move ${TITLES[sec]} up`}>
                    <Text style={{ fontFamily: F.heavy, fontSize: fs(16), color: c.accent }}>↑</Text>
                  </Pressable>
                ) : null}
                {i < order.length - 1 ? (
                  <Pressable accessibilityRole="button" onPress={() => shift(i, 1)} hitSlop={8} accessibilityLabel={`move ${TITLES[sec]} down`}>
                    <Text style={{ fontFamily: F.heavy, fontSize: fs(16), color: c.accent }}>↓</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          {editing ? null : sec === 'week' ? <Week s={s} /> : sec === 'month' ? <Month s={s} /> : sec === 'year' ? <Year year={year} setYear={setYear} /> : <Habits s={s} />}
        </View>
      ))}
    </>
  );
}
