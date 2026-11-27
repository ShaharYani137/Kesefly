/**
 * USD/ILS rate with a last-good fallback (P-074). The last good rate and when it was fetched
 * live in memory and in AsyncStorage, so a failed fetch (offline cold start, HTTP 429) falls
 * back to it instead of to "no rate". A failed fetch never replaces a good rate.
 * Kept apart from stocks.ts so pure engine code does not pull in React Native storage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getQuote } from './stocks';

const FX_KEY = 'kesefly/fx-usdils/v1';
/** Rewrite the stored rate at most this often when it has not changed. */
const FX_SAVE_MS = 5 * 60_000;

export type UsdIls = {
  /** Shekels per dollar; null when no rate was ever fetched on this phone. */
  rate: number | null;
  /** When that rate was fetched (ms since epoch); null with no rate. */
  at: number | null;
  /** True when this call got the rate from the network (or the 60 s quote cache). */
  fresh: boolean;
};

let fxLast: { rate: number; at: number } | null = null;
let fxSavedAt = 0;
let fxLoad: Promise<void> | null = null;

/** A plausible shekels-per-dollar rate. Anything outside (1, 10) is a bad response or bad data. */
export const goodRate = (r: unknown): r is number => typeof r === 'number' && Number.isFinite(r) && r > 1 && r < 10;

/** Reads the stored rate once per app run. Never replaces a newer rate already in memory. */
function loadFx(): Promise<void> {
  fxLoad ??= AsyncStorage.getItem(FX_KEY)
    .then((raw) => {
      const v = raw ? (JSON.parse(raw) as { rate?: unknown; at?: unknown }) : null;
      if (!v || !goodRate(v.rate) || typeof v.at !== 'number' || !Number.isFinite(v.at) || v.at > Date.now()) return;
      if (!fxLast || v.at > fxLast.at) fxLast = { rate: v.rate, at: v.at };
    })
    .catch(() => {});
  return fxLoad;
}

function rememberFx(rate: number, at: number) {
  const changed = fxLast?.rate !== rate;
  fxLast = { rate, at };
  if (changed || at - fxSavedAt >= FX_SAVE_MS) {
    fxSavedAt = at;
    AsyncStorage.setItem(FX_KEY, JSON.stringify(fxLast)).catch(() => {});
  }
}

/** Last good rate known in memory right now (sync), for a first render before any fetch. */
export function lastUsdIls(): { rate: number; at: number } | null {
  return fxLast;
}

/** USD/ILS (Yahoo symbol ILS=X) with when it was fetched; the last good rate if the fetch fails. */
export async function getUsdIlsInfo(force = false): Promise<UsdIls> {
  try {
    const price = (await getQuote('ILS=X', force)).price;
    if (goodRate(price)) {
      const at = Date.now();
      rememberFx(price, at);
      return { rate: price, at, fresh: true };
    }
  } catch {
    // Fall back to the last good rate below.
  }
  await loadFx();
  return fxLast ? { rate: fxLast.rate, at: fxLast.at, fresh: false } : { rate: null, at: null, fresh: false };
}

/** Shekels per dollar; the last good rate when the fetch fails, null only if there never was one. */
export async function getUsdIls(): Promise<number | null> {
  return (await getUsdIlsInfo()).rate;
}

/** Test hook: forget the in-memory rate, as on a cold start. */
export function resetUsdIlsForTests() {
  fxLast = null;
  fxSavedAt = 0;
  fxLoad = null;
}
