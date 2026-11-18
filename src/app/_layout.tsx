import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_400Regular_Italic } from '@expo-google-fonts/inter/400Regular_Italic';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_500Medium_Italic } from '@expo-google-fonts/inter/500Medium_Italic';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from 'expo-font';
import * as Updates from 'expo-updates';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { flushVoice } from '../voice';
import { reschedule, startNotifications } from '../notify';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getConfig } from '../config';
import '../player';
import { flush } from '../store';
import { useTheme } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { c, scheme } = useTheme();
  const [loaded] = useFonts({ Inter_400Regular, Inter_400Regular_Italic, Inter_500Medium, Inter_500Medium_Italic, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);
  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync().catch(() => {});
    if (!getConfig().token) setTimeout(() => router.push('/settings/connection'), 0);
    let notifySub: { remove: () => void } | undefined;
    startNotifications().then((x) => (notifySub = x)).catch(() => {});
    let pending = false;
    const fetchUpdate = async () => {
      if (!Updates.isEnabled) return;
      try {
        if ((await Updates.checkForUpdateAsync()).isAvailable) pending = !!(await Updates.fetchUpdateAsync()).isNew;
      } catch {}
    };
    fetchUpdate();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        flush();
        flushVoice();
        reschedule().catch(() => {});
        fetchUpdate();
      }
      if (s === 'background' && pending) Updates.reloadAsync().catch(() => {});
    });
    return () => {
      sub.remove();
      notifySub?.remove();
    };
  }, [loaded]);
  if (!loaded) return null;
  const sheet = { presentation: 'modal' as const, contentStyle: { backgroundColor: c.bg } };
  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        <Stack.Screen name="readalong" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="queue" options={sheet} />
        <Stack.Screen name="lyrics" options={sheet} />
        <Stack.Screen name="settings/connection" options={{ gestureEnabled: !!getConfig().token }} />
      </Stack>
    </SafeAreaProvider>
  );
}
