/**
 * Entry timer (trader-entry): watches a setup bar by bar and says when it triggers.
 * Long side only. It never places an order.
 *
 * Setups:
 *   orb    opening-range breakout. The range is the high and low of the first 15 minutes.
 *          It triggers on the first COMPLETED bar after the range that CLOSES above the
 *          range high. A wick above the high is not a trigger.
 *   level  the first completed bar that closes above a price (for example a 20-day high).
 *   minVolumeX: the trigger bar also needs at least X times the average volume of the
 *          opening-range bars.
 * A trigger's time is the trigger bar's CLOSE time (the 10:10 bar closes at 10:15) and its
 * price is that close, to the cent.
 *
 * Statuses: triggered; waiting (not open yet, range forming, or no close above the level
 * yet; `distance` says how far); expired (no trigger by the entry cutoff); no-data (the
 * exchange is shut today or Yahoo sent no bars).
 */
import { sessionBars, type SlotBar } from './bars';
import type { Chart } from './candles';
import { type LabSession, OR_MINUTES, sessionFor, zoneOf } from './sessions';

export type Setup = 'orb' | 'level';
export type EntryStatus = 'triggered' | 'waiting' | 'expired' | 'no-data';
export type EntryPhase = 'closed' | 'pre-open' | 'forming' | 'open' | 'after-cutoff' | 'after-close';

export type OpeningRange = { high: number; low: number; minutes: number; bars: number; of: number; complete: boolean; avgVolume: number };

export type EntryResult = {
  symbol: string;
  setup: Setup;
  status: EntryStatus;
  phase: EntryPhase;
  session: LabSession | null;
  openingRange: OpeningRange | null;
  /** Price a close has to beat. */
  level: number | null;
  trigger: { time: number; barStart: number; slot: number; price: number; volume: number; volumeX: number | null; pctOver: number } | null;
  last: { barStart: number; close: number; vsLevelPct: number } | null;
  /** Bars closed so far (for charts and the exit planner). */
  bars: SlotBar[];
  /** Why it is not triggered: thin volume or too early. */
  hold: 'thin-volume' | 'too-early' | null;
};

export const r2 = (x: number) => Math.round(x * 100 + (x >= 0 ? 1e-9 : -1e-9)) / 100 + 0;

export type EntryOptions = { setup?: Setup; level?: number; minVolumeX?: number | null; intervalSec?: number };

export function evaluateEntry(chart: Chart, now: number, opts: EntryOptions = {}): EntryResult {
  const setup = opts.setup ?? 'orb';
  const stepSec = opts.intervalSec ?? 300;
  const nOr = (OR_MINUTES * 60) / stepSec;
  const symbol = chart.symbol;
  const session = sessionFor(zoneOf(symbol), now, stepSec);
  const res: EntryResult = { symbol, setup, status: 'waiting', phase: 'open', session, openingRange: null, level: null, trigger: null, last: null, bars: [], hold: null };
  if (setup === 'level' && !(opts.level && opts.level > 0)) throw new Error('level setup needs a level');
  if (!session) return { ...res, status: 'no-data', phase: 'closed' };
  const sb = sessionBars(chart, now, stepSec, session)!;
  const bars = sb.closed;
  res.bars = bars;
  if (now < session.openMs) return { ...res, phase: 'pre-open' };

  const orBars = bars.filter((b) => b.slot < nOr);
  const avgVol = orBars.length ? orBars.reduce((a, b) => a + b.v, 0) / orBars.length : null;
  if (orBars.length) {
    res.openingRange = {
      high: r2(Math.max(...orBars.map((b) => b.h))),
      low: r2(Math.min(...orBars.map((b) => b.l))),
      minutes: OR_MINUTES,
      bars: orBars.length,
      of: nOr,
      complete: now >= session.orEndMs,
      avgVolume: Math.round(avgVol ?? 0),
    };
  }
  let lvl: number;
  if (setup === 'orb') {
    if (now < session.orEndMs) return { ...res, phase: 'forming' };
    if (!orBars.length) return { ...res, status: 'no-data' };
    lvl = Math.max(...orBars.map((b) => b.h));
  } else {
    lvl = opts.level!;
  }
  res.level = r2(lvl);

  const firstSlot = setup === 'orb' ? nOr : 0;
  let trig: SlotBar | null = null;
  const thin: SlotBar[] = [];
  for (const b of bars) {
    if (b.slot < firstSlot || b.end < session.entriesFromMs || b.end > session.entriesUntilMs) continue;
    if (b.c > lvl) {
      const vx = avgVol ? b.v / avgVol : null;
      if (opts.minVolumeX && (vx == null || vx < opts.minVolumeX)) {
        thin.push(b);
        continue;
      }
      trig = b;
      break;
    }
  }
  const last = bars.length ? bars[bars.length - 1] : null;
  if (last) res.last = { barStart: last.t, close: r2(last.c), vsLevelPct: r2(100 * (last.c / lvl - 1)) };

  if (trig) {
    const vx = avgVol ? trig.v / avgVol : null;
    res.trigger = { time: trig.end, barStart: trig.t, slot: trig.slot, price: r2(trig.c), volume: trig.v, volumeX: vx == null ? null : r2(vx), pctOver: r2(100 * (trig.c / lvl - 1)) };
    return { ...res, status: 'triggered', phase: now < session.closeMs ? 'open' : 'after-close' };
  }
  if (!last) return { ...res, status: 'no-data' };
  const pendingBeforeCutoff = sb.forming && sb.forming.end <= session.entriesUntilMs && sb.forming.end <= now;
  if (now >= session.entriesUntilMs && !pendingBeforeCutoff) {
    return { ...res, status: 'expired', phase: now >= session.closeMs ? 'after-close' : 'after-cutoff' };
  }
  if (last.c > lvl && thin.includes(last)) res.hold = 'thin-volume';
  else if (last.c > lvl && last.end < session.entriesFromMs) res.hold = 'too-early';
  return res;
}
