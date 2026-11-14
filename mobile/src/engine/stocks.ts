/**
 * Free market data, no API key: Yahoo Finance public chart endpoint
 * (https://query1.finance.yahoo.com/v8/finance/chart/<symbol>).
 *
 * Covers US symbols (AAPL, SPY) and Tel Aviv symbols with the `.TA` suffix (TEVA.TA, ^TA125.TA).
 * Tel Aviv stocks are quoted in agorot (currency "ILA"); we convert to shekels (ILS).
 *
 * Caveat: this endpoint is unofficial and has no service guarantee. Prices may be delayed.
 * Keep all access in this file so the provider can be swapped without touching the UI.
 */

export type Quote = {
  symbol: string;
  name: string;
  /** ISO currency of the price, e.g. USD or ILS. */
  currency: string;
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
  /** 52-week range, in the display currency. */
  yearHigh: number;
  yearLow: number;
  volume: number;
  exchange: string;
};

export class StockError extends Error {
  constructor(
    public code: 'notFound' | 'network' | 'rateLimit',
    message?: string,
  ) {
    super(message ?? code);
  }
}

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; quote: Quote }>();

type ChartMeta = {
  symbol: string;
  currency?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketTime?: number;
  longName?: string;
  shortName?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketVolume?: number;
  fullExchangeName?: string;
};

type ChartResponse = {
  chart: {
    result?:
      | {
          meta: ChartMeta;
          indicators?: { quote?: { open?: (number | null)[] }[] };
        }[]
      | null;
    error?: { code: string; description: string } | null;
  };
};

export async function getQuote(symbol: string, force = false): Promise<Quote> {
  const sym = symbol.toUpperCase();
  const hit = cache.get(sym);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.quote;

  let res: Response;
  try {
    res = await fetch(`${BASE}${encodeURIComponent(sym)}?range=1d&interval=1d`, {
      // Yahoo rejects some default client user agents.
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
  } catch {
    throw new StockError('network');
  }
  if (res.status === 404) throw new StockError('notFound');
  if (res.status === 429) throw new StockError('rateLimit');
  if (!res.ok) throw new StockError('network', `HTTP ${res.status}`);

  const body = (await res.json()) as ChartResponse;
  const r = body.chart?.result?.[0];
  const m = r?.meta;
  if (!m || !m.regularMarketPrice) throw new StockError('notFound');

  // Tel Aviv prices come in agorot (ILA): 100 agorot = 1 shekel.
  const agorot = m.currency === 'ILA';
  const k = agorot ? 0.01 : 1;
  const price = m.regularMarketPrice * k;
  const prev = (m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice) * k;
  const open = (r?.indicators?.quote?.[0]?.open?.[0] ?? m.regularMarketPrice) * k;

  const quote: Quote = {
    symbol: sym,
    name: m.shortName ?? m.longName ?? sym,
    currency: agorot ? 'ILS' : (m.currency ?? 'USD'),
    price,
    change: price - prev,
    changePct: prev ? (price - prev) / prev : 0,
    high: (m.regularMarketDayHigh ?? m.regularMarketPrice) * k,
    low: (m.regularMarketDayLow ?? m.regularMarketPrice) * k,
    open,
    prevClose: prev,
    time: m.regularMarketTime ? m.regularMarketTime * 1000 : Date.now(),
    yearHigh: (m.fiftyTwoWeekHigh ?? m.regularMarketDayHigh ?? m.regularMarketPrice) * k,
    yearLow: (m.fiftyTwoWeekLow ?? m.regularMarketDayLow ?? m.regularMarketPrice) * k,
    volume: m.regularMarketVolume ?? 0,
    exchange: m.fullExchangeName ?? '',
  };
  cache.set(sym, { at: Date.now(), quote });
  return quote;
}

/**
 * Symbols that look like tickers: starts with a letter (or ^ for an index), up to 6 letters/digits,
 * optional exchange suffix. Examples: AAPL, BRK.B, TEVA.TA, ^TA125.TA.
 */
export function isTicker(text: string): boolean {
  return /^\^?[A-Z][A-Z0-9]{0,5}(\.[A-Z]{1,2})?$/.test(text);
}

const LOCALE = { en: 'en-US', he: 'he-IL' } as const;

export function formatPrice(v: number, currency: string, lang: 'en' | 'he'): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang], {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

export function formatSigned(v: number, currency: string, lang: 'en' | 'he', pct = false): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang], {
      style: pct ? 'percent' : 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: 'exceptZero',
    }).format(v);
  } catch {
    const s = pct ? `${(v * 100).toFixed(2)}%` : v.toFixed(2);
    return v > 0 ? `+${s}` : s;
  }
}

