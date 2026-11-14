/**
 * Time helpers: market hours for Wall Street (NYSE / Nasdaq) and the Tel Aviv Stock Exchange,
 * and the Hebrew (Jewish) calendar date.
 *
 * Time zones are computed by hand (US Eastern and Israel DST rules) instead of Intl `timeZone`,
 * and the Hebrew date uses the standard arithmetic calendar (Reingold & Dershowitz,
 * "Calendrical Calculations"), because Hermes on Android has no Hebrew calendar in Intl.
 *
 * Exchange hours (regular session, local time):
 *   - NYSE / Nasdaq: Mon-Fri 09:30-16:00 America/New_York. Pre-market 04:00, after-hours to 20:00.
 *   - TASE: Mon-Thu 09:59-17:25, Fri 09:59-13:50 Asia/Jerusalem (Monday-Friday week since January 2026).
 *     Friday close time is approximate; check tase.co.il for the exact session.
 * Holidays: NYSE full-day closures 2026-2027 are listed below; TASE closes on the main Jewish
 * holidays (computed from the Hebrew calendar). Half days are not modeled.
 */

/* ---------- Time zones ---------- */

export type Zone = 'NY' | 'TLV';

/** nth (1-based) weekday `wd` (0 = Sunday) of a month, as a UTC day number. Negative n counts from the end. */
function nthWeekday(year: number, month: number, wd: number, n: number): number {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    return 1 + ((wd - first + 7) % 7) + (n - 1) * 7;
  }
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month, lastDay)).getUTCDay();
  return lastDay - ((last - wd + 7) % 7);
}

/** UTC offset in hours for a zone at a given instant. */
export function zoneOffset(zone: Zone, t: number): number {
  const y = new Date(t).getUTCFullYear();
  if (zone === 'NY') {
    // DST: second Sunday of March 02:00 EST (07:00 UTC) to first Sunday of November 02:00 EDT (06:00 UTC).
    const start = Date.UTC(y, 2, nthWeekday(y, 2, 0, 2), 7);
    const end = Date.UTC(y, 10, nthWeekday(y, 10, 0, 1), 6);
    return t >= start && t < end ? -4 : -5;
  }
  // Israel: Friday before the last Sunday of March 02:00 (00:00 UTC) to last Sunday of October 02:00 IDT (23:00 UTC Saturday).
  const lastSunMar = nthWeekday(y, 2, 0, -1);
  const start = Date.UTC(y, 2, lastSunMar - 2, 0);
  const end = Date.UTC(y, 9, nthWeekday(y, 9, 0, -1), 0) - 3600_000;
  return t >= start && t < end ? 3 : 2;
}

export type ZonedTime = { year: number; month: number; day: number; hour: number; minute: number; weekday: number; offset: number };

/** Wall-clock parts of instant `t` in a zone. month is 1-12, weekday 0 = Sunday. */
export function zoned(zone: Zone, t: number): ZonedTime {
  const offset = zoneOffset(zone, t);
  const d = new Date(t + offset * 3600_000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
    offset,
  };
}

/* ---------- Market status ---------- */

const NYSE_HOLIDAYS = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]);

export type MarketPhase = 'open' | 'pre' | 'after' | 'closed' | 'holiday';
export type MarketStatus = {
  zone: Zone;
  time: ZonedTime;
  phase: MarketPhase;
  /** Minutes until the next open (when not open) or until the close (when open). */
  minutesToChange: number;
};

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (z: ZonedTime) => `${z.year}-${pad(z.month)}-${pad(z.day)}`;

/** Regular-session minutes [open, close] for a zoned day, or null when the exchange is shut all day. */
function session(zone: Zone, z: ZonedTime): [number, number] | null {
  if (zone === 'NY') {
    if (z.weekday === 0 || z.weekday === 6 || NYSE_HOLIDAYS.has(dateKey(z))) return null;
    return [9 * 60 + 30, 16 * 60];
  }
  if (z.weekday === 0 || z.weekday === 6 || isTaseHoliday(z)) return null;
  return z.weekday === 5 ? [9 * 60 + 59, 13 * 60 + 50] : [9 * 60 + 59, 17 * 60 + 25];
}

export function marketStatus(zone: Zone, t = Date.now()): MarketStatus {
  const z = zoned(zone, t);
  const now = z.hour * 60 + z.minute;
  const s = session(zone, z);
  let phase: MarketPhase;
  if (!s) phase = z.weekday === 0 || z.weekday === 6 ? 'closed' : 'holiday';
  else if (now >= s[0] && now < s[1]) phase = 'open';
  else if (zone === 'NY' && now >= 4 * 60 && now < s[0]) phase = 'pre';
  else if (zone === 'NY' && now >= s[1] && now < 20 * 60) phase = 'after';
  else phase = 'closed';

  let minutesToChange: number;
  if (phase === 'open' && s) minutesToChange = s[1] - now;
  else {
    // Walk forward day by day to the next session open.
    minutesToChange = 0;
    for (let dayAhead = 0; dayAhead < 10; dayAhead++) {
      const zz = zoned(zone, t + dayAhead * 86400_000);
      const ss = session(zone, zz);
      if (!ss) continue;
      if (dayAhead === 0 && now >= ss[0]) continue;
      minutesToChange = dayAhead * 1440 + ss[0] - now;
      break;
    }
  }
  return { zone, time: z, phase, minutesToChange };
}

