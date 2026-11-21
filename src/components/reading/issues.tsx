import { Pressable, Text, View } from 'react-native';
import type { Issue } from '../../api';
import { openBook } from '../bits';
import { Cover, Empty, ErrorBox } from '../ui';
import { useIssues } from '../../data';
import { clock, longDate, weekday } from '../../format';
import { F, fs, useTheme } from '../../theme';


function status(i: Issue, oldest: boolean, keep: number) {
  if (!i.on_kindle) return 'not on the kindle yet';
  if (oldest) return `removed next monday · keeps the last ${keep}`;
  if (i.progress) return `on kindle · read ${Math.round(i.progress * 100)}%`;
  return `on kindle · ${i.opened ? 'opened' : 'not opened'}`;
}

function nextLabel(next: string | null | undefined) {
  if (!next) return '';
  const h = new Date(next).getHours();
  return `next issue ${weekday(next).toLowerCase()} ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}`;
}

export function IssuesBody() {
  const { c } = useTheme();
  const res = useIssues();
  const issues = res.data?.issues ?? [];
  const keep = res.data?.keep ?? 4;
  const [latest, ...older] = issues;
  if (res.error && !res.data) return <ErrorBox error={res.error} onRetry={res.refresh} />;
  if (!latest) return <Empty>{res.loading ? 'loading…' : 'no issues yet. the new yorker arrives mondays.'}</Empty>;
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => openBook(latest.id)} style={{ borderRadius: 18, backgroundColor: c.panel, padding: 14, flexDirection: 'row', gap: 14 }}>
        <Cover id={latest.id} title="the new yorker" hasCover={latest.has_cover} width={110} height={146} radius={6} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), color: c.muted }}>this week</Text>
          <Text style={{ fontFamily: F.black, fontSize: fs(18), color: c.text }}>the new yorker</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: c.muted }}>{longDate(latest.date ?? latest.added)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: latest.on_kindle ? c.ok : c.muted }} />
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: c.text }}>
              {latest.on_kindle ? (latest.progress ? `on your kindle · read ${Math.round(latest.progress * 100)}%` : 'on your kindle') : `arrived ${clock(latest.added)}, on the kindle next time it's on wi-fi`}
            </Text>
          </View>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>{nextLabel(res.data?.next_issue)}</Text>
        </View>
      </Pressable>
      {older.length ? (
        <>
          <Text accessibilityRole="header" style={{ fontFamily: F.heavy, fontSize: fs(20), color: c.text, marginTop: 4 }}>last {older.length} {older.length === 1 ? 'issue' : 'issues'}</Text>
          <View>
            {older.map((i, n) => (
              <Pressable accessibilityRole="button" key={i.id} onPress={() => openBook(i.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Cover id={i.id} title="the new yorker" hasCover={i.has_cover} width={40} height={54} radius={4} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{longDate(i.date ?? i.added)}</Text>
                  <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>{status(i, issues.length >= keep && n === older.length - 1, keep)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>issues stay out of reading stats</Text>
    </>
  );
}
