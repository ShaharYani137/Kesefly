/**
 * Keeps each account's data apart on a shared phone.
 *
 * The stores save under fixed "live" keys (app-store, lab-store, ai-store, brain, tour, event
 * alerts). This module tracks which account owns the live data and swaps it on account change:
 *   - signing out parks the live data under the owner (`<key>@<id>`) and clears the live keys,
 *     so the sign-in screen and the next account start empty;
 *   - signing in restores that account's parked data, or starts empty for a new account.
 * <id> is a short SHA-256 of the email, so the email itself is not written into key names.
 *
 * Data saved before this existed has no owner: the first account to open it claims it.
 *
 * Stores save only while `canSave(loadedAt)` is true: not during a swap, and not with data
 * loaded before the last swap (`generation()`). After a swap they reload (`onAccountSwitch`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/** Live AsyncStorage keys that belong to the signed-in account. Keep in sync with the stores. */
const DATA_KEYS = [
  'investapp/state/v1', // state/app-store.tsx STORAGE_KEY
  'investapp/lab/v1', // state/lab-key.ts LAB_KEY
  'investapp/ai/v1', // state/ai-store.tsx STORE
  'investapp/brain/v1', // engine/brain.ts KEY
  'investapp/tour/v1', // ui/app-tour.tsx SEEN_KEY
  'investapp/events/seen/v1', // state/event-alerts.ts SEEN_KEY
] as const;

/** Live SecureStore keys that belong to the signed-in account (the AI company key). */
const SECURE_KEYS = ['kesefly.ai.apiKey'] as const; // state/ai-store.tsx KEY_SLOT

const OWNER_KEY = 'kesefly/data-owner/v1';

let paused = false;
let gen = 0;
const listeners = new Set<() => void>();

/** Bumps on every swap that changed the live data. */
export const generation = () => gen;

/** A store may save only data it loaded in the current generation, and not during a swap. */
export const canSave = (loadedAt: number) => !paused && loadedAt === gen;

/** Called after a swap so each store reloads its live key. Returns an unsubscribe function. */
export function onAccountSwitch(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function accountId(email: string): Promise<string> {
  const h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email.trim().toLowerCase());
  return h.slice(0, 16);
}

const parked = (key: string, id: string) => `${key}@${id}`;
// SecureStore keys allow only letters, digits, ".", "-" and "_".
const parkedSecure = (key: string, id: string) => `${key}.${id}`;

async function copyLiveTo(id: string) {
  const live = await AsyncStorage.multiGet([...DATA_KEYS]);
  const toSet: [string, string][] = [];
  const toRemove: string[] = [];
  for (const [k, v] of live) {
    if (v === null) toRemove.push(parked(k, id));
    else toSet.push([parked(k, id), v]);
  }
  if (toSet.length) await AsyncStorage.multiSet(toSet);
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  for (const k of SECURE_KEYS) {
    const v = await SecureStore.getItemAsync(k);
    if (v === null) await SecureStore.deleteItemAsync(parkedSecure(k, id));
    else await SecureStore.setItemAsync(parkedSecure(k, id), v);
  }
}

async function clearLive() {
  await AsyncStorage.multiRemove([...DATA_KEYS]);
  for (const k of SECURE_KEYS) await SecureStore.deleteItemAsync(k);
}

async function loadParked(id: string) {
  const saved = await AsyncStorage.multiGet(DATA_KEYS.map((k) => parked(k, id)));
  const toSet: [string, string][] = [];
  saved.forEach(([, v], i) => {
    if (v !== null) toSet.push([DATA_KEYS[i], v]);
  });
  if (toSet.length) await AsyncStorage.multiSet(toSet);
  for (const k of SECURE_KEYS) {
    const v = await SecureStore.getItemAsync(parkedSecure(k, id));
    if (v !== null) await SecureStore.setItemAsync(k, v);
  }
}

async function hasParked(id: string): Promise<boolean> {
  const saved = await AsyncStorage.multiGet(DATA_KEYS.map((k) => parked(k, id)));
  return saved.some(([, v]) => v !== null);
}

async function run(swap: () => Promise<boolean>) {
  paused = true;
  let changed = false;
  try {
    changed = await swap();
    if (changed) gen += 1;
  } finally {
    paused = false;
  }
  if (changed) listeners.forEach((fn) => fn());
}

/** Sign-out: park the live data under its owner and clear it. */
export function parkAccount(): Promise<void> {
  return run(async () => {
    const owner = await AsyncStorage.getItem(OWNER_KEY);
    if (owner) await copyLiveTo(owner);
    await clearLive();
    await AsyncStorage.removeItem(OWNER_KEY);
    return true;
  });
}

/** Sign-in (and app start): make the live data the given account's. */
export function openAccount(email: string): Promise<void> {
  return run(async () => {
    const id = await accountId(email);
    const owner = await AsyncStorage.getItem(OWNER_KEY);
    if (owner === id) return false;
    if (owner) {
      // Another account's data is still live (sign-out did not finish): park it first.
      await copyLiveTo(owner);
      await clearLive();
    } else if (!(await hasParked(id))) {
      // No owner and nothing parked: data from before accounts were separated, or empty. Claim it.
      await AsyncStorage.setItem(OWNER_KEY, id);
      return false;
    } else {
      await clearLive();
    }
    await loadParked(id);
    await AsyncStorage.setItem(OWNER_KEY, id);
    return true;
  });
}