/* ---------- Hebrew calendar ---------- */

const HEBREW_EPOCH = -1373427; // R.D. fixed date of 1 Tishrei AM 1
const RD_UNIX_EPOCH = 719163; // R.D. of 1970-01-01

const mod = (a: number, b: number) => a - b * Math.floor(a / b);
const isLeap = (y: number) => mod(7 * y + 1, 19) < 7;
const lastMonth = (y: number) => (isLeap(y) ? 13 : 12);

function elapsedDays(y: number): number {
  const months = Math.floor((235 * y - 234) / 19);
  const parts = 12084 + 13753 * months;
  const days = 29 * months + Math.floor(parts / 25920);
  return mod(3 * (days + 1), 7) < 3 ? days + 1 : days;
}

function yearCorrection(y: number): number {
  const ny0 = elapsedDays(y - 1);
  const ny1 = elapsedDays(y);
  const ny2 = elapsedDays(y + 1);
  if (ny2 - ny1 === 356) return 2;
  if (ny1 - ny0 === 382) return 1;
  return 0;
}

const newYear = (y: number) => HEBREW_EPOCH + elapsedDays(y) + yearCorrection(y);
const daysInYear = (y: number) => newYear(y + 1) - newYear(y);

/** Months numbered from Nisan = 1; Tishrei = 7; Adar = 12; Adar II = 13. */
function monthLength(m: number, y: number): number {
  if ([2, 4, 6, 10, 13].includes(m)) return 29;
  if (m === 12 && !isLeap(y)) return 29;
  if (m === 8 && ![355, 385].includes(daysInYear(y))) return 29;
  if (m === 9 && [353, 383].includes(daysInYear(y))) return 29;
  return 30;
}

function fixedFromHebrew(y: number, m: number, d: number): number {
  let days = newYear(y) + d - 1;
  if (m < 7) {
    for (let i = 7; i <= lastMonth(y); i++) days += monthLength(i, y);
    for (let i = 1; i < m; i++) days += monthLength(i, y);
  } else {
    for (let i = 7; i < m; i++) days += monthLength(i, y);
  }
  return days;
}

export type HebrewDate = { year: number; month: number; day: number; leap: boolean };

export function hebrewFromGregorian(year: number, month: number, day: number): HebrewDate {
  const fixed = Math.floor(Date.UTC(year, month - 1, day) / 86400_000) + RD_UNIX_EPOCH;
  let y = Math.floor((fixed - HEBREW_EPOCH) / (35975351 / 98496));
  while (newYear(y + 1) <= fixed) y++;
  let m = fixed < fixedFromHebrew(y, 1, 1) ? 7 : 1;
  while (fixed > fixedFromHebrew(y, m, monthLength(m, y))) m++;
  return { year: y, month: m, day: fixed - fixedFromHebrew(y, m, 1) + 1, leap: isLeap(y) };
}

const HE_MONTHS = ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב׳'];
const EN_MONTHS = ['', 'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul', 'Tishrei', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II'];

function monthName(h: HebrewDate, lang: 'en' | 'he'): string {
  if (h.month === 12 && h.leap) return lang === 'he' ? 'אדר א׳' : 'Adar I';
  return (lang === 'he' ? HE_MONTHS : EN_MONTHS)[h.month];
}

/** Hebrew numerals (gematria) with geresh / gershayim. 15 and 16 use ט״ו / ט״ז. */
export function gematria(n: number): string {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  let s = '';
  let v = n % 1000;
  while (v >= 400) {
    s += 'ת';
    v -= 400;
  }
  s += hundreds[Math.floor(v / 100)];
  v %= 100;
  if (v === 15) s += 'טו';
  else if (v === 16) s += 'טז';
  else s += tens[Math.floor(v / 10)] + ones[v % 10];
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`;
}

/** "כ״ג בחשוון תשפ״ז" in Hebrew, "23 Heshvan 5787" in English. */
export function formatHebrewDate(h: HebrewDate, lang: 'en' | 'he'): string {
  if (lang === 'he') return `${gematria(h.day)} ב${monthName(h, 'he')} ${gematria(h.year)}`;
  return `${h.day} ${monthName(h, 'en')} ${h.year}`;
}

/** TASE closes on Rosh Hashana, Yom Kippur, Sukkot, Simchat Torah, Passover (first and last day) and Shavuot. */
function isTaseHoliday(z: ZonedTime): boolean {
  const h = hebrewFromGregorian(z.year, z.month, z.day);
  const key = `${h.month}-${h.day}`;
  return ['7-1', '7-2', '7-10', '7-15', '7-22', '1-15', '1-21', '3-6'].includes(key);
}

/** "2h 15m" style duration, localized. */
export function formatDuration(min: number, lang: 'en' | 'he'): string {
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const u = lang === 'he' ? { d: 'י׳', h: 'ש׳', m: 'ד׳' } : { d: 'd', h: 'h', m: 'm' };
  if (d > 0) return `${d}${u.d} ${h}${u.h}`;
  if (h > 0) return `${h}${u.h} ${m}${u.m}`;
  return `${m}${u.m}`;
}
