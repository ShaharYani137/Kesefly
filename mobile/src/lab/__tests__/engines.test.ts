import { describe, expect, it } from 'vitest';

import { parseChart } from '../candles';
import { evaluateEntry } from '../entry';
import { buildPlan, computeLevels, PlanError } from '../exit';
import { localToUtc } from '../sessions';
import { runTimeMachine, verdict } from '../timemachine';
import { fixture } from './fixtures';

const NY = (date: string, h: number, m: number) => localToUtc('NY', date, h * 60 + m);
const day = parseChart(JSON.parse(fixture('TSLA-2026-10-19-5m.json')), 'TSLA');
const sixty = parseChart(JSON.parse(fixture('TSLA-60d5m.json.gz')), 'TSLA');

describe('entry timer (the reel: TSLA 19 Oct 2026)', () => {
  it('triggers at 10:15 at 364.18 over the 362.18 range high', () => {
    const r = evaluateEntry(day, NY('2026-10-19', 10, 50));
    expect(r.status).toBe('triggered');
    expect(r.openingRange).toMatchObject({ high: 362.18, low: 354.47, bars: 3 });
    expect(r.trigger!.price).toBe(364.18);
    expect(r.trigger!.time).toBe(NY('2026-10-19', 10, 15));
    expect(r.trigger!.slot).toBe(8);
  });
  it('is forming before 9:45 and waiting just before the trigger', () => {
    expect(evaluateEntry(day, NY('2026-10-19', 9, 40)).phase).toBe('forming');
    const w = evaluateEntry(day, NY('2026-10-19', 10, 14));
    expect(w.status).toBe('waiting');
    expect(w.level).toBe(362.18);
  });
  it('pre-open and weekend', () => {
    expect(evaluateEntry(day, NY('2026-10-19', 9, 0)).phase).toBe('pre-open');
    expect(evaluateEntry(day, NY('2026-10-18', 11, 0)).status).toBe('no-data');
  });
});

describe('exit planner', () => {
  it('or-mid stop 358.32, 1R target 370.04, risk 5.86', () => {
    const p = buildPlan({ symbol: 'TSLA', entry: 364.18, orHigh: 362.18, orLow: 354.47, target: { kind: 'r', r: 1 }, entryTime: NY('2026-10-19', 10, 15), entryBar: 8 });
    expect([p.stop, p.target, p.riskPerShare, p.rewardRisk]).toEqual([358.32, 370.04, 5.86, 1]);
    expect(p.date).toBe('2026-10-19');
    expect(p.flatByMs).toBe(NY('2026-10-19', 15, 55));
  });
  it('2R default and pct stop', () => {
    expect(computeLevels(364.18, 'or_mid', null, { kind: 'r', r: 2 }, 362.18, 354.47).target).toBe(375.9);
    expect(computeLevels(190.25, 'pct', 1, { kind: 'r', r: 2 }).stop).toBe(188.34);
  });
  it('refuses a stop above the entry and a too-tight stop', () => {
    expect(() => computeLevels(100, 'price', 101, { kind: 'r', r: 2 })).toThrow(PlanError);
    expect(() => computeLevels(1000, 'price', 999.99, { kind: 'r', r: 2 })).toThrow('too-tight');
  });
});

describe('time machine (the reel)', () => {
  const plan = buildPlan({ symbol: 'TSLA', entry: 364.18, orHigh: 362.18, orLow: 354.47, target: { kind: 'r', r: 1 }, entryTime: NY('2026-10-19', 10, 15), entryBar: 8 });
  const tm = runTimeMachine(sixty, plan, NY('2026-10-19', 10, 50));
  it('reproduces the skill odds exactly', () => {
    const m = tm.mc;
    expect(m.poolSessions).toBe(59);
    expect(m.barsLeft).toBe(69);
    expect([m.poolFrom, m.poolTo]).toEqual(['2026-07-27', '2026-10-16']);
    expect([m.pTarget, m.pStop, m.pNeither, m.pGreen]).toEqual([0.2938, 0.2548, 0.4514, 0.5168]);
    expect([m.medianClose, m.p5Close, m.p95Close, m.avgR, m.rAtTarget]).toEqual([364.36, 355.54, 373.54, 0.034, 1]);
  });
  it('fan chart and histogram match', () => {
    expect(tm.mc.bands[tm.mc.bands.length - 1]).toEqual([355.42, 360.91, 364.46, 368.12, 373.65]);
    expect(tm.mc.hist).toEqual({ lo: 351.75, hi: 377.39, bins: [107, 109, 128, 199, 252, 331, 465, 571, 689, 694, 757, 811, 761, 732, 686, 558, 503, 452, 327, 244, 160, 125, 102, 78] });
    expect(tm.mc.samplePaths).toHaveLength(160);
  });
  it('history replay matches', () => {
    const h = tm.history;
    expect([h.sessions, h.triggered, h.target, h.stop, h.close, h.green, h.avgR]).toEqual([59, 33, 13, 15, 5, 15, -0.062]);
    expect(h.trades[0]).toMatchObject({ date: '2026-07-28', entry: 307.97, stop: 304.89, target: 311.05, outcome: 'target' });
  });
  it('verdict: close to a coin flip, many neither', () => {
    expect(tm.verdict.code).toBe('coin');
    expect(tm.verdict.manyNeither).toBe(true);
    expect(verdict({ pTarget: 0.4, pStop: 0.3, pNeither: 0.3, rAtTarget: 1, avgR: 0.1 }).code).toBe('lean-target');
    expect(verdict({ pTarget: 0.1, pStop: 0.6, pNeither: 0.3, rAtTarget: 1, avgR: -0.5 }).code).toBe('strong-stop');
    expect(verdict({ pTarget: 0, pStop: 0, pNeither: 1, rAtTarget: 1, avgR: 0 }).code).toBe('none');
  });
});
