/**
 * One exchange session's bars on its grid: slot 0 is the bar that starts at the session grid
 * open (9:30 New York). Shared by the entry timer, exit planner, scanner and Time Machine.
 */
import type { Candle, Chart } from './candles';
import { type LabSession, sessionFor, zoneOf } from './sessions';

export type SlotBar = Candle & { slot: number; end: number };

/** Seconds a closed bar may wait for Yahoo's data to catch up (skill: SETTLE). */
const SETTLE_MS = 60_000;

/**
 * Bars of the session on `session.date`, on the grid, inside the session, by slot.
 * Yahoo's live tick (off the grid, e.g. 10:49:45) is dropped. In New York the grid is the
 * 5-minute clock; in Tel Aviv it follows the first bar of the day (Kesefly design decision:
 * the grid there is whatever Yahoo sends, usually 09:55 / 10:00 for 5-minute bars).
 */
export function gridBars(bars: Candle[], s: LabSession, stepSec: number): Map<number, SlotBar> {
  const step = stepSec * 1000;
  const inSession = bars.filter((b) => b.t >= s.gridOpenMs && b.t < s.closeMs);
  const anchor = s.zone === 'NY' || !inSession.length ? s.gridOpenMs : inSession[0].t;
  const out = new Map<number, SlotBar>();
  for (const b of inSession) {
    if ((((b.t - anchor) % step) + step) % step) continue;
    const slot = Math.floor((b.t - s.gridOpenMs) / step);
    out.set(slot, { ...b, slot, end: b.t + step });
  }
  return out;
}

export type SessionBars = {
  session: LabSession;
  /** Closed bars, oldest first. */
  closed: SlotBar[];
  /** The bar still forming (or closed but Yahoo has not caught up), if any. */
  forming: SlotBar | null;
};

/**
 * The closed bars of today's session at instant `now`. A bar counts once it has closed by the
 * clock AND Yahoo has caught up: its last trade is at or after the close, a later bar exists,
 * or a minute has passed (the skill's rule).
 */
export function sessionBars(chart: Chart, now: number, stepSec = 300, session?: LabSession | null): SessionBars | null {
  const s = session ?? sessionFor(zoneOf(chart.symbol), now, stepSec);
  if (!s) return null;
  const by = gridBars(chart.bars, s, stepSec);
  const slots = [...by.keys()].sort((a, b) => a - b);
  const top = slots.length ? slots[slots.length - 1] : -1;
  const closed: SlotBar[] = [];
  let forming: SlotBar | null = null;
  const dt = chart.dataTime;
  for (const k of slots) {
    const b = by.get(k)!;
    if (b.end <= now) {
      if (dt == null || dt >= b.end || k < top || now >= b.end + SETTLE_MS) closed.push(b);
      else forming = b;
    } else if (b.t <= now) forming = b;
  }
  return { session: s, closed, forming };
}
