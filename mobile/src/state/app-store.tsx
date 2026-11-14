/**
 * App state: language, user profile, onboarding flag, stock watchlist, portfolio holdings, notification
 * settings, Kesefly Academy progress.
 * Persisted on-device only (AsyncStorage). Only stock symbols leave the phone (to Yahoo Finance, for prices).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type AcademyProgress, completeLesson as completeLessonFn, EMPTY_PROGRESS, type Placement } from '@/engine/academy';
import { EMPTY_PROFILE, type Lang, type Profile } from '@/engine/types';
import type { LessonId } from '@/i18n/academy';

import { DEFAULT_SOUNDS, type NotifType, type SoundId } from './sounds';
import { STRINGS, type Strings } from '@/i18n/strings';

/** Also read by the background event-alert task (state/event-alerts.ts). */
export const STORAGE_KEY = 'investapp/state/v1';

export const DEFAULT_WATCHLIST = ['SPY', 'VT', '^TA125.TA', 'AAPL', 'MSFT', 'NVDA', 'TEVA.TA', 'CHKP'];

/** One position in the user's portfolio (תיק השקעות). Price is per share, in the stock's own currency. */
export type Holding = { id: string; symbol: string; shares: number; buyPrice: number };

/** User preferences from Settings. Also read by the background alert task. */
export type Prefs = {
  /** App appearance; 'system' follows the phone. */
  theme: 'system' | 'light' | 'dark';
  /** Seconds in the background before the app locks again; -1 = only when the app starts. */
  autoLock: 0 | 60 | 300 | -1;
  /** Which stories alert: only my stocks, important (my stocks + high impact), or all medium+. */
  alertScope: 'mine' | 'important' | 'all';
  /** Daily move (%) in a holding that triggers an alert. */
  moveThreshold: 2 | 3 | 5;
  /** No alerts 22:00-07:00 local time; they wait for the morning. */
  quietHours: boolean;
  /** Sound per notification type (state/sounds.ts). */
  sounds: Record<NotifType, SoundId>;
};

export const DEFAULT_PREFS: Prefs = { theme: 'system', autoLock: 60, alertScope: 'important', moveThreshold: 3, quietHours: true, sounds: DEFAULT_SOUNDS };

type Persisted = {
  lang: Lang;
  profile: Profile;
  onboarded: boolean;
  watchlist: string[];
  holdings: Holding[];
  /** Weekly advice notifications on/off. */
  notify: boolean;
  /** World / economy event alerts on/off. */
  eventAlerts: boolean;
  /** Kesefly Academy: placement result, finished lessons, XP, streak. */
  academy: AcademyProgress;
  prefs: Prefs;
};

