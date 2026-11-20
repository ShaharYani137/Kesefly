import { Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold, useFonts } from '@expo-google-fonts/rubik';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Appearance, AppState, Platform, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/state/app-store';
import { AuthProvider, useAuth } from '@/state/auth';
// Imported for its side effect too: defines the background task at module scope.
import { checkEvents, disableEventAlerts, enableEventAlerts, ensureEventsChannel } from '@/state/event-alerts';
import { AiProvider } from '@/state/ai-store';
import { LabMonitor } from '@/state/lab-monitor';
import { LabProvider, useLab } from '@/state/lab-store';
import { ensureChannel, scheduleWeeklyTips } from '@/state/notifications';
import { AnimatedSplash } from '@/ui/animated-splash';
import { AppTour } from '@/ui/app-tour';
import { AuthScreen, LockScreen, PinSetup } from '@/ui/auth-screens';
import { DialogHost } from '@/ui/dialog';
import { OfflineBanner } from '@/ui/offline-banner';
import { syncIosWidget } from '@/widget/ios';
import { refreshWidget } from '@/widget/task';

SplashScreen.preventAutoHideAsync();

/** Foreground event check interval. Background checks run about every 30 min (event-alerts.ts). */
const FOREGROUND_CHECK_MS = 10 * 60_000;

function RootStack() {
  const { hydrated, onboarded } = useApp();
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
          <LabMonitor />
          {/* Once, after the profile setup, while unlocked and after the intro animation. */}
          <AppTour ready={onboarded && auth.status === 'ready' && !intro} />
          {auth.status === 'needsPin' ? <PinSetup /> : null}
          {auth.status === 'locked' ? <LockScreen /> : null}
        </>
      )}
      <OfflineBanner />
      <DialogHost />
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

/**
 * Keeps the home-screen widgets in step with purchases, sales, dividends, language and currency:
 * Android widget (widget/task.tsx) and iOS WidgetKit widget (widget/ios.ts). The widgets read
 * the saved state, and this child effect runs before AppProvider's save effect, so the sync
 * waits a moment for the write. iOS also syncs when the app goes to the background, so the
 * widget starts from fresh prices.
 */
function WidgetSync() {
  const { holdings, sales, dividends, lang, profile, hydrated } = useApp();
  const currency = profile.currency;
  // Open practice trades show on both widgets too.
  const labOpen = useLab().account.orders.filter((o) => o.status === 'open' || o.status === 'pending').map((o) => `${o.id}:${o.status}`).join(',');
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      if (Platform.OS === 'android') refreshWidget().catch(() => {});
      if (Platform.OS === 'ios') syncIosWidget().catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [holdings, sales, dividends, lang, currency, hydrated, labOpen]);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') syncIosWidget().catch(() => {});
    });
    return () => sub.remove();
  }, []);
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
      <Stack.Screen name="finances" />
      <Stack.Screen name="holding/[symbol]" />
      <Stack.Screen name="tax" />
      <Stack.Screen name="compare" />
      <Stack.Screen name="import" />
      <Stack.Screen name="savings" />
      <Stack.Screen name="assessment" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ai-settings" />
      <Stack.Screen name="lab/index" />
      <Stack.Screen name="lab/gate" options={{ gestureEnabled: false }} />
      <Stack.Screen name="lab/scanner" />
      <Stack.Screen name="lab/setup/[symbol]" />
      <Stack.Screen name="lab/plan" />
      <Stack.Screen name="lab/timemachine" />
      <Stack.Screen name="lab/ticket" />
      <Stack.Screen name="lab/journal" />
      <Stack.Screen name="lab/settings" />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <AppProvider>
        <LabProvider>
        <AiProvider>
        <AuthProvider>
          <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <RootStack />
          </ThemeProvider>
        </AuthProvider>
        </AiProvider>
        </LabProvider>
      </AppProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
