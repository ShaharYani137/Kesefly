/**
 * Finnhub market data client (https://finnhub.io/docs/api).
 * The free plan covers US-listed symbols, including Israeli companies traded in New York.
 * The user supplies their own key; it is stored on the device only.
 */

export type Quote = {
  symbol: string;
  /** Current price. */
  price: number;
  /** Change since previous close. */
  change: number;
  /** Change since previous close, as a fraction (0.012 = 1.2%). */
  changePct: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  /** Quote time, ms since epoch. */
  time: number;
};

export class StockError extends Error {
  constructor(
    public code: 'noKey' | 'badKey' | 'notFound' | 'network' | 'rateLimit',
    message?: string,
  ) {
    super(message ?? code);
  }
}

const BASE = 'https://finnhub.io/api/v1';
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; quote: Quote }>();

type FinnhubQuote = { c: number; d: number | null; dp: number | null; h: number; l: number; o: number; pc: number; t: number };

export async function getQuote(symbol: string, key: string, force = false): Promise<Quote> {
  if (!key) throw new StockError('noKey');
  const sym = symbol.toUpperCase();
  const hit = cache.get(sym);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.quote;

  let res: Response;
  try {
    res = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(key)}`);
  } catch {
    throw new StockError('network');
  }
  if (res.status === 401 || res.status === 403) throw new StockError('badKey');
  if (res.status === 429) throw new StockError('rateLimit');
  if (!res.ok) throw new StockError('network', `HTTP ${res.status}`);

  const q = (await res.json()) as FinnhubQuote;
  // Finnhub returns all zeros for unknown symbols.
  if (!q || !q.c) throw new StockError('notFound');

  const quote: Quote = {
    symbol: sym,
    price: q.c,
    change: q.d ?? q.c - q.pc,
    changePct: (q.dp ?? (q.pc ? ((q.c - q.pc) / q.pc) * 100 : 0)) / 100,
    high: q.h,
    low: q.l,
    open: q.o,
    prevClose: q.pc,
    time: q.t ? q.t * 1000 : Date.now(),
  };
  cache.set(sym, { at: Date.now(), quote });
  return quote;
}

/** Symbols that look like tickers: 1–5 letters, optional class suffix (BRK.B). */
export function isTicker(text: string): boolean {
  return /^[A-Z]{1,5}(\.[A-Z])?$/.test(text);
}

export function formatPrice(v: number, lang: 'en' | 'he'): string {
  return new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatSigned(v: number, lang: 'en' | 'he', pct = false): string {
  const f = new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US', {
    style: pct ? 'percent' : 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  });
  return f.format(v);
}
