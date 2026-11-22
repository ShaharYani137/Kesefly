/**
 * Indicators, same math as the day-trader-skill pack (trader-scanner, trader-exit).
 */
import type { Candle } from './candles';

/** Wilder's RSI on closes. null with fewer than n + 1 closes. */
export function rsi(closes: number[], n = 14): number | null {
  if (closes.length < n + 1) return null;
  const g: number[] = [];
  const lo: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    g.push(Math.max(0, closes[i] - closes[i - 1]));
    lo.push(Math.max(0, closes[i - 1] - closes[i]));
  }
  let ag = g.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let al = lo.slice(0, n).reduce((a, b) => a + b, 0) / n;
  for (let i = n; i < g.length; i++) {
    ag = (ag * (n - 1) + g[i]) / n;
    al = (al * (n - 1) + lo[i]) / n;
  }
  return al ? 100 - 100 / (1 + ag / al) : 100;
}

/**
 * Average true range of the last n bars (all of them if fewer). The first bar uses its own
 * high - low (no overnight gap). Returns [atr, bars used].
 */
export function atr(bars: Pick<Candle, 'h' | 'l' | 'c'>[], n = 14): [number, number] {
  const trs: number[] = [];
  let prev: number | null = null;
  for (const b of bars) {
    let tr = b.h - b.l;
    if (prev != null) tr = Math.max(tr, Math.abs(b.h - prev), Math.abs(b.l - prev));
    trs.push(tr);
    prev = b.c;
  }
  const use = trs.slice(-n);
  return [use.length ? use.reduce((a, b) => a + b, 0) / use.length : 0, use.length];
}

/** Simple moving average of the last n values, or null. */
export function sma(values: number[], n: number): number | null {
  if (values.length < n) return null;
  return values.slice(-n).reduce((a, b) => a + b, 0) / n;
}
