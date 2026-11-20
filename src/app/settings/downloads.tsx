import { Alert, Pressable, Text, View } from 'react-native';
import { Icon } from '../../components/icon';
import { BackBar, Button, Empty, Screen, useUi } from '../../components/ui';
import { fmtBytes as size, removeAll, removeGroup, totalBytes, useDownloads } from '../../downloads';
import { F, fs, useTheme } from '../../theme';

export default function Downloads() {
  const u = useUi();
  const { c } = useTheme();
  const dl = useDownloads();
  const groups = new Map<string, { label: string; bytes: number; n: number; images: number }>();
  for (const s of Object.values(dl.saved)) {
    const g = groups.get(s.group) ?? { label: s.label, bytes: 0, n: 0, images: 0 };
    const img = s.key.startsWith('i:');
    groups.set(s.group, { ...g, bytes: g.bytes + s.bytes, n: g.n + (img ? 0 : 1), images: g.images + (img ? 1 : 0) });
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackBar label="account" />
      <Screen top={false} gap={12}>
        <Text style={u.h1}>downloads</Text>
        <Text style={u.soft}>{size(totalBytes(dl))} on this iphone. downloads play, and saved books read, without ares.</Text>
        {[...groups.entries()].map(([g, x]) => (
          <View key={g} style={[u.row, u.line, { gap: 12, paddingVertical: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: c.text }}>{x.label}</Text>
              <Text style={u.muted}>
                {g.startsWith('r:') && !x.label.endsWith('pdf pages') ? (x.images ? `with ${x.images} ${x.images === 1 ? 'image' : 'images'}` : 'text only') : `${x.n} ${x.n === 1 ? 'file' : 'files'}`} · {size(x.bytes)}
              </Text>
            </View>
            <Pressable accessibilityLabel={`remove ${x.label}`} onPress={() => removeGroup(g)} hitSlop={8}>
              <Icon name="close" size={18} color={c.muted} />
            </Pressable>
          </View>
        ))}
        {!groups.size ? <Empty>nothing downloaded.</Empty> : null}
        {groups.size ? (
          <Button
            label="remove all downloads"
            kind="warn"
            onPress={() => Alert.alert('remove all downloads?', undefined, [{ text: 'cancel', style: 'cancel' }, { text: 'remove', style: 'destructive', onPress: removeAll }])}
          />
        ) : null}
      </Screen>
    </View>
  );
}
