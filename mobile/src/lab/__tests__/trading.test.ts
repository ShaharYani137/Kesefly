import { describe, expect, it } from 'vitest';

import { evaluatePriceAlerts, rulesFromPlan } from '../alerts';
import { parseChart, parseSpark } from '../candles';
import { buildPlan } from '../exit';
import { DEFAULT_LIMITS } from '../limits';
import { advanceOrder, applyUpdate, journal, journalStats, makeOrder, newAccount, placeOrder } from '../paper';
import { checkRisk } from '../risk';
import { orbCandidate, orbHit, scanDaily } from '../scanner';
import { localToUtc, sessionFor } from '../sessions';
import { sizeTrade } from '../sizing';
import { fixture } from './fixtures';

const NY = (date: string, h: number, m: number) => localToUtc('NY', date, h * 60 + m);
const T = NY('2026-10-19', 10, 20);
const plan = buildPlan({ symbol: 'TSLA', entry: 364.18, orHigh: 362.18, orLow: 354.47, target: { kind: 'r', r: 1 }, entryTime: NY('2026-10-19', 10, 15), entryBar: 8 });

describe('scanner', () => {
  it('daily setups before the open (the skill hand-checked list)', () => {
    const charts = parseSpark(JSON.parse(fixture('daily-spark-2026-10-19.json')));
    const hits = scanDaily(charts, Object.keys(charts), NY('2026-10-19', 9, 0));
    expect(Object.fromEntries(hits.map((h) => [h.symbol, h.setups]))).toEqual({
      BLK: ['breakout_20d'], CI: ['breakout_20d'], XOM: ['breakout_20d'], HD: ['breakout_20d'], KO: ['breakout_20d'],
      CCL: ['bull_flag'], RCL: ['bull_flag'], F: ['reclaim_ma20'], JPM: ['reclaim_ma20'], GE: ['reclaim_ma20'],
      BAC: ['oversold'], PLUG: ['oversold'], MS: ['oversold'], RIVN: ['oversold'], PNC: ['oversold_bounce'],
    });
    expect(hits.every((h) => h.date === '2026-10-16')).toBe(true);
  });
  it('opening-range breakout on TSLA', () => {
    const day = parseChart(JSON.parse(fixture('TSLA-2026-10-19-5m.json')), 'TSLA');
    expect(orbCandidate(day, NY('2026-10-19', 10, 50))).toBe(true);
    expect(orbHit(day, NY('2026-10-19', 10, 50))).toMatchObject({ price: 364.18, at: NY('2026-10-19', 10, 15), orHigh: 362.18, orLow: 354.47 });
    expect(orbHit(day, NY('2026-10-19', 10, 10))).toBeNull();
  });
});

describe('sizing', () => {
  it('5,000 budget, 50 max loss: 8 shares, 2,913.44, at most 46.88 lost', () => {
    const s = sizeTrade(plan, DEFAULT_LIMITS);
    expect([s.qty, s.cost, s.maxLoss, s.riskPerShare, s.boundBy, s.cashAvailable]).toEqual([8, 2913.44, 46.88, 5.86, 'max-loss', 4500]);
    expect(s.refusal).toBeNull();
    expect(s.limits.map((l) => [l.name, l.shares])).toEqual([['max-loss', 8], ['position-cap', 10], ['max-order', 10], ['cash', 12]]);
  });
  it('a fresh price above the entry sizes higher; one share over the max loss refuses', () => {
    expect(sizeTrade(plan, DEFAULT_LIMITS, { price: 365 }).entry).toBe(365);
    const wide = { ...plan, stop: 300, riskPerShare: 64.18, target: 500 };
    expect(sizeTrade(wide, DEFAULT_LIMITS).refusal).toEqual({ code: 'max-loss' });
  });
});

describe('risk check', () => {
  const s = sizeTrade(plan, DEFAULT_LIMITS);
  const session = sessionFor('NY', T);
  it('PASS for the reel trade at 10:20', () => {
    const r = checkRisk(plan, s, DEFAULT_LIMITS, newAccount(DEFAULT_LIMITS), session, T);
    expect(r.reasons).toEqual([]);
    expect(r.verdict).toBe('PASS');
  });
  it('BLOCK after the cutoff, on a duplicate and over the trade limit', () => {
    const late = NY('2026-10-19', 15, 40);
    expect(checkRisk(plan, s, DEFAULT_LIMITS, newAccount(DEFAULT_LIMITS), session, late).reasons.map((x) => x.code)).toEqual(['window-late']);
    let acct = newAccount(DEFAULT_LIMITS);
    acct = placeOrder(acct, makeOrder('1', plan, s, session!.entriesUntilMs, T, 364.2));
    const again = checkRisk(plan, s, DEFAULT_LIMITS, acct, session, T);
    expect(again.verdict).toBe('BLOCK');
    expect(again.reasons.map((x) => x.code)).toContain('duplicate');
    const strict = { ...DEFAULT_LIMITS, maxTradesPerDay: 1 };
    const other = { ...plan, symbol: 'AAPL' };
    expect(checkRisk(other, { ...s, symbol: 'AAPL' }, strict, acct, session, T).reasons.map((x) => x.code)).toContain('trades');
  });
  it('BLOCK when reward to risk is under the minimum', () => {
    const thin = sizeTrade({ ...plan, target: 368 }, { ...DEFAULT_LIMITS, minRewardRisk: 0 });
    const r = checkRisk(plan, thin, DEFAULT_LIMITS, newAccount(DEFAULT_LIMITS), session, T);
    expect(r.reasons.map((x) => x.code)).toEqual(['reward-risk']);
  });
});

