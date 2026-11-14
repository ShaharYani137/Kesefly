/**
 * Authentication: an account (sign in once) plus an app lock (PIN, fingerprint or face) on
 * every launch and after the app has been in the background for a while.
 *
 * Account modes:
 *   - cloud: Supabase Auth over its REST API, when EXPO_PUBLIC_SUPABASE_URL and
 *     EXPO_PUBLIC_SUPABASE_ANON_KEY are set at build time (see mobile/.env.example).
 *     Email + password, sign-up, password reset. Tokens live in the secure store.
 *   - device: when no cloud project is configured. The account exists only on this phone
 *     (password stored as a salted SHA-256 hash in the secure store). Nothing is uploaded.
 *
 * App lock: a 4-digit PIN (salted hash in the secure store) is required; fingerprint / Face ID
 * can be turned on as a faster way in (expo-local-authentication). After 5 wrong PINs the
 * keypad waits 30 seconds.
 *
 * Re-lock delay comes from Settings (prefs.autoLock): immediately, 1 min (default), 5 min, or
 * only when the app starts.
 */
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useApp } from './app-store';

const K = {
  account: 'kesefly.account',
  session: 'kesefly.session',
  password: 'kesefly.password',
  pin: 'kesefly.pin',
  biometric: 'kesefly.biometric',
} as const;

const MAX_TRIES = 5;
const WAIT_MS = 30_000;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const CLOUD = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

export type Account = { email: string; name: string; mode: 'cloud' | 'device' };
type Session = { access_token: string; refresh_token: string; expires_at: number };

export type AuthError = 'invalid' | 'exists' | 'weak' | 'network' | 'confirm' | 'email';

export class AuthFailure extends Error {
  constructor(public code: AuthError) {
    super(code);
  }
}

type Status = 'loading' | 'signedOut' | 'needsPin' | 'locked' | 'ready';

type AuthState = {
  status: Status;
  account: Account | null;
  biometric: boolean;
  biometricType: 'face' | 'fingerprint' | null;
  /** ms until the keypad accepts input again after too many wrong PINs. */
  waitUntil: number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: (prompt: string) => Promise<boolean>;
  setBiometric: (on: boolean, prompt: string) => Promise<boolean>;
  lock: () => void;
  changePin: () => void;
};

