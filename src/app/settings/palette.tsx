import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons';
import { Pressable, Text, View } from 'react-native';
import { BackBar, Screen, useUi } from '../../components/ui';
import { PALETTES, setPrefs, usePrefs, useTheme, type Colors, fs } from '../../theme';
import { F } from '../../theme';

function Sample({ c }: { c: Colors }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: c.line }}>
      <Text style={{ fontFamily: F.serifMediumItalic, fontSize: fs(20), color: c.text }}>calliope</Text>
      <View style={{ backgroundColor: c.panel, borderRadius: 9, padding: 9, gap: 6 }}>
        <Text style={{ fontFamily: F.serifBold, fontSize: fs(15), color: c.text }}>brazil&apos;s spirits</Text>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: c.track }}>
          <View style={{ width: '40%', height: 3, borderRadius: 2, backgroundColor: c.progress }} />
        </View>
      </View>
      <View style={{ alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: c.accent }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(10), color: c.onAccent }}>ongoing</Text>
      </View>
    </View>
  );
}

/** the app icon in the palette's colour; coral is the main icon */
export function matchIcon(palette: string) {
  if (!supportsAlternateIcons) return;
  const want = palette === 'coral' ? null : palette[0].toUpperCase() + palette.slice(1); // the icon sets are PascalCase on iOS
  if (getAppIconName() !== want) setAlternateAppIcon(want as Parameters<typeof setAlternateAppIcon>[0]).catch(() => {});
}

export default function Palette() {
  const u = useUi();
  const { c } = useTheme();
  const prefs = usePrefs();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="settings" />
      <Screen top={false} gap={16}>
        <Text style={u.h1}>palette</Text>
        {supportsAlternateIcons ? (
          <Pressable
            onPress={() => {
              setPrefs({ iconFollows: !prefs.iconFollows });
              matchIcon(prefs.iconFollows ? 'coral' : prefs.palette);
            }}
            style={[u.row, { justifyContent: 'space-between', backgroundColor: c.panel, borderRadius: 14, padding: 14 }]}>
            <Text style={[u.body, { fontFamily: F.sansBold, fontSize: fs(15) }]}>app icon follows the palette</Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: prefs.iconFollows ? c.accent : c.muted }}>{prefs.iconFollows ? 'on' : 'off'}</Text>
          </Pressable>
        ) : null}
        {PALETTES.map((p) => {
          const on = p.id === prefs.palette;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                setPrefs({ palette: p.id });
                if (prefs.iconFollows) matchIcon(p.id);
              }}
              style={{ backgroundColor: c.panel, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1.5, borderColor: on ? c.accent : 'transparent' }}
            >
              <View style={[u.row, { justifyContent: 'space-between' }]}>
                <Text style={[u.body, { fontFamily: F.sansBold, fontSize: fs(16) }]}>{p.id}</Text>
                <Text style={u.muted}>{on ? 'current' : p.note}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Sample c={p.dark} />
                <Sample c={p.light} />
              </View>
            </Pressable>
          );
        })}
      </Screen>
    </View>
  );
}
