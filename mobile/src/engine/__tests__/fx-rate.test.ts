/** USD/ILS rate (P-074): no 1:1 conversion without a rate, last good rate kept and stored. */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));

const FX_KEY = 'kesefly/fx-usdils/v1';

/** A Yahoo chart response for ILS=X at `price`. */
const ok = (price: number) => ({
  ok: true,
  status: 200,
  json: async () => ({ chart: { result: [{ meta: { symbol: 'ILS=X', currency: 'ILS', regularMarketPrice: price } }], error: null } }),
});
const tooMany = () => ({ ok: false, status: 429, json: async () => ({}) });

const realFetch = globalThis.fetch;
let replies: (() => unknown)[] = [];
const fetchMock = vi.fn(async () => {
  const next = replies.shift();
  if (!next) throw new TypeError('Network request failed');
  return next();
});

/** Lets the fire-and-forget AsyncStorage write finish. */
const flush = () => new Promise((r) => setTimeout(r, 0));

// Loaded after the storage mock is in place.
let stocks: typeof import('@/engine/stocks');
let convertAt: typeof import('@/engine/benchmark').convertAt;
let formatMoney: typeof import('@/engine/format').formatMoney;
beforeAll(async () => {
  stocks = await import('@/engine/stocks');
  convertAt = (await import('@/engine/benchmark')).convertAt;
  formatMoney = (await import('@/engine/format')).formatMoney;
});
const convert = (...a: Parameters<typeof stocks.convert>) => stocks.convert(...a);
const formatPrice = (...a: Parameters<typeof stocks.formatPrice>) => stocks.formatPrice(...a);
const formatSigned = (...a: Parameters<typeof stocks.formatSigned>) => stocks.formatSigned(...a);
const getUsdIls = () => stocks.getUsdIls();
const getUsdIlsInfo = (force?: boolean) => stocks.getUsdIlsInfo(force);
const lastUsdIls = () => stocks.lastUsdIls();

beforeEach(() => {
  store.clear();
  replies = [];
  fetchMock.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  stocks.resetUsdIlsForTests();
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('convert without a rate', () => {
  it('never converts USD <-> ILS 1:1', () => {
    expect(convert(100, 'USD', 'ILS', null)).toBeNaN();
    expect(convert(360, 'ILS', 'USD', null)).toBeNaN();
    expect(convertAt(100, 'USD', 'ILS', null)).toBeNaN();
    expect(convertAt(360, 'ILS', 'USD', null)).toBeNaN();
  });

  it('keeps same-currency and other-currency amounts as before', () => {
    expect(convert(100, 'USD', 'USD', null)).toBe(100);
    expect(convert(100, 'ILS', 'ILS', null)).toBe(100);
    expect(convert(100, 'EUR', 'ILS', null)).toBe(100);
  });

  it('math is unchanged when a rate exists', () => {
    expect(convert(100, 'USD', 'ILS', 3.6)).toBeCloseTo(360);
    expect(convert(360, 'ILS', 'USD', 3.6)).toBeCloseTo(100);
    expect(convertAt(100, 'USD', 'ILS', 3.6)).toBeCloseTo(360);
    expect(convert(100, 'EUR', 'ILS', 3.6)).toBe(100);
  });

  it('formats a missing amount as a dash, not NaN', () => {
    expect(formatPrice(NaN, 'ILS', 'en')).toBe('—');
    expect(formatSigned(NaN, 'ILS', 'he')).toBe('—');
    expect(formatSigned(NaN, 'USD', 'en', true)).toBe('—');
    expect(formatMoney(NaN, 'ILS', 'he')).toBe('—');
    expect(formatMoney(NaN, 'USD', 'en', true)).toBe('—');
  });
});

describe('getUsdIlsInfo', () => {
  it('returns null with no rate ever fetched and the network down', async () => {
    expect(await getUsdIlsInfo()).toEqual({ rate: null, at: null, fresh: false });
    expect(await getUsdIls()).toBeNull();
  });

  it('stores a good rate', async () => {
    replies = [() => ok(3.7)];
    const r = await getUsdIlsInfo();
    expect(r.rate).toBe(3.7);
    expect(r.fresh).toBe(true);
    await flush();
    expect(JSON.parse(store.get(FX_KEY)!)).toEqual({ rate: 3.7, at: r.at });
    expect(lastUsdIls()).toEqual({ rate: 3.7, at: r.at });
  });

  it('does not overwrite a good rate after a 429 or a network failure', async () => {
    replies = [() => ok(3.7), tooMany];
    const good = await getUsdIlsInfo();
    const after429 = await getUsdIlsInfo(true);
    expect(after429).toEqual({ rate: 3.7, at: good.at, fresh: false });
    const offline = await getUsdIlsInfo(true);
    expect(offline).toEqual({ rate: 3.7, at: good.at, fresh: false });
    await flush();
    expect(JSON.parse(store.get(FX_KEY)!).rate).toBe(3.7);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses the stored rate on an offline cold start', async () => {
    store.set(FX_KEY, JSON.stringify({ rate: 3.65, at: 1_700_000_000_000 }));
    expect(lastUsdIls()).toBeNull();
    expect(await getUsdIlsInfo()).toEqual({ rate: 3.65, at: 1_700_000_000_000, fresh: false });
    expect(await getUsdIls()).toBe(3.65);
  });

  it('ignores a broken stored value', async () => {
    store.set(FX_KEY, JSON.stringify({ rate: 0, at: 1 }));
    expect((await getUsdIlsInfo()).rate).toBeNull();
    stocks.resetUsdIlsForTests();
    store.set(FX_KEY, '{not json');
    expect((await getUsdIlsInfo()).rate).toBeNull();
  });

  it('a live rate wins over an older stored one', async () => {
    store.set(FX_KEY, JSON.stringify({ rate: 3.5, at: 1 }));
    replies = [() => ok(3.8)];
    const r = await getUsdIlsInfo();
    expect(r).toMatchObject({ rate: 3.8, fresh: true });
    // A later failure falls back to the live rate, not the older stored one.
    expect((await getUsdIlsInfo(true)).rate).toBe(3.8);
  });
});
