import { Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold, useFonts } from '@expo-google-fonts/rubik';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Appearance, Platform, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/state/app-store';
import { AuthProvider, useAuth } from '@/state/auth';
// Imported for its side effect too: defines the background task at module scope.
import { checkEvents, disableEventAlerts, enableEventAlerts, ensureEventsChannel } from '@/state/event-alerts';
import { ensureChannel, scheduleWeeklyTips } from '@/state/notifications';
import { AnimatedSplash } from '@/ui/animated-splash';
import { AuthScreen, LockScreen, PinSetup } from '@/ui/auth-screens';
import { OfflineBanner } from '@/ui/offline-banner';
import { refreshWidget } from '@/widget/task';

SplashScreen.preventAutoHideAsync();

/** Foreground event check interval. Background checks run about every 30 min (event-alerts.ts). */
const FOREGROUND_CHECK_MS = 10 * 60_000;

function RootStack() {
  const { hydrated } = useApp();
  const auth = useAuth();
  const [fontsLoaded] = useFonts({ Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold });
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);
  const ready = hydrated && fontsLoaded && auth.status !== 'loading';
  useEffect(() => {
    // The animated splash starts identical to the native one, so hiding the native one is seamless.
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return (
    <View style={{ flex: 1 }}>
      <ThemeSync />
      <WidgetSync />
      {auth.status === 'signedOut' ? (
        <AuthScreen />
      ) : (
        <>
          <AppStack />
          <NotificationSync />
          <NotificationTaps />
          {auth.status === 'needsPin' ? <PinSetup /> : null}
          {auth.status === 'locked' ? <LockScreen /> : null}
        </>
      )}
      <OfflineBanner />
      {intro ? <AnimatedSplash onDone={endIntro} /> : null}
    </View>
  );
}

/** Keeps the weekly tips in line with the plan, and the event-alert task with its switch. */
function NotificationSync() {
  const { notify, profile, s, lang, hydrated, eventAlerts, prefs } = useApp();
  const tipSound = prefs.sounds.tips;
  const sounds = prefs.sounds;
  // Language change: weekly tips are rebuilt in the new language (they are scheduled ahead),
  // and both Android channels are renamed so system settings show the app language.
  useEffect(() => {
    if (hydrated && notify) scheduleWeeklyTips(profile, s, lang, tipSound).catch(() => {});
  }, [notify, profile, s, lang, hydrated, tipSound]);
  useEffect(() => {
    if (!hydrated) return;
    ensureChannel(s, sounds.tips).catch(() => {});
    ensureEventsChannel(lang, sounds).catch(() => {});
  }, [s, lang, hydrated, sounds]);
  useEffect(() => {
    if (!hydrated) return;
    if (!eventAlerts) {
      disableEventAlerts().catch(() => {});
      return;
    }
    enableEventAlerts().catch(() => {});
    checkEvents().catch(() => {});
    const id = setInterval(() => checkEvents().catch(() => {}), FOREGROUND_CHECK_MS);
    return () => clearInterval(id);
  }, [eventAlerts, hydrated]);
  return null;
}

/** Keeps the Android home-screen widget in step with holdings, language and currency. */
function WidgetSync() {
  const { holdings, lang, profile, hydrated } = useApp();
  const currency = profile.currency;
  useEffect(() => {
    if (hydrated && Platform.OS === 'android') refreshWidget().catch(() => {});
  }, [holdings, lang, currency, hydrated]);
  return null;
}

/** Applies the Settings appearance choice ('system' removes the override). */
function ThemeSync() {
  const { prefs } = useApp();
  useEffect(() => {
    Appearance.setColorScheme(prefs.theme === 'system' ? 'auto' : prefs.theme);
  }, [prefs.theme]);
  return null;
}

/** Tapping an alert opens the screen it points to (events list or a stock page). */
function NotificationTaps() {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = last?.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
  }, [last]);
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
      <Stack.Screen name="events" />
      <Stack.Screen name="stock/[symbol]" />
      <Stack.Screen name="lesson/[id]" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="holding/[symbol]" />
      <Stack.Screen name="assessment" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AuthProvider>
          <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <RootStack />
          </ThemeProvider>
        </AuthProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