const Ctx = createContext<AuthState | null>(null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hashWithSalt(value: string, salt?: string): Promise<string> {
  const s = salt ?? Crypto.randomUUID();
  const h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${s}:${value}`);
  return `${s}:${h}`;
}

async function verifyHash(value: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [salt] = stored.split(':');
  return (await hashWithSalt(value, salt)) === stored;
}

/* ---------- Supabase REST ---------- */

async function supabase(path: string, body: object, token?: string): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthFailure('network');
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = String(json.msg ?? json.error_description ?? json.message ?? '').toLowerCase();
    if (msg.includes('already')) throw new AuthFailure('exists');
    if (msg.includes('password')) throw new AuthFailure(res.status === 400 && msg.includes('invalid') ? 'invalid' : 'weak');
    if (msg.includes('confirm')) throw new AuthFailure('confirm');
    throw new AuthFailure(res.status >= 500 ? 'network' : 'invalid');
  }
  return json;
}

function toSession(j: Record<string, unknown>): Session | null {
  if (typeof j.access_token !== 'string') return null;
  return {
    access_token: j.access_token,
    refresh_token: String(j.refresh_token ?? ''),
    expires_at: Date.now() + Number(j.expires_in ?? 3600) * 1000,
  };
}

/* ---------- Provider ---------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [biometric, setBio] = useState(false);
  const [biometricType, setBioType] = useState<'face' | 'fingerprint' | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const tries = useRef(0);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [acc, pin, bio, types] = await Promise.all([
          SecureStore.getItemAsync(K.account),
          SecureStore.getItemAsync(K.pin),
          SecureStore.getItemAsync(K.biometric),
          LocalAuthentication.supportedAuthenticationTypesAsync().catch((): LocalAuthentication.AuthenticationType[] => []),
        ]);
        setBioType(
          types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
            ? 'face'
            : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
              ? 'fingerprint'
              : null,
        );
        setBio(bio === '1');
        if (!acc) return setStatus('signedOut');
        setAccount(JSON.parse(acc) as Account);
        setStatus(pin ? 'locked' : 'needsPin');
        // Refresh a cloud session quietly; a failure keeps the user signed in on this device.
        const sess = await SecureStore.getItemAsync(K.session);
        if (CLOUD && sess) {
          const s = JSON.parse(sess) as Session;
          if (s.expires_at < Date.now() + 5 * 60_000 && s.refresh_token) {
            const j = await supabase('token?grant_type=refresh_token', { refresh_token: s.refresh_token }).catch(() => null);
            const next = j && toSession(j);
            if (next) await SecureStore.setItemAsync(K.session, JSON.stringify(next));
          }
        }
      } catch {
        setStatus('signedOut');
      }
    })();
  }, []);

  // Re-lock after time in the background (Settings: auto-lock).
  const { prefs } = useApp();
  const autoLock = prefs.autoLock;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') backgroundAt.current = Date.now();
      if (st === 'active' && backgroundAt.current !== null) {
        const away = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (autoLock >= 0 && away >= autoLock * 1000) setStatus((cur) => (cur === 'ready' ? 'locked' : cur));
      }
    });
    return () => sub.remove();
  }, [autoLock]);

  const finishSignIn = useCallback(async (acc: Account) => {
    await SecureStore.setItemAsync(K.account, JSON.stringify(acc));
    setAccount(acc);
    const pin = await SecureStore.getItemAsync(K.pin);
    setStatus(pin ? 'ready' : 'needsPin');
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const mail = email.trim().toLowerCase();
      if (!EMAIL_RE.test(mail)) throw new AuthFailure('email');
      if (password.length < 8) throw new AuthFailure('weak');
      if (CLOUD) {
        const j = await supabase('signup', { email: mail, password, data: { name: name.trim() } });
        const sess = toSession(j);
        // Projects with email confirmation on return no session until the link is clicked.
        if (!sess) throw new AuthFailure('confirm');
        await SecureStore.setItemAsync(K.session, JSON.stringify(sess));
        return finishSignIn({ email: mail, name: name.trim(), mode: 'cloud' });
      }
      await SecureStore.setItemAsync(K.password, await hashWithSalt(password));
      return finishSignIn({ email: mail, name: name.trim(), mode: 'device' });
    },
    [finishSignIn],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const mail = email.trim().toLowerCase();
      if (!EMAIL_RE.test(mail)) throw new AuthFailure('email');
      if (CLOUD) {
        const j = await supabase('token?grant_type=password', { email: mail, password });
        const sess = toSession(j);
        if (!sess) throw new AuthFailure('invalid');
        await SecureStore.setItemAsync(K.session, JSON.stringify(sess));
        const meta = (j.user as { user_metadata?: { name?: string } } | undefined)?.user_metadata;
        return finishSignIn({ email: mail, name: meta?.name ?? mail.split('@')[0], mode: 'cloud' });
      }
      // Device mode: the account and password hash must already be on this phone.
      const acc = await SecureStore.getItemAsync(`${K.account}.last`);
      const prev = acc ? (JSON.parse(acc) as Account) : null;
      if (!prev || prev.email !== mail || !(await verifyHash(password, await SecureStore.getItemAsync(K.password)))) {
        throw new AuthFailure('invalid');
      }
      return finishSignIn(prev);
    },
    [finishSignIn],
  );

  const resetPassword = useCallback(async (email: string) => {
    if (!CLOUD) throw new AuthFailure('invalid');
    await supabase('recover', { email: email.trim().toLowerCase() });
  }, []);

  const signOut = useCallback(async () => {
    const sess = await SecureStore.getItemAsync(K.session);
    if (CLOUD && sess) {
      await supabase('logout', {}, (JSON.parse(sess) as Session).access_token).catch(() => {});
    }
    // Device accounts stay on the phone so the user can sign back in with the same password.
    const acc = await SecureStore.getItemAsync(K.account);
    if (acc) await SecureStore.setItemAsync(`${K.account}.last`, acc);
    await Promise.all([K.account, K.session, K.pin, K.biometric].map((k) => SecureStore.deleteItemAsync(k)));
    setAccount(null);
    setBio(false);
    setStatus('signedOut');
  }, []);

  const setPin = useCallback(async (pin: string) => {
    await SecureStore.setItemAsync(K.pin, await hashWithSalt(pin));
    tries.current = 0;
    setStatus('ready');
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    if (Date.now() < waitUntil) return false;
    const ok = await verifyHash(pin, await SecureStore.getItemAsync(K.pin));
    if (ok) {
      tries.current = 0;
      setStatus('ready');
      return true;
    }
    tries.current += 1;
    if (tries.current >= MAX_TRIES) {
      tries.current = 0;
      setWaitUntil(Date.now() + WAIT_MS);
    }
    return false;
  }, [waitUntil]);

  const unlockWithBiometric = useCallback(async (prompt: string) => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: true, cancelLabel: undefined });
    if (r.success) setStatus('ready');
    return r.success;
  }, []);

  const setBiometric = useCallback(async (on: boolean, prompt: string) => {
    if (on) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) return false;
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: true });
      if (!r.success) return false;
    }
    await SecureStore.setItemAsync(K.biometric, on ? '1' : '0');
    setBio(on);
    return true;
  }, []);

  const lock = useCallback(() => setStatus((s) => (s === 'ready' ? 'locked' : s)), []);
  /** Opens the PIN setup again (the user is already unlocked). */
  const changePin = useCallback(() => setStatus((s) => (s === 'ready' ? 'needsPin' : s)), []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      account,
      biometric,
      biometricType,
      waitUntil,
      signIn,
      signUp,
      resetPassword,
      signOut,
      setPin,
      unlockWithPin,
      unlockWithBiometric,
      setBiometric,
      lock,
      changePin,
    }),
    [status, account, biometric, biometricType, waitUntil, signIn, signUp, resetPassword, signOut, setPin, unlockWithPin, unlockWithBiometric, setBiometric, lock, changePin],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}