describe('paper account', () => {
  const session = sessionFor('NY', T)!;
  const s = sizeTrade(plan, DEFAULT_LIMITS);
  const bar = (h: number, m: number, o: number, hi: number, lo: number, c: number) => ({ t: NY('2026-10-19', h, m), o, h: hi, l: lo, c, v: 1 });
  it('market order fills live, then the target fills at the target', () => {
    let acct = placeOrder(newAccount(DEFAULT_LIMITS), makeOrder('1', plan, s, session.entriesUntilMs, T, 364.18));
    expect(acct.cash.USD).toBe(5000 - 2913.44);
    const before = acct.orders[0];
    const after = advanceOrder(before, [bar(10, 20, 364, 366, 363, 365), bar(10, 25, 365, 371, 364, 370.5)], NY('2026-10-19', 10, 31), null);
    expect(after.exit).toMatchObject({ price: 370.04, reason: 'target' });
    acct = applyUpdate(acct, before, after);
    expect(acct.cash.USD).toBe(5000 + 8 * 5.86);
    const rows = journal(acct);
    expect(rows[0]).toMatchObject({ pnl: 46.88, R: 1 });
    expect(journalStats(rows)).toMatchObject({ trades: 1, wins: 1, avgR: 1 });
  });
  it('a bar touching both counts as the stop; a gap fills at the open', () => {
    const o = makeOrder('1', plan, s, session.entriesUntilMs, T, 364.18);
    expect(advanceOrder(o, [bar(10, 20, 364, 371, 358, 365)], NY('2026-10-19', 10, 26), null).exit).toMatchObject({ price: 358.32, reason: 'stop' });
    expect(advanceOrder(o, [bar(10, 20, 350, 352, 349, 351)], NY('2026-10-19', 10, 26), null).exit).toMatchObject({ price: 350, reason: 'stop' });
  });
  it('flat by close', () => {
    const o = makeOrder('1', plan, s, session.entriesUntilMs, T, 364.18);
    expect(advanceOrder(o, [bar(15, 55, 366, 367, 365, 366)], NY('2026-10-19', 16, 0), null).exit).toMatchObject({ price: 366, reason: 'flat' });
  });
  it('a limit order not filled by the cutoff expires', () => {
    const lim = makeOrder('2', plan, sizeTrade(plan, DEFAULT_LIMITS, { limit: 362 }), session.entriesUntilMs, T, null);
    expect(lim.status).toBe('pending');
    expect(advanceOrder(lim, [bar(10, 20, 364, 366, 363, 365)], NY('2026-10-19', 15, 31), null).status).toBe('expired');
    expect(advanceOrder(lim, [bar(10, 20, 364, 366, 361.5, 365)], NY('2026-10-19', 10, 26), null)).toMatchObject({ status: 'open', fill: { price: 362 } });
  });
});

describe('alerts', () => {
  it('three alerts from a plan; stop and target ring once', () => {
    const rules = rulesFromPlan(plan);
    expect(rules.map((r) => [r.type, r.price ?? r.at])).toEqual([['stop', 358.32], ['target', 370.04], ['time', NY('2026-10-19', 15, 55)]]);
    const today = { NY: '2026-10-19', TLV: '2026-10-19' };
    const a = evaluatePriceAlerts(rules, { TSLA: { price: 358.1 } }, today, {}, T);
    expect(a.rings.map((r) => r.type)).toEqual(['stop']);
    expect(evaluatePriceAlerts(rules, { TSLA: { price: 358 } }, today, a.rung, T).rings).toEqual([]);
    expect(evaluatePriceAlerts(rules, { TSLA: { price: 371 } }, { ...today, NY: '2026-10-20' }, {}, T).rings).toEqual([]);
  });
  it('% move rings once a day', () => {
    const rule = { id: 'm', type: 'pct_move' as const, symbol: 'TSLA', pct: 3, zone: 'NY' as const, date: null };
    const today = { NY: '2026-10-19', TLV: '2026-10-19' };
    const a = evaluatePriceAlerts([rule], { TSLA: { price: 103.5, prevClose: 100 } }, today, {}, T);
    expect(a.rings[0].movePct).toBeCloseTo(3.5);
    expect(evaluatePriceAlerts([rule], { TSLA: { price: 104, prevClose: 100 } }, today, a.rung, T).rings).toEqual([]);
  });
});
