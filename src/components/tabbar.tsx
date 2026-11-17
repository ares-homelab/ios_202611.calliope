import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { current, skip, next, toggle, usePlayer } from '../player';
import { F, fs, useTheme } from '../theme';
import { TrackArt } from './art';
import { Icon, IconName } from './icon';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const TABS: [string, string, IconName][] = [
  ['(home)', 'home', 'homeFill'],
  ['(music)', 'music', 'music'],
  ['(audiobooks)', 'audiobooks', 'headphones'],
  ['(reading)', 'reading', 'book'],
  ['(search)', 'search', 'find'],
];

export function MiniPlayer() {
  const { c } = useTheme();
  const s = usePlayer();
  const t = current(s);
  if (!t) return null;
  const book = t.kind === 'book';
  const progress = s.duration ? s.time / s.duration : 0;
  return (
    <Pressable
      onPress={() => router.push('/player')}
      accessibilityLabel={`now playing: ${t.title}`}
      style={{ marginHorizontal: 10, marginBottom: 8, height: 60, borderRadius: 14, backgroundColor: c.raised, overflow: 'hidden' }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 6 }}>
        <TrackArt t={t} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.sansBold, fontSize: fs(14), color: c.text }}>
            {t.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(12), color: c.muted }}>
            {book ? t.album : t.artist}
          </Text>
        </View>
        <Pressable accessibilityLabel={s.playing ? 'pause' : 'play'} onPress={toggle} hitSlop={4} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={s.playing ? 'pause' : 'play'} size={22} color={c.text} />
        </Pressable>
        <Pressable
          accessibilityLabel={book ? 'forward 30 seconds' : 'next'}
          onPress={() => (book ? skip(30) : next())}
          hitSlop={4}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={book ? 'fwd30' : 'skip'} size={22} color={c.text} />
        </Pressable>
      </View>
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 0, height: 2, backgroundColor: c.track }}>
        <View style={{ width: `${Math.min(1, progress) * 100}%`, height: 2, backgroundColor: c.accent }} />
      </View>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const inset = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.bg }}>
      <MiniPlayer />
      <View
        accessibilityRole="tablist"
        style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: c.bar, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, paddingBottom: Math.max(inset.bottom, 10) }}
      >
        {state.routes.map((route, i) => {
          const tab = TABS.find((x) => x[0] === route.name);
          if (!tab) return null;
          const on = state.index === i;
          const color = on ? c.accent : c.muted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!on && !e.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ width: 70, alignItems: 'center', gap: 4 }}
            >
              <Icon name={tab[2]} size={24} color={color} />
              <Text style={{ fontFamily: F.sansMedium, fontSize: 10.5, color }}>{tab[1]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
