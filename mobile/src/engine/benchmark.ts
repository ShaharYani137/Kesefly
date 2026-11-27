/**
 * "Same money in an index": replays the user's cash flows (each purchase, sale and dividend,
 * on its date) into a benchmark index and compares the end values. This is the public market
 * equivalent method; it is fair to the timing of deposits, unlike a plain % change.
 * Also gives the money-weighted yearly return (XIRR) of both. Pure: data comes in.
 *
 * Index levels are price-only (no dividends reinvested), so the index side is slightly
 * understated over long periods. Currency: each flow is converted at the USD/ILS rate of its
 * own day when an FX history is given, else at today's rate.
 */
import { closeAt, type HistoryPoint } from './stocks';

export const BENCHMARKS = [
  { symbol: '^GSPC', currency: 'USD' },
  { symbol: '^TA125.TA', currency: 'ILS' },
  { symbol: '^NDX', currency: 'USD' },
  { symbol: 'VT', currency: 'USD' },
] as const;
export type BenchmarkSymbol = (typeof BENCHMARKS)[number]['symbol'];

/** Money in or out of the portfolio, in the user's currency. Negative = money put in. */
export type Flow = { t: number; amount: number };

export type FxRate = (t: number) => number | null;

/** USD/ILS on a given day from a closes series, else a fixed rate. */
export function fxFrom(series: HistoryPoint[] | null, today: number | null): FxRate {
  return (t) => (series?.length ? closeAt(series, t) : today);
}

/** Same rule as `convert` in stocks.ts: USD <-> ILS without a rate is NaN, never 1:1. */
export function convertAt(v: number, from: string, to: string, rate: number | null): number {
  if (from === to || v === 0) return v;
  if (!rate) return (from === 'USD' && to === 'ILS') || (from === 'ILS' && to === 'USD') ? NaN : v;
  if (from === 'USD' && to === 'ILS') return v * rate;
  if (from === 'ILS' && to === 'USD') return v / rate;
  return v;
}

export type BenchmarkResult = {
  /** Value the same flows would have in the index today (user currency). */
  value: number;
  /** Money put in minus money taken out (user currency). */
  netInvested: number;
  /** Money-weighted yearly return of the index replay; null when it cannot be solved. */
  irr: number | null;
  /** Index change over the whole period, price only. */
  indexChange: number;
  from: number;
};

export function replayIndex(flows: Flow[], index: HistoryPoint[], indexCur: string, userCur: string, fx: FxRate, now = Date.now()): BenchmarkResult {
  const sorted = [...flows].sort((a, b) => a.t - b.t);
  let units = 0;
  for (const f of sorted) {
    const inIndexCur = convertAt(-f.amount, userCur, indexCur, fx(f.t));
    units += inIndexCur / closeAt(index, f.t);
  }
  const last = index[index.length - 1].close;
  const value = convertAt(units * last, indexCur, userCur, fx(now));
  const from = sorted[0]?.t ?? now;
  const start = closeAt(index, from);
  return {
    value,
    netInvested: -sorted.reduce((a, f) => a + f.amount, 0),
    irr: xirr([...sorted, { t: now, amount: value }]),
    indexChange: start ? last / start - 1 : 0,
    from,
  };
}

/**
 * Money-weighted yearly return: the rate r where the flows' present value is 0.
 * Bisection (robust, no derivative). Null without both a deposit and a value, or under 30 days
 * (a yearly rate from a few days is noise).
 */
export function xirr(flows: Flow[]): number | null {
  if (flows.length < 2) return null;
  const t0 = Math.min(...flows.map((f) => f.t));
  const t1 = Math.max(...flows.map((f) => f.t));
  if (t1 - t0 < 30 * 86400_000) return null;
  if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
  const npv = (r: number) => flows.reduce((a, f) => a + f.amount / Math.pow(1 + r, (f.t - t0) / (365.25 * 86400_000)), 0);
  let lo = -0.99;
  let hi = 10;
  let flo = npv(lo);
  const fhi = npv(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-7) return mid;
    if (fm * flo < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
