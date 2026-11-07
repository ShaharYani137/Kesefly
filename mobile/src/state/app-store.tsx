/**
 * App state: language, user profile, onboarding flag, stock watchlist, portfolio holdings, notification setting.
 * Persisted on-device only (AsyncStorage). Only stock symbols leave the phone (to Yahoo Finance, for prices).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { EMPTY_PROFILE, type Lang, type Profile } from '@/engine/types';
import { STRINGS, type Strings } from '@/i18n/strings';

const STORAGE_KEY = 'investapp/state/v1';

export const DEFAULT_WATCHLIST = ['SPY', 'VT', '^TA125.TA', 'AAPL', 'MSFT', 'NVDA', 'TEVA.TA', 'CHKP'];

/** One position in the user's portfolio (תיק השקעות). Price is per share, in the stock's own currency. */
export type Holding = { id: string; symbol: string; shares: number; buyPrice: number };

type Persisted = {
  lang: Lang;
  profile: Profile;
  onboarded: boolean;
  watchlist: string[];
  holdings: Holding[];
  /** Weekly advice notifications on/off. */
  notify: boolean;
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
  setNotify: (on: boolean) => void;
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
  const setNotify = useCallback((notify: boolean) => setState((p) => ({ ...p, notify })), []);

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
      setNotify,
    }),
    [state, hydrated, setLang, saveProfile, updateProfile, reset, addSymbol, removeSymbol, addHolding, removeHolding, setNotify],
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