type AppState = Persisted & {
  hydrated: boolean;
  s: Strings;
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  saveProfile: (profile: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  reset: () => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  addHolding: (h: Omit<Holding, 'id'>) => void;
  removeHolding: (id: string) => void;
  /** Edit one purchase lot (shares and/or buy price). */
  updateHolding: (id: string, patch: Partial<Omit<Holding, 'id' | 'symbol'>>) => void;
  setNotify: (on: boolean) => void;
  setEventAlerts: (on: boolean) => void;
  savePlacement: (p: Placement) => void;
  finishLesson: (id: LessonId, correct: number, total: number) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  resetAcademy: () => void;
};

const AppContext = createContext<AppState | null>(null);

function deviceLang(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'he' || code === 'iw' ? 'he' : 'en';
  } catch {
    return 'en';
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<Persisted>(() => ({
    lang: deviceLang(),
    profile: EMPTY_PROFILE,
    onboarded: false,
    watchlist: DEFAULT_WATCHLIST,
    holdings: [],
    notify: false,
    eventAlerts: false,
    academy: EMPTY_PROGRESS,
    prefs: DEFAULT_PREFS,
  }));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Persisted>;
        setState((prev) => ({
          lang: saved.lang ?? prev.lang,
          profile: { ...EMPTY_PROFILE, ...saved.profile },
          onboarded: saved.onboarded ?? false,
          watchlist: Array.isArray(saved.watchlist) ? saved.watchlist : DEFAULT_WATCHLIST,
          holdings: Array.isArray(saved.holdings) ? saved.holdings : [],
          notify: saved.notify ?? false,
          eventAlerts: saved.eventAlerts ?? false,
          academy: { ...EMPTY_PROGRESS, ...saved.academy },
          prefs: { ...DEFAULT_PREFS, ...saved.prefs, sounds: { ...DEFAULT_SOUNDS, ...saved.prefs?.sounds } },
        }));
      })
      .catch(() => {
        // Corrupt or unreadable storage: start fresh rather than crash.
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const setLang = useCallback((lang: Lang) => setState((p) => ({ ...p, lang })), []);
  const saveProfile = useCallback((profile: Profile) => setState((p) => ({ ...p, profile, onboarded: true })), []);
  const updateProfile = useCallback(
    (patch: Partial<Profile>) => setState((p) => ({ ...p, profile: { ...p.profile, ...patch } })),
    [],
  );
  const reset = useCallback(
    () =>
      setState((p) => ({
        lang: p.lang,
        profile: EMPTY_PROFILE,
        onboarded: false,
        watchlist: DEFAULT_WATCHLIST,
        holdings: [],
        notify: false,
        eventAlerts: false,
        academy: EMPTY_PROGRESS,
        prefs: p.prefs,
      })),
    [],
  );
  const addSymbol = useCallback(
    (symbol: string) =>
      setState((p) => {
        const sym = symbol.trim().toUpperCase().replace(/^\$/, '');
        if (!sym || p.watchlist.includes(sym)) return p;
        return { ...p, watchlist: [...p.watchlist, sym] };
      }),
    [],
  );
  const removeSymbol = useCallback(
    (symbol: string) =>
      setState((p) => ({
        ...p,
        watchlist: p.watchlist.filter((x) => x !== symbol),
      })),
    [],
  );
  const addHolding = useCallback(
    (h: Omit<Holding, 'id'>) =>
      setState((p) => ({
        ...p,
        holdings: [...p.holdings, { ...h, symbol: h.symbol.trim().toUpperCase(), id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }],
      })),
    [],
  );
  const removeHolding = useCallback((id: string) => setState((p) => ({ ...p, holdings: p.holdings.filter((h) => h.id !== id) })), []);
  const updateHolding = useCallback(
    (id: string, patch: Partial<Omit<Holding, 'id' | 'symbol'>>) =>
      setState((p) => ({ ...p, holdings: p.holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
    [],
  );
  const setNotify = useCallback((notify: boolean) => setState((p) => ({ ...p, notify })), []);
  const setEventAlerts = useCallback((eventAlerts: boolean) => setState((p) => ({ ...p, eventAlerts })), []);
  const savePlacement = useCallback(
    (placement: Placement) => setState((p) => ({ ...p, academy: { ...p.academy, placement } })),
    [],
  );
  const setPrefs = useCallback((patch: Partial<Prefs>) => setState((p) => ({ ...p, prefs: { ...p.prefs, ...patch } })), []);
  const resetAcademy = useCallback(() => setState((p) => ({ ...p, academy: EMPTY_PROGRESS })), []);
  const finishLesson = useCallback(
    (id: LessonId, correct: number, total: number) =>
      setState((p) => ({ ...p, academy: completeLessonFn(p.academy, id, correct, total) })),
    [],
  );

  const value = useMemo<AppState>(
    () => ({
      ...state,
      hydrated,
      s: STRINGS[state.lang],
      isRTL: state.lang === 'he',
      setLang,
      saveProfile,
      updateProfile,
      reset,
      addSymbol,
      removeSymbol,
      addHolding,
      removeHolding,
      updateHolding,
      setNotify,
      setEventAlerts,
      savePlacement,
      finishLesson,
      setPrefs,
      resetAcademy,
    }),
    [
      state,
      hydrated,
      setLang,
      saveProfile,
      updateProfile,
      reset,
      addSymbol,
      removeSymbol,
      addHolding,
      removeHolding,
      updateHolding,
      setNotify,
      setEventAlerts,
      savePlacement,
      finishLesson,
      setPrefs,
      resetAcademy,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Replace {name} placeholders. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
