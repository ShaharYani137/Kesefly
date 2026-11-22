/**
 * Chart scanner (trader-scanner): finds charts that match a setup rule. A scan is a list of
 * charts that match a rule, not a list of stocks to buy.
 *
 * Daily setups, on complete daily closes (at least 30):
 *   breakout_20d     last close above the highest close of the 20 before it
 *   bull_flag        up more than 10% over the 10 sessions before the last 5, last 5 closes in
 *                    a range under 5% of the price
 *   reclaim_ma20     yesterday under its 20-day average, today above it
 *   oversold         RSI(14) under 30
 *   oversold_bounce  RSI under 30 yesterday, and closed up today
 * Opening-range breakout (today, 5-minute bars): stage 1 on closes only (some bar after the
 * range closed at or above the range's highest close), stage 2 on real highs and lows (the
 * first completed bar to CLOSE above the range high).
 */
import { gridBars, type SlotBar } from './bars';
import type { Chart } from './candles';
import { r2 } from './entry';
import { rsi } from './indicators';
import { localDate, OR_MINUTES, sessionFor, zoneOf } from './sessions';

export type DailySetup = 'breakout_20d' | 'bull_flag' | 'reclaim_ma20' | 'oversold' | 'oversold_bounce';
export type SetupKey = DailySetup | 'orb';

const MIN_DAILY_BARS = 30;

export function findSetups(c: number[]): { tags: DailySetup[]; rsi: number | null } {
  const n = c.length;
  const last = c[n - 1];
  const hi20 = Math.max(...c.slice(n - 21, n - 1));
  const ma20 = c.slice(n - 20).reduce((a, b) => a + b, 0) / 20;
  const ma20Prev = c.slice(n - 21, n - 1).reduce((a, b) => a + b, 0) / 20;
  const run = c[n - 6] / c[n - 16] - 1;
  const last5 = c.slice(n - 5);
  const rng5 = (Math.max(...last5) - Math.min(...last5)) / last;
  const r = rsi(c);
  const rPrev = rsi(c.slice(0, -1));
  const tags: DailySetup[] = [];
  if (last > hi20) tags.push('breakout_20d');
  if (run > 0.1 && rng5 < 0.05) tags.push('bull_flag');
  if (c[n - 2] < ma20Prev && last > ma20) tags.push('reclaim_ma20');
  if (r != null && r < 30) tags.push('oversold');
  if (rPrev != null && rPrev < 30 && last > c[n - 2]) tags.push('oversold_bounce');
  return { tags, rsi: r };
}

/** Complete daily closes [date, close], oldest first: today's only after the session closed. */
export function dailyCloses(chart: Chart, now: number): [string, number][] {
  const zone = zoneOf(chart.symbol);
  const today = localDate(zone, now);
  const s = sessionFor(zone, now);
  const todayDone = !s || now >= s.closeMs;
  const out = new Map<string, number>();
  for (const b of chart.bars) {
    const d = localDate(zone, b.t);
    if (d > today || (d === today && !todayDone)) continue;
    out.set(d, b.c);
  }
  return [...out.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

export type ScanHit = { symbol: string; setups: SetupKey[]; price: number; date: string; rsi: number | null; volume: number | null; currency: string; orb?: OrbHit };

export function scanDaily(charts: Record<string, Chart>, symbols: string[], now: number, minPrice = 0, minVolume = 0): ScanHit[] {
  const hits: ScanHit[] = [];
  for (const sym of symbols.map((s) => s.toUpperCase())) {
    const ch = charts[sym];
    if (!ch) continue;
    const bars = dailyCloses(ch, now);
    const price = ch.price ?? bars[bars.length - 1]?.[1];
    const vol = ch.volume;
    if (price == null || price < minPrice || (minVolume > 0 && (vol == null || vol < minVolume))) continue;
    if (bars.length < MIN_DAILY_BARS) continue;
    const closes = bars.map((b) => b[1]);
    const { tags, rsi: r } = findSetups(closes);
    if (tags.length) hits.push({ symbol: sym, setups: tags, price: r2(closes[closes.length - 1]), date: bars[bars.length - 1][0], rsi: r == null ? null : Math.round(r * 10) / 10, volume: vol, currency: ch.currency });
  }
  // Most money traded first.
  return hits.sort((a, b) => b.price * (b.volume ?? 0) - a.price * (a.volume ?? 0) || (a.symbol < b.symbol ? -1 : 1));
}

export type OrbHit = { price: number; at: number; slot: number; orHigh: number; orLow: number; pctOver: number };

/** Closed session bars of today, oldest first, if they cover every slot from the open. */
function todayBars(chart: Chart, now: number): SlotBar[] | null {
  const s = sessionFor(zoneOf(chart.symbol), now);
  if (!s || now < s.orEndMs) return null;
  const by = gridBars(chart.bars, s, 300);
  const out = [...by.values()].filter((b) => b.end <= now).sort((a, b) => a.slot - b.slot);
  return out.length ? out : null;
}

/** Stage 1 (closes only). */
export function orbCandidate(chart: Chart, now: number): boolean {
  const bars = todayBars(chart, now);
  const n = OR_MINUTES / 5;
  if (!bars || bars.length <= n) return false;
  const top = Math.max(...bars.slice(0, n).map((b) => b.c));
  return bars.slice(n).some((b) => b.c >= top);
}

/** Stage 2 (real highs and lows): the first completed bar to close above the range high. */
export function orbHit(chart: Chart, now: number): OrbHit | null {
  const bars = todayBars(chart, now);
  const n = OR_MINUTES / 5;
  if (!bars || bars.length <= n || bars[n - 1].slot !== n - 1) return null;
  const rng = bars.slice(0, n);
  const oh = Math.max(...rng.map((b) => b.h));
  const ol = Math.min(...rng.map((b) => b.l));
  for (const b of bars.slice(n)) {
    if (b.c > oh) return { price: r2(b.c), at: b.end, slot: b.slot, orHigh: r2(oh), orLow: r2(ol), pctOver: r2((b.c / oh - 1) * 100) };
  }
  return null;
}
