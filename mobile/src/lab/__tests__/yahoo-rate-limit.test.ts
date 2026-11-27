/** Yahoo quotes and history (engine/stocks.ts) against a mocked fetch: 429 cooldown, parallel cap. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { limiter } from '@/engine/concurrency';

type Stocks = typeof import('@/engine/stocks');

const chart = (symbol: string, price: number) => ({
  chart: { result: [{ meta: { symbol, currency: 'USD', regularMarketPrice: price, chartPreviousClose: price }, timestamp: [1, 2], indicators: { quote: [{ close: [price, price] }] } }] },
});

/** Mocked fetch: answers with `status()` (200 by default) and records the URLs it was asked for. */
function mockFetch(status: () => number = () => 200) {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(url);
      const sym = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
      const s = status();
      return new Response(s === 200 ? JSON.stringify(chart(sym, 100)) : '{}', { status: s });
    }),
  );
  return urls;
}

/** Fresh module each test: the cooldown and caches are module state. */
async function load(): Promise<Stocks> {
  vi.resetModules();
  return import('@/engine/stocks');
}

const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: { code?: string }) => e.code);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-27T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Yahoo 429 cooldown', () => {
  it('starts a 60 s pause after a 429 and serves the cached quote meanwhile', async () => {
    const st = await load();
    let status = 200;
    const urls = mockFetch(() => status);
    expect((await st.getQuote('AAPL')).price).toBe(100);
    status = 429;
    expect(await code(st.getQuote('AAPL', true))).toBe('rateLimit');
    expect(urls).toHaveLength(2);

    // Inside the pause: no network; the cached quote, even when stale or forced; else rateLimit.
    vi.advanceTimersByTime(59_000);
    expect((await st.getQuote('AAPL', true)).price).toBe(100);
    expect(await code(st.getQuote('MSFT'))).toBe('rateLimit');
    expect(urls).toHaveLength(2);

    // After 60 s Yahoo is asked again.
    status = 200;
    vi.advanceTimersByTime(1_000);
    expect((await st.getQuote('MSFT')).price).toBe(100);
    expect(urls).toHaveLength(3);
  });

  it('doubles the pause on repeated 429s, caps it at 15 min and resets after a success', async () => {
    const st = await load();
    let status = 429;
    const urls = mockFetch(() => status);
    const pauses: number[] = [];
    // Each round: a 429, then measure how long Yahoo stays untouched.
    for (let round = 0; round < 6; round++) {
      expect(await code(st.getQuote('AAPL', true))).toBe('rateLimit');
      const asked = urls.length;
      let waited = 0;
      while (urls.length === asked) {
        vi.advanceTimersByTime(1_000);
        waited += 1_000;
        await code(st.getQuote('AAPL', true));
      }
      pauses.push(waited);
    }
    // The probe that ends each pause is itself the next round's 429, so rounds chain up.
    expect(pauses).toEqual([60_000, 120_000, 240_000, 480_000, 900_000, 900_000]);

    // A success resets: the next 429 pauses 60 s again.
    vi.advanceTimersByTime(900_000);
    status = 200;
    expect(await code(st.getQuote('AAPL', true))).toBe('ok');
    status = 429;
    expect(await code(st.getQuote('AAPL', true))).toBe('rateLimit');
    const asked = urls.length;
    vi.advanceTimersByTime(59_000);
    await code(st.getQuote('AAPL', true));
    expect(urls).toHaveLength(asked);
    vi.advanceTimersByTime(1_000);
    await code(st.getQuote('AAPL', true));
    expect(urls).toHaveLength(asked + 1);
  });

  it('counts parallel 429s as one', async () => {
    const st = await load();
    let status = 429;
    const urls = mockFetch(() => status);
    await st.getQuotes(['A', 'B', 'C', 'D']);
    expect(urls).toHaveLength(4);
    status = 200;
    vi.advanceTimersByTime(60_000);
    expect(await code(st.getQuote('A'))).toBe('ok');
  });

  it('leaves Maya funds alone during the pause', async () => {
    const st = await load();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('maya.tase.co.il') ? new Response(JSON.stringify({ name: 'Fund', purchasePrice: 12345 }), { status: 200 }) : new Response('{}', { status: 429 }),
      ),
    );
    expect(await code(st.getQuote('AAPL'))).toBe('rateLimit');
    expect((await st.getQuote('5117957.TA')).price).toBeCloseTo(123.45);
  });
});

describe('Yahoo history 429', () => {
  it('returns rateLimit, not network, and starts the quote pause', async () => {
    const st = await load();
    const urls = mockFetch(() => 429);
    expect(await code(st.getHistory('AAPL', '1Y'))).toBe('rateLimit');
    expect(await code(st.getHistorySince('AAPL', Date.now() - 30 * 86400_000))).toBe('rateLimit');
    expect(urls).toHaveLength(2);
    expect(await code(st.getQuote('AAPL'))).toBe('rateLimit');
    expect(urls).toHaveLength(2);
  });

  it('still maps other HTTP errors to network', async () => {
    const st = await load();
    mockFetch(() => 503);
    expect(await code(st.getHistory('AAPL', '1Y'))).toBe('network');
    expect(await code(st.getHistorySince('AAPL', Date.now() - 30 * 86400_000))).toBe('network');
  });
});

describe('parallel cap', () => {
  it('limiter never runs more than max tasks at once', async () => {
    const run = limiter(4);
    let active = 0;
    let peak = 0;
    const task = async (i: number) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10 + (i % 3)));
      active--;
      return i;
    };
    const all = Promise.all(Array.from({ length: 11 }, (_, i) => run(() => task(i))));
    await vi.runAllTimersAsync();
    expect(await all).toEqual(Array.from({ length: 11 }, (_, i) => i));
    expect(peak).toBe(4);
  });

  it('frees the slot when a task throws', async () => {
    const run = limiter(1);
    await expect(run(async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(await run(async () => 'next')).toBe('next');
  });

  it('getQuotes sends at most 4 Yahoo requests at once', async () => {
    const st = await load();
    let inFlight = 0;
    let peak = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 50));
        inFlight--;
        const sym = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
        return new Response(JSON.stringify(chart(sym, 100)), { status: 200 });
      }),
    );
    const syms = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const p = st.getQuotes(syms);
    await vi.runAllTimersAsync();
    const out = await p;
    expect(Object.keys(out).sort()).toEqual(syms);
    expect(peak).toBe(4);
  });
});
