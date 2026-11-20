import { describe, expect, it } from 'vitest';

import { parseChart, parseSpark } from '../candles';
import { PyRandom } from '../random';
import { hhmm, localToUtc, nextSession, phaseOf, sessionFor } from '../sessions';
import { fixture } from './fixtures';

describe('PyRandom matches CPython random.Random', () => {
  it('seed 19: getrandbits, randint, choice', () => {
    const r = new PyRandom(19);
    expect([r.getrandbits(32), r.getrandbits(32), r.getrandbits(32)]).toEqual([2908233303, 185773678, 3371168582]);
    expect(Array.from({ length: 8 }, () => r.randint(-2, 2))).toEqual([2, -2, 2, -1, 1, 0, 2, 0]);
    const seq = Array.from({ length: 59 }, (_, i) => i);
    expect(Array.from({ length: 8 }, () => r.choice(seq))).toEqual([37, 9, 38, 16, 6, 16, 26, 20]);
  });
  it('seed 7 random() and a seed over 32 bits', () => {
    expect(new PyRandom(7).random()).toBe(0.32383276483316237);
    expect(new PyRandom(2 ** 40 + 5).getrandbits(32)).toBe(2166296868);
  });
});

describe('sessions', () => {
  it('New York: 9:30-16:00, range to 9:45, entries 9:45-15:30, flat by 15:55', () => {
    const t = localToUtc('NY', '2026-10-19', 10 * 60 + 15);
    const s = sessionFor('NY', t)!;
    expect(s.date).toBe('2026-10-19');
    expect([s.openMs, s.orEndMs, s.entriesFromMs, s.entriesUntilMs, s.flatByMs, s.closeMs].map((x) => hhmm('NY', x))).toEqual([
      '09:30', '09:45', '09:45', '15:30', '15:55', '16:00',
    ]);
    expect(new Date(s.openMs).toISOString()).toBe('2026-10-19T13:30:00.000Z');
    expect(phaseOf(s, t)).toBe('entries');
    expect(phaseOf(s, localToUtc('NY', '2026-10-19', 9 * 60 + 40))).toBe('forming');
    expect(phaseOf(s, localToUtc('NY', '2026-10-19', 15 * 60 + 40))).toBe('no-new-entries');
  });
  it('New York early close moves the cutoff and flat-by up 3 hours', () => {
    const s = sessionFor('NY', localToUtc('NY', '2026-11-27', 10 * 60))!;
    expect(s.early).toBe(true);
    expect([s.entriesUntilMs, s.flatByMs, s.closeMs].map((x) => hhmm('NY', x))).toEqual(['12:30', '12:55', '13:00']);
  });
  it('New York holiday and weekend have no session', () => {
    expect(sessionFor('NY', localToUtc('NY', '2026-11-26', 11 * 60))).toBeNull();
    expect(sessionFor('NY', localToUtc('NY', '2026-10-18', 11 * 60))).toBeNull();
    expect(nextSession('NY', localToUtc('NY', '2026-10-18', 11 * 60))!.date).toBe('2026-10-19');
  });
  it('Tel Aviv follows the Israel clock (Mon-Thu 09:59-17:25, Fri to 13:50)', () => {
    const mon = sessionFor('TLV', localToUtc('TLV', '2026-11-16', 12 * 60))!;
    expect(mon.currency).toBe('ILS');
    expect([mon.openMs, mon.gridOpenMs, mon.orEndMs, mon.entriesUntilMs, mon.flatByMs, mon.closeMs].map((x) => hhmm('TLV', x))).toEqual([
      '09:59', '09:55', '10:10', '16:55', '17:20', '17:25',
    ]);
    const fri = sessionFor('TLV', localToUtc('TLV', '2026-11-20', 11 * 60))!;
    expect([fri.entriesUntilMs, fri.flatByMs, fri.closeMs].map((x) => hhmm('TLV', x))).toEqual(['13:20', '13:45', '13:50']);
    expect(sessionFor('TLV', localToUtc('TLV', '2026-11-22', 11 * 60))).toBeNull(); // Sunday: no trading since 2026
  });
});

describe('candles', () => {
  it('parses the TSLA 5-minute chart', () => {
    const c = parseChart(JSON.parse(fixture('TSLA-2026-10-19-5m.json')), 'TSLA');
    expect(c.symbol).toBe('TSLA');
    expect(c.currency).toBe('USD');
    expect(c.bars.length).toBeGreaterThan(10);
    const b = c.bars[0];
    expect(new Date(b.t).toISOString()).toBe('2026-10-19T13:30:00.000Z');
    expect(b.h).toBeGreaterThanOrEqual(b.l);
  });
  it('converts agorot to shekels', () => {
    const c = parseChart({
      chart: { result: [{ meta: { symbol: 'TEVA.TA', currency: 'ILA', regularMarketPrice: 6543, previousClose: 6500 }, timestamp: [1, 2], indicators: { quote: [{ open: [6500, null], high: [6600, null], low: [6400, null], close: [6550, 6543], volume: [10, 20] }] } }] },
    });
    expect(c.currency).toBe('ILS');
    expect(c.price).toBe(65.43);
    expect(c.bars[0]).toEqual({ t: 1000, o: 65, h: 66, l: 64, c: 65.5, v: 10 });
    expect(c.bars[1].o).toBe(65.43);
  });
  it('parses a spark answer', () => {
    const all = parseSpark(JSON.parse(fixture('daily-spark-2026-10-19.json')));
    expect(Object.keys(all)).toHaveLength(19);
    expect(all.KO.bars.length).toBeGreaterThan(30);
  });
});
