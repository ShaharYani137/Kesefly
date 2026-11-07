/**
 * App state: language, user profile, onboarding flag, stock watchlist, Finnhub key.
 * Persisted on-device only (AsyncStorage). Only stock symbols leave the phone (to Finnhub, for prices).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { EMPTY_PROFILE, type Lang, type Profile } from '@/engine/types';
import { STRINGS, type Strings } from '@/i18n/strings';

const STORAGE_KEY = 'investapp/state/v1';

export const DEFAULT_WATCHLIST = ['SPY', 'VT', 'AAPL', 'MSFT', 'NVDA', 'TEVA', 'CHKP'];

type Persisted = { lang: Lang; profile: Profile; onboarded: boolean; finnhubKey: string; watchlist: string[] };

type AppState = Persisted & {
  hydrated: boolean;
  s: Strings;
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  saveProfile: (profile: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  reset: () => void;
  setFinnhubKey: (key: string) => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
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
    finnhubKey: '',
    watchlist: DEFAULT_WATCHLIST,
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
          finnhubKey: saved.finnhubKey ?? '',
          watchlist: Array.isArray(saved.watchlist) ? saved.watchlist : DEFAULT_WATCHLIST,
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
  const saveProfile = useCallback(
    (profile: Profile) => setState((p) => ({ ...p, profile, onboarded: true })),
    [],
  );
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
        finnhubKey: '',
        watchlist: DEFAULT_WATCHLIST,
      })),
    [],
  );
  const setFinnhubKey = useCallback((finnhubKey: string) => setState((p) => ({ ...p, finnhubKey: finnhubKey.trim() })), []);
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
    (symbol: string) => setState((p) => ({ ...p, watchlist: p.watchlist.filter((x) => x !== symbol) })),
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
      setFinnhubKey,
      addSymbol,
      removeSymbol,
    }),
    [state, hydrated, setLang, saveProfile, updateProfile, reset, setFinnhubKey, addSymbol, removeSymbol],
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
