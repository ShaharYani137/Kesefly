import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/state/app-store';
import { scheduleWeeklyTips } from '@/state/notifications';
import { AnimatedSplash } from '@/ui/animated-splash';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { hydrated } = useApp();
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);
  useEffect(() => {
    // The animated splash starts identical to the native one, so hiding the native one is seamless.
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);
  if (!hydrated) return null;
  return (
    <View style={{ flex: 1 }}>
      <AppStack />
      <NotificationSync />
      {intro ? <AnimatedSplash onDone={endIntro} /> : null}
    </View>
  );
}

/** Keeps the scheduled weekly tips in line with the latest plan and language. */
function NotificationSync() {
  const { notify, profile, s, lang, hydrated } = useApp();
  useEffect(() => {
    if (hydrated && notify) scheduleWeeklyTips(profile, s, lang).catch(() => {});
  }, [notify, profile, s, lang, hydrated]);
  return null;
}

function AppStack() {
  const { isRTL } = useApp();
  // New pages slide in from the trailing edge: from the left in Hebrew (M3 layout.md: mirror in RTL).
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: isRTL ? 'slide_from_left' : 'slide_from_right',
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="ideas" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <RootStack />
        </ThemeProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
