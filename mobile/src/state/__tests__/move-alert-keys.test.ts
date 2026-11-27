import { describe, expect, it } from 'vitest';

import { moveKey, moveToAlert, pruneMoveKeys } from '@/state/move-alert-keys';

const at = (iso: string) => Date.parse(iso);

/** Runs one "check" like event-alerts.ts does: prune, decide, remember. Returns true when it alerted. */
function check(seen: string[], symbol: string, q: { time: number; exchange: string; changePct: number }, now: number): boolean {
  const kept = pruneMoveKeys(seen, now);
  seen.splice(0, seen.length, ...kept);
  const key = moveToAlert(symbol, q, 3, seen, now);
  if (key) seen.push(key);
  return key !== null;
}

describe('big move alerts: once per exchange trading day', () => {
  // Friday 2026-11-27, NYSE early close 13:00 ET = 18:00 UTC (EST, UTC-5).
  const usMove = { time: at('2026-11-27T18:00:00Z'), exchange: 'NasdaqGS', changePct: -0.045 };

  it('alerts a US move once when checked at 23:50 UTC and again at 00:10 UTC', () => {
    const seen: string[] = [];
    expect(check(seen, 'AAPL', usMove, at('2026-11-27T23:50:00Z'))).toBe(true);
    expect(check(seen, 'AAPL', usMove, at('2026-11-28T00:10:00Z'))).toBe(false);
    expect(seen).toEqual(['AAPL|2026-11-27']);
  });

  it('alerts again for a move on a new trading day', () => {
    const seen: string[] = [];
    expect(check(seen, 'AAPL', usMove, at('2026-11-27T23:50:00Z'))).toBe(true);
    const monday = { time: at('2026-11-30T20:30:00Z'), exchange: 'NasdaqGS', changePct: 0.051 };
    expect(check(seen, 'AAPL', monday, at('2026-11-30T21:00:00Z'))).toBe(true);
    expect(check(seen, 'AAPL', monday, at('2026-12-01T01:00:00Z'))).toBe(false);
    expect(seen).toEqual(['AAPL|2026-11-27', 'AAPL|2026-11-30']);
  });

  it('keys TASE quotes by the Israel date', () => {
    // 2026-11-26 15:00 UTC = 17:00 Israel (UTC+2). After 22:00 UTC it is already the 27th in Israel.
    const q = { time: at('2026-11-26T15:00:00Z'), exchange: 'Tel Aviv', changePct: 0.04 };
    expect(moveKey('TEVA.TA', q)).toBe('TEVA.TA|2026-11-26');
    const seen: string[] = [];
    expect(check(seen, 'TEVA.TA', q, at('2026-11-26T21:50:00Z'))).toBe(true);
    expect(check(seen, 'TEVA.TA', q, at('2026-11-26T22:10:00Z'))).toBe(false);
  });

  it('skips small moves and stale quotes', () => {
    const now = at('2026-11-27T23:50:00Z');
    expect(moveToAlert('AAPL', { ...usMove, changePct: 0.01 }, 3, [], now)).toBeNull();
    expect(moveToAlert('AAPL', usMove, 3, [], at('2026-11-28T12:01:00Z'))).toBeNull();
    expect(moveToAlert('AAPL', undefined, 3, [], now)).toBeNull();
    // Fund quotes use Date.parse(ratesAsOf), which can be NaN.
    expect(moveToAlert('5117957.TA', { ...usMove, time: NaN }, 3, [], now)).toBeNull();
  });

  it('prunes keys older than a few days and bad keys', () => {
    const keys = ['AAPL|2026-11-20', 'MSFT|2026-11-25', 'AAPL|2026-11-27', 'junk', 'TEVA.TA|2026-11-30'];
    expect(pruneMoveKeys(keys, at('2026-11-30T21:00:00Z'))).toEqual(['AAPL|2026-11-27', 'TEVA.TA|2026-11-30']);
  });
});
