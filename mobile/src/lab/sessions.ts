/**
 * Day-trading sessions for the Lab: New York (NYSE / Nasdaq) and Tel Aviv (TASE).
 *
 * New York, from the day-trader-skill pack (trader-entry / trader-exit / trader-risk):
 *   regular session 9:30-16:00, opening range to 9:45 (15 minutes), new entries 9:45-15:30,
 *   flat by 15:55. On a 1:00 p.m. early close the entry cutoff and flat-by move up 3 hours
 *   with the close (12:30 / 12:55).
 * Tel Aviv, from the app's clock (engine/clock.ts): Mon-Thu 09:59-17:25, Fri 09:59-13:50.
 *   KESEFLY DESIGN DECISIONS (the skill covers New York only):
 *   - bars sit on the 5-minute grid, so the session grid starts at the bar holding the open
 *     (09:55 for 5-minute bars, 09:59 for 1-minute bars);
 *   - opening range = the first 15 minutes of that grid;
 *   - new entries until 30 minutes before the close (16:55, Friday 13:20);
 *   - flat by 5 minutes before the close (17:20, Friday 13:45).
 *
 * All instants are UTC milliseconds. Dates are the exchange's local calendar date.
 */
import { sessionMinutes, type Zone, zoned, zoneOffset } from '@/engine/clock';

export type { Zone };

/** NYSE 1:00 p.m. early closes (nyse.com, same list as the skill pack). */
export const NYSE_EARLY_CLOSE: Record<string, string> = {
  '2026-11-27': 'day after Thanksgiving',
  '2026-12-24': 'Christmas Eve',
  '2027-11-26': 'day after Thanksgiving',
};

export const OR_MINUTES = 15;

export type LabSession = {
  zone: Zone;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  openMs: number;
  closeMs: number;
  /** Start of the bar grid (equals openMs in New York). */
  gridOpenMs: number;
  /** End of the opening range. */
  orEndMs: number;
  /** New entries allowed from ... */
  entriesFromMs: number;
  /** ... until (inclusive). */
  entriesUntilMs: number;
  /** Out of every practice trade by then. */
  flatByMs: number;
  /** 1:00 p.m. New York early close. */
  early: boolean;
  currency: 'USD' | 'ILS';
};

const pad = (n: number) => String(n).padStart(2, '0');
const MIN = 60_000;

export function zoneOf(symbol: string): Zone {
  return /\.TA$/i.test(symbol) ? 'TLV' : 'NY';
}

/** UTC instant of local wall-clock `minutes` after midnight on a zone's date. */
export function localToUtc(zone: Zone, date: string, minutes: number): number {
  const [y, m, d] = date.split('-').map(Number);
  const naive = Date.UTC(y, m - 1, d) + minutes * MIN;
  // The offset at the guessed instant is right except within an hour of a DST switch (never in session).
  const guess = naive - zoneOffset(zone, naive) * 3600_000;
  return naive - zoneOffset(zone, guess) * 3600_000;
}

export function localDate(zone: Zone, t: number): string {
  const z = zoned(zone, t);
  return `${z.year}-${pad(z.month)}-${pad(z.day)}`;
}

/** Local minutes after midnight of instant `t`. */
export function localMinutes(zone: Zone, t: number): number {
  const z = zoned(zone, t);
  return z.hour * 60 + z.minute;
}

/** HH:MM in the zone's local time. */
export function hhmm(zone: Zone, t: number): string {
  const z = zoned(zone, t);
  return `${pad(z.hour)}:${pad(z.minute)}`;
}

/** The session on the local date of instant `t`, or null when the exchange is shut that day. */
export function sessionFor(zone: Zone, t = Date.now(), stepSec = 300): LabSession | null {
  const mins = sessionMinutes(zone, t);
  if (!mins) return null;
  const date = localDate(zone, t);
  let [open, close] = mins;
  const early = zone === 'NY' && date in NYSE_EARLY_CLOSE;
  if (early) close = 13 * 60;
  const stepMin = stepSec / 60;
  const gridOpen = Math.floor(open / stepMin) * stepMin;
  const orEnd = gridOpen + OR_MINUTES;
  let until: number;
  let flat: number;
  if (zone === 'NY') {
    // 15:30 and 15:55 before a 16:00 close; both move up with an early close.
    const shift = early ? 3 * 60 : 0;
    until = 15 * 60 + 30 - shift;
    flat = 15 * 60 + 55 - shift;
  } else {
    until = close - 30;
    flat = close - 5;
  }
  return {
    zone,
    date,
    openMs: localToUtc(zone, date, open),
    closeMs: localToUtc(zone, date, close),
    gridOpenMs: localToUtc(zone, date, gridOpen),
    orEndMs: localToUtc(zone, date, orEnd),
    entriesFromMs: localToUtc(zone, date, Math.max(orEnd, zone === 'NY' ? 9 * 60 + 45 : orEnd)),
    entriesUntilMs: localToUtc(zone, date, until),
    flatByMs: localToUtc(zone, date, flat),
    early,
    currency: zone === 'TLV' ? 'ILS' : 'USD',
  };
}

/** The next session that has not closed yet, from instant `t` (today's when still open). */
export function nextSession(zone: Zone, t = Date.now(), stepSec = 300): LabSession | null {
  for (let day = 0; day < 10; day++) {
    const s = sessionFor(zone, t + day * 86_400_000, stepSec);
    if (s && s.closeMs > t) return s;
  }
  return null;
}

export type SessionPhase = 'closed' | 'pre-open' | 'forming' | 'entries' | 'no-new-entries' | 'flat';

/** Where instant `t` falls in a session. */
export function phaseOf(s: LabSession | null, t = Date.now()): SessionPhase {
  if (!s || t >= s.closeMs) return 'closed';
  if (t < s.openMs) return 'pre-open';
  if (t < s.orEndMs) return 'forming';
  if (t >= s.flatByMs) return 'flat';
  if (t > s.entriesUntilMs) return 'no-new-entries';
  if (t < s.entriesFromMs) return 'forming';
  return 'entries';
}
