import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, fs, mix, useTheme } from '../theme';
import { Icon, type IconName } from './icon';

export type SheetItem = { icon: IconName; label: string; onPress: () => void; on?: boolean; detail?: string };

/** bottom action sheet in the app's own style (replaces Alert menus); `head` sits above the items */
export function Sheet({ open, onClose, head, items, groups }: { open: boolean; onClose: () => void; head?: ReactNode; items?: SheetItem[]; groups?: SheetItem[][] }) {
  const { c, scheme } = useTheme();
  const inset = useSafeAreaInsets();
  const all = groups ?? (items ? [items] : []);
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (open) {
      rise.setValue(0);
      Animated.spring(rise, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
    }
  }, [open, rise]);
  const pick = (x: SheetItem) => {
    onClose();
    setTimeout(x.onPress, 350);
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="close menu" onPress={onClose} style={{ flex: 1, backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }} />
      <Animated.View style={{ backgroundColor: c.panel, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingBottom: inset.bottom + 8, maxHeight: '80%', transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }] }}>
        <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: c.track, marginBottom: 8 }} />
        {head ? <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>{head}</View> : null}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}>
          {all.map((g, gi) => (
            <View key={gi} style={{ backgroundColor: c.raised, borderRadius: 14, overflow: 'hidden' }}>
              {g.map((x, i) => (
                <Pressable
                  key={x.label}
                  accessibilityRole="button"
                  accessibilityLabel={x.detail ? `${x.label}, ${x.detail}` : x.label}
                  onPress={() => pick(x)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 50,
                    paddingHorizontal: 16,
                    backgroundColor: pressed ? mix(c.raised, c.text, 0.08) : undefined,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: c.line,
                  })}
                >
                  <Text style={{ flex: 1, fontFamily: F.sansMedium, fontSize: fs(16), color: x.on ? c.accent : c.text }}>{x.label}</Text>
                  {x.detail ? <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: c.muted }}>{x.detail}</Text> : null}
                  <Icon name={x.icon} size={20} color={x.on ? c.accent : c.text} filled={x.on && x.icon === 'heart'} />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