/** Chart ranges offered in the UI, mapped to Yahoo range + interval. */
export const RANGES = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1mo' },
} as const;
export type RangeKey = keyof typeof RANGES;

export type HistoryPoint = { t: number; close: number };

const histCache = new Map<string, { at: number; points: HistoryPoint[] }>();
const HIST_CACHE_MS = 10 * 60_000;

type HistoryResponse = {
  chart: {
    result?: { meta: ChartMeta; timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] | null;
  };
};

/** Closing prices over a range, oldest first, in the quote's display currency (agorot converted to shekels). */
export async function getHistory(symbol: string, key: RangeKey): Promise<HistoryPoint[]> {
  const sym = symbol.toUpperCase();
  const cacheKey = `${sym}|${key}`;
  const hit = histCache.get(cacheKey);
  if (hit && Date.now() - hit.at < HIST_CACHE_MS) return hit.points;

  const { range, interval } = RANGES[key];
  let res: Response;
  try {
    res = await fetch(`${BASE}${encodeURIComponent(sym)}?range=${range}&interval=${interval}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
  } catch {
    throw new StockError('network');
  }
  if (res.status === 404) throw new StockError('notFound');
  if (!res.ok) throw new StockError('network', `HTTP ${res.status}`);
  const r = ((await res.json()) as HistoryResponse).chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const closes = r?.indicators?.quote?.[0]?.close ?? [];
  const k = r?.meta.currency === 'ILA' ? 0.01 : 1;
  const points: HistoryPoint[] = [];
  ts.forEach((t, i) => {
    const c = closes[i];
    if (c != null && Number.isFinite(c)) points.push({ t: t * 1000, close: c * k });
  });
  if (points.length < 2) throw new StockError('notFound');
  histCache.set(cacheKey, { at: Date.now(), points });
  return points;
}

/** Quotes for many symbols; failures are left out instead of failing the whole batch. */
export async function getQuotes(symbols: string[], force = false): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  await Promise.all(
    symbols.map(async (s) => {
      try {
        out[s.toUpperCase()] = await getQuote(s, force);
      } catch {
        // Skip: the caller shows a dash for missing quotes.
      }
    }),
  );
  return out;
}

/** Shekels per dollar (Yahoo symbol ILS=X). */
export async function getUsdIls(): Promise<number | null> {
  try {
    return (await getQuote('ILS=X')).price;
  } catch {
    return null;
  }
}

/** Converts between USD and ILS with a USD/ILS rate. Other currencies pass through unchanged. */
export function convert(v: number, from: string, to: string, usdIls: number | null): number {
  if (from === to || !usdIls) return v;
  if (from === 'USD' && to === 'ILS') return v * usdIls;
  if (from === 'ILS' && to === 'USD') return v / usdIls;
  return v;
}

/** Market overview tiles: indices, the shekel, gold, bitcoin, fear gauge. */
export const MARKET_TILES = ['^GSPC', '^IXIC', '^DJI', '^TA125.TA', 'ILS=X', 'GC=F', 'BTC-USD', '^VIX'] as const;

/** Simple stats over a closing-price series (oldest first). */
export function seriesStats(points: HistoryPoint[]) {
  const closes = points.map((p) => p.close);
  const last = closes[closes.length - 1];
  const first = closes[0];
  const rets = closes.slice(1).map((c, i) => c / closes[i] - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1));
  const tail = closes.slice(-50);
  const avg50 = tail.reduce((a, b) => a + b, 0) / tail.length;
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    maxDrawdown = Math.min(maxDrawdown, c / peak - 1);
  }
  return {
    change: first ? last / first - 1 : 0,
    /** Daily volatility annualized (252 trading days). */
    volatility: sd * Math.sqrt(252),
    aboveAvg50: last >= avg50,
    avg50,
    maxDrawdown,
  };
}
