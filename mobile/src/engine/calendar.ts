/**
 * Upcoming market-moving events ("what's coming"), for the chat.
 *
 * Scheduled, public dates only. Each event comes with scenarios ("if inflation comes in
 * hotter than expected, stocks often…"), never a prediction of the outcome: nobody knows the
 * result in advance, and the app is education only.
 *
 * Sources and accuracy:
 *   - Fed (FOMC) decisions 2026: the Federal Reserve's published meeting calendar (2nd day).
 *   - US jobs report: first Friday of the month (BLS; occasionally moved).
 *   - US CPI: around the 12th of the month (BLS schedule varies by a few days) — marked "about".
 *   - Israel CPI: the 15th of the month (CBS; moves when it falls on a weekend) — "about".
 *   - Bank of Israel decisions: about every 6-7 weeks; dates not hard-coded — not listed.
 *   - NYSE holidays from engine/clock.ts (2026-2027). TASE Jewish holidays from the Hebrew calendar.
 */
import { hebrewFromGregorian } from './clock';

export type CalendarKind = 'fed' | 'usJobs' | 'usCpi' | 'ilCpi' | 'nyseHoliday' | 'taseHoliday';
export type CalendarEvent = { kind: CalendarKind; date: Date; approx: boolean };

const FOMC_2026 = ['2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09'];
const NYSE_HOLIDAYS = [
  '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
];

const at = (iso: string) => new Date(`${iso}T12:00:00`);

function firstFriday(y: number, m: number): Date {
  const d = new Date(y, m, 1, 12);
  d.setDate(1 + ((5 - d.getDay() + 7) % 7));
  return d;
}

/** Moves an approximate release date off the weekend: US releases to the next Tuesday, Israel (Sun-Thu offices) to Sunday. */
function weekdayFrom(d: Date, where: 'US' | 'IL'): Date {
  const day = d.getDay();
  const add = where === 'US' ? (day === 6 ? 3 : day === 0 ? 2 : 0) : day === 5 ? 2 : day === 6 ? 1 : 0;
  return new Date(d.getTime() + add * 86400_000);
}

/** Events from today through `days` ahead, soonest first. */
export function upcoming(days = 35, now = new Date()): CalendarEvent[] {
  const end = new Date(now.getTime() + days * 86400_000);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: CalendarEvent[] = [];
  const add = (kind: CalendarKind, date: Date, approx = false) => {
    if (date >= start && date <= end) out.push({ kind, date, approx });
  };
  for (const d of FOMC_2026) add('fed', at(d));
  for (const d of NYSE_HOLIDAYS) add('nyseHoliday', at(d));
  for (let k = 0; k < 3; k++) {
    const y = now.getFullYear();
    const m = now.getMonth() + k;
    add('usJobs', firstFriday(y, m));
    add('usCpi', weekdayFrom(new Date(y, m, 12, 12), 'US'), true);
    add('ilCpi', weekdayFrom(new Date(y, m, 15, 12), 'IL'), true);
  }
  // TASE closes on Rosh Hashana, Yom Kippur, Sukkot, Simchat Torah, Passover (first and last day), Shavuot.
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getTime() + i * 86400_000);
    const h = hebrewFromGregorian(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (['7-1', '7-10', '7-15', '7-22', '1-15', '1-21', '3-6'].includes(`${h.month}-${h.day}`)) add('taseHoliday', new Date(d.getTime() + 12 * 3600_000));
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}
