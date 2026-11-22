/**
 * Intraday and daily candles for the Day-Trading Lab, from Yahoo Finance's free chart
 * endpoint (unofficial, can lag; bars are not single trades).
 *
 *   https://query2.finance.yahoo.com/v8/finance/chart/<SYM>?range=1d&interval=5m
 *   https://query2.finance.yahoo.com/v7/finance/spark?symbols=A,B&range=3mo&interval=1d
 *
 * - 1- and 5-minute candles (open, high, low, close, volume); Tel Aviv prices come in agorot
 *   and are converted to shekels here (volume is unchanged).
 * - Short cache: 20 s for today's bars, 60 s for 5 days, 10 min for 60 days and daily bars.
 * - Polite retries: query2 first; on HTTP 429, a 5xx or a network error, wait and try query1
 *   once. Spark asks for at most 20 symbols a request, with a pause between requests.
 */
export type Interval = '1m' | '5m' | '1d';
export type ChartRange = '1d' | '5d' | '60d' | '3mo' | '6mo';

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export type Chart = {
  symbol: string;
  currency: string;
  /** Latest price (shekels for Tel Aviv). */
  price: number | null;
  prevClose: number | null;
  /** Time of Yahoo's last trade (UTC ms), or null. */
  dataTime: number | null;
  /** Today's volume so far. */
  volume: number | null;
  name: string;
  granularity: string | null;
  /** Oldest first; bars with no close are dropped, missing o/h/l take the close. */
  bars: Candle[];
};

export class CandleError extends Error {
  constructor(public code: 'network' | 'notFound' | 'rateLimit', msg?: string) {
    super(msg ?? code);
  }
}

const HOSTS = ['https://query2.finance.yahoo.com', 'https://query1.finance.yahoo.com'];
const HEADERS = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const SPARK_MAX = 20;
const PAUSE_MS = 300;
const BACKOFF_MS = 2000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Raw = {
  meta?: Record<string, unknown>;
  timestamp?: (number | null)[];
  indicators?: { quote?: Record<string, (number | null)[] | undefined>[] };
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** One Yahoo chart result (v8 chart, or one spark response) -> Chart. Pure. */
export function parseResult(r: Raw, fallbackSymbol = ''): Chart {
  const m = r.meta ?? {};
  const k = m.currency === 'ILA' ? 0.01 : 1;
  const q = r.indicators?.quote?.[0] ?? {};
  const col = (name: string) => q[name] ?? [];
  const [o, h, l, c, v] = ['open', 'high', 'low', 'close', 'volume'].map(col);
  const bars: Candle[] = [];
  (r.timestamp ?? []).forEach((t, i) => {
    const close = num(c[i]);
    if (t == null || close == null) return;
    bars.push({
      t: t * 1000,
      o: (num(o[i]) ?? close) * k,
      h: (num(h[i]) ?? close) * k,
      l: (num(l[i]) ?? close) * k,
      c: close * k,
      v: num(v[i]) ?? 0,
    });
  });
  const price = num(m.regularMarketPrice);
  const prev = num(m.previousClose) ?? num(m.chartPreviousClose);
  const time = num(m.regularMarketTime);
  return {
    symbol: String(m.symbol ?? fallbackSymbol).toUpperCase(),
    currency: k === 0.01 ? 'ILS' : String(m.currency ?? 'USD'),
    price: price == null ? null : price * k,
    prevClose: prev == null ? null : prev * k,
    dataTime: time == null ? null : time * 1000,
    volume: num(m.regularMarketVolume),
    name: String(m.shortName ?? m.longName ?? m.symbol ?? fallbackSymbol),
    granularity: typeof m.dataGranularity === 'string' ? m.dataGranularity : null,
    bars,
  };
}

/** A full v8 chart JSON body -> Chart. Pure. */
export function parseChart(body: unknown, symbol = ''): Chart {
  const res = (body as { chart?: { result?: Raw[] | null; error?: { description?: string } | null } })?.chart;
  const r = res?.result?.[0];
  if (!r) throw new CandleError('notFound', res?.error?.description ?? `no data for ${symbol}`);
  return parseResult(r, symbol);
}

/** A spark JSON body -> { SYMBOL: Chart }. Unknown symbols are simply missing. Pure. */
export function parseSpark(body: unknown): Record<string, Chart> {
  const out: Record<string, Chart> = {};
  const list = (body as { spark?: { result?: { symbol: string; response?: Raw[] }[] } })?.spark?.result ?? [];
  for (const item of list) {
    const r = item.response?.[0];
    if (r) out[item.symbol.toUpperCase()] = parseResult(r, item.symbol);
  }
  return out;
}

async function yahoo(path: string): Promise<unknown> {
  let last: CandleError = new CandleError('network');
  for (let h = 0; h < HOSTS.length; h++) {
    let res: Response;
    try {
      res = await fetch(HOSTS[h] + path, { headers: HEADERS });
    } catch {
      last = new CandleError('network');
      continue;
    }
    if (res.status === 404) throw new CandleError('notFound');
    if (res.status === 429 || res.status >= 500) {
      last = new CandleError(res.status === 429 ? 'rateLimit' : 'network', `HTTP ${res.status}`);
      if (h === 0) await wait(BACKOFF_MS);
      continue;
    }
    if (!res.ok) throw new CandleError('network', `HTTP ${res.status}`);
    return res.json();
  }
  throw last;
}

const cache = new Map<string, { at: number; value: unknown }>();
const ttl = (range: ChartRange, interval: Interval) => (interval === '1d' || range === '60d' ? 600_000 : range === '5d' ? 60_000 : 20_000);

/** Candles for one symbol. Tel Aviv in shekels. */
export async function getCandles(symbol: string, interval: Interval = '5m', range: ChartRange = '1d', force = false): Promise<Chart> {
  const sym = symbol.toUpperCase();
  const key = `c|${sym}|${interval}|${range}`;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < ttl(range, interval)) return hit.value as Chart;
  const body = await yahoo(`/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}&includePrePost=false`);
  const chart = parseChart(body, sym);
  cache.set(key, { at: Date.now(), value: chart });
  return chart;
}

/**
 * Many symbols at once (closes only, plus meta), 20 per request. Used by the scanner:
 * daily closes (range 3mo, interval 1d) and today's 5-minute closes (range 1d, interval 5m).
 */
export async function getSpark(symbols: string[], interval: Interval, range: ChartRange, onProgress?: (done: number, total: number) => void): Promise<Record<string, Chart>> {
  const out: Record<string, Chart> = {};
  const todo: string[] = [];
  for (const s of symbols.map((x) => x.toUpperCase())) {
    const hit = cache.get(`s|${s}|${interval}|${range}`);
    if (hit && Date.now() - hit.at < ttl(range, interval)) out[s] = hit.value as Chart;
    else todo.push(s);
  }
  for (let i = 0; i < todo.length; i += SPARK_MAX) {
    const batch = todo.slice(i, i + SPARK_MAX);
    if (i > 0) await wait(PAUSE_MS);
    try {
      const got = parseSpark(await yahoo(`/v7/finance/spark?symbols=${batch.map(encodeURIComponent).join(',')}&range=${range}&interval=${interval}`));
      for (const [s, c] of Object.entries(got)) {
        out[s] = c;
        cache.set(`s|${s}|${interval}|${range}`, { at: Date.now(), value: c });
      }
    } catch (e) {
      // One failed batch should not sink the scan; the rest still count.
      if (e instanceof CandleError && e.code === 'rateLimit') await wait(BACKOFF_MS);
    }
    onProgress?.(Math.min(i + SPARK_MAX, todo.length), todo.length);
  }
  return out;
}
