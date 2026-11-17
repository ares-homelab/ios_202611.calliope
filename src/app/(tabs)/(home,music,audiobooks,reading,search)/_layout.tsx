import { Stack } from 'expo-router';
import { useTheme } from '../../../theme';

export const unstable_settings = {
  anchor: 'index',
  home: { anchor: 'index' },
  music: { anchor: 'music' },
  audiobooks: { anchor: 'audiobooks' },
  reading: { anchor: 'reading' },
  search: { anchor: 'search' },
};

export default function TabStack() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
