/**
 * Once-per-day guard for "big move" alerts (pure, no React Native, so it can be unit tested).
 *
 * The day is the exchange's trading date of the quote (America/New_York for US symbols,
 * Asia/Jerusalem for TASE `.TA` symbols), not today's UTC date. So a US move seen at
 * 23:50 UTC and again at 00:10 UTC is the same day and alerts once.
 * Keys are `SYMBOL|YYYY-MM-DD`; keys older than a few days are pruned so the store stays small.
 */
import type { Quote } from '@/engine/stocks';
import { localDate, type Zone, zoneOf } from '@/lab/sessions';

/** A quote older than this is not "today's" move (markets may be closed). */
export const MOVE_FRESH_MS = 18 * 3600_000;
/** How many days of move keys to keep. */
export const MOVE_KEY_DAYS = 4;

function quoteZone(symbol: string, exchange: string): Zone {
  return zoneOf(symbol) === 'TLV' || /tel aviv/i.test(exchange) ? 'TLV' : 'NY';
}

/** Once-per-day key for a symbol's move: the symbol plus the quote's exchange trading date. */
export function moveKey(symbol: string, q: Pick<Quote, 'time' | 'exchange'>): string {
  return `${symbol}|${localDate(quoteZone(symbol, q.exchange), q.time)}`;
}

/** Keeps keys from the last `days` days (by date, compared to `now` in UTC) and drops bad ones. */
export function pruneMoveKeys(keys: string[], now: number, days = MOVE_KEY_DAYS): string[] {
  const cutoff = new Date(now - days * 86_400_000).toISOString().slice(0, 10);
  return keys.filter((k) => {
    const date = k.slice(k.lastIndexOf('|') + 1);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= cutoff;
  });
}

/**
 * The key to alert under, or null when there is nothing to alert: move below `thresholdPct`
 * (percent, e.g. 3), quote older than 18 hours, or this move already alerted (`seen` keys).
 */
export function moveToAlert(
  symbol: string,
  q: Pick<Quote, 'time' | 'exchange' | 'changePct'> | undefined,
  thresholdPct: number,
  seen: string[],
  now: number,
): string | null {
  if (!q || Math.abs(q.changePct) < thresholdPct / 100) return null;
  // A missing or unparseable quote time (NaN) would make a bad key that pruning drops, so the alert would repeat.
  if (!Number.isFinite(q.time) || now - q.time > MOVE_FRESH_MS) return null;
  const key = moveKey(symbol, q);
  return seen.includes(key) ? null : key;
}
