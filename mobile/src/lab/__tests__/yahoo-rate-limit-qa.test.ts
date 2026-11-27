/** QA follow-up for P-076 step 1: edge cases of the Yahoo 429 cooldown and the 4-request cap. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Stocks = typeof import('@/engine/stocks');

const chart = (symbol: string, price: number) => ({
  chart: { result: [{ meta: { symbol, currency: 'USD', regularMarketPrice: price, chartPreviousClose: price }, timestamp: [1, 2], indicators: { quote: [{ close: [price, price] }] } }] },
});

/** Mocked fetch: `answer(url)` gives the status (or throws); records the URLs it was asked for. */
function mockFetch(answer: (url: string) => number) {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(url);
      const sym = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
      const s = answer(url);
      return new Response(s === 200 ? JSON.stringify(chart(sym, 100)) : '{}', { status: s });
    }),
  );
  return urls;
}

async function load(): Promise<Stocks> {
  vi.resetModules();
  return import('@/engine/stocks');
}

const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: { code?: string }) => e.code);
const isHistory = (url: string) => !url.includes('range=1d&interval=1d');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-27T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Yahoo 429 cooldown, QA edge cases', () => {
  it('requests still queued for a slot when a 429 lands do not reach Yahoo', async () => {
    const st = await load();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        await gate;
        return new Response('{}', { status: 429 });
      }),
    );
    const p = st.getQuotes(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    await Promise.resolve();
    release();
    expect(await p).toEqual({});
    // Only the first 4 (in flight) were sent; the 4 queued ones saw the pause.
    expect(urls).toHaveLength(4);
  });

  it('a non-429 failure does not start the pause', async () => {
    const st = await load();
    let status = 503;
    const urls = mockFetch(() => status);
    expect(await code(st.getQuote('AAPL'))).toBe('network');
    status = 200;
    expect(await code(st.getQuote('AAPL'))).toBe('ok');
    expect(urls).toHaveLength(2);
  });

  it('a fetch that throws frees its slot (no limiter deadlock)', async () => {
    const st = await load();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );
    const syms = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    expect(await st.getQuotes(syms)).toEqual({});
    const urls = mockFetch(() => 200);
    expect(Object.keys(await st.getQuotes(syms)).sort()).toEqual(syms);
    expect(urls).toHaveLength(syms.length);
  });

  it('history is not paused, and a history success inside the pause does not end it', async () => {
    const st = await load();
    let quote = 429;
    const urls = mockFetch((url) => (isHistory(url) ? 200 : quote));
    expect(await code(st.getQuote('AAPL'))).toBe('rateLimit');
    expect(await code(st.getHistory('AAPL', '1Y'))).toBe('ok');
    expect(urls).toHaveLength(2);
    expect(await code(st.getQuote('MSFT'))).toBe('rateLimit');
    expect(urls).toHaveLength(2);
    // Nor does it reset the doubling: the next 429 after the pause pauses 120 s.
    vi.advanceTimersByTime(60_000);
    expect(await code(st.getQuote('AAPL', true))).toBe('rateLimit');
    const asked = urls.length;
    vi.advanceTimersByTime(119_000);
    await code(st.getQuote('AAPL', true));
    expect(urls).toHaveLength(asked);
  });

  it('a history success after the pause resets the doubling', async () => {
    const st = await load();
    let quote = 429;
    const urls = mockFetch((url) => (isHistory(url) ? 200 : quote));
    expect(await code(st.getQuote('AAPL'))).toBe('rateLimit');
    vi.advanceTimersByTime(60_000);
    expect(await code(st.getHistory('AAPL', '1Y'))).toBe('ok');
    // Next 429 starts at 60 s again, not 120 s.
    expect(await code(st.getQuote('AAPL', true))).toBe('rateLimit');
    const asked = urls.length;
    vi.advanceTimersByTime(60_000);
    quote = 200;
    expect(await code(st.getQuote('AAPL', true))).toBe('ok');
    expect(urls).toHaveLength(asked + 1);
  });

  it('without a success between pauses, the next 429 doubles the pause', async () => {
    const st = await load();
    const urls = mockFetch(() => 429);
    expect(await code(st.getQuote('AAPL'))).toBe('rateLimit');
    vi.advanceTimersByTime(60_000);
    expect(await code(st.getQuote('AAPL'))).toBe('rateLimit');
    const asked = urls.length;
    vi.advanceTimersByTime(119_000);
    await code(st.getQuote('AAPL'));
    expect(urls).toHaveLength(asked);
    vi.advanceTimersByTime(1_000);
    await code(st.getQuote('AAPL'));
    expect(urls).toHaveLength(asked + 1);
  });
});
