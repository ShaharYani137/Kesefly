/**
 * Exit planner (trader-exit): sets the stop and the target BEFORE the entry, so the user
 * knows when to get out. Long side only. It never places an order.
 *
 * Stops (a long's stop rounds DOWN to the cent, away from the entry):
 *   or-mid   opening-range midpoint (default for an orb entry)
 *   or-low   opening-range low
 *   price    the user's price
 *   pct      X percent under the entry
 *   atr      K times the 14-bar ATR under the entry, on the session's bars up to the entry bar
 * Targets (round half up to the cent): entry + R x risk (1R, 1.5R, 2R ...), or a price.
 * Refused, with a reason code: stop at or above the entry, target at or below it, risk under
 * 0.05% of the price (too tight to survive the spread), entry at or after flat-by.
 * Flat by: the session's flat-by time (15:55 New York, moved up on an early close).
 *
 * A stop is a plan, not a guarantee: a gap or a fast market can fill past it.
 */
import type { SlotBar } from './bars';
import { atr } from './indicators';
import { type LabSession, OR_MINUTES, sessionFor, type Zone, zoneOf } from './sessions';

export type StopRule = 'or_mid' | 'or_low' | 'price' | 'pct' | 'atr';
export type TargetRule = { kind: 'r'; r: number } | { kind: 'price'; price: number };

export type Plan = {
  symbol: string;
  zone: Zone;
  currency: 'USD' | 'ILS';
  /** Local session date YYYY-MM-DD. */
  date: string;
  setup: 'orb' | 'level';
  entry: number;
  /** Close time of the entry bar (UTC ms), when known. */
  entryTime: number | null;
  /** Session slot of the entry bar, when known (Time Machine needs it). */
  entryBar: number | null;
  intervalSec: number;
  openingRange: { high: number; low: number; minutes: number } | null;
  stop: number;
  stopRule: StopRule;
  stopParam: number | null;
  target: number;
  targetR: number;
  riskPerShare: number;
  rewardRisk: number;
  flatByMs: number;
  atr: number | null;
  atrBars: number | null;
  createdAt: number;
};

export type PlanErrorCode = 'no-range' | 'range-inverted' | 'stop-above-entry' | 'stop-not-positive' | 'too-tight' | 'target-below-entry' | 'no-bars-for-atr' | 'entry-after-flat' | 'bad-entry' | 'no-session';

export class PlanError extends Error {
  constructor(public code: PlanErrorCode) {
    super(code);
  }
}

const EPS = 1e-7;
/** Integer cents, half up (exact for prices that are already cents). */
const toCents = (x: number) => Math.floor(x * 100 + 0.5 + EPS);
const floorCents = (x: number) => Math.floor(x * 100 + EPS);
const MIN_RISK_PCT = 0.05;

export type PlanInput = {
  symbol: string;
  entry: number;
  setup?: 'orb' | 'level';
  stopRule?: StopRule;
  /** price for 'price', percent for 'pct', K for 'atr'. */
  stopParam?: number;
  target?: TargetRule;
  orHigh?: number | null;
  orLow?: number | null;
  /** The session's closed bars up to the entry, for an ATR stop. */
  bars?: SlotBar[];
  entryTime?: number | null;
  entryBar?: number | null;
  intervalSec?: number;
  /** Session to plan for; defaults to the session at `now`. */
  session?: LabSession | null;
};

/** The stop, target and risk in exact cents. Throws PlanError. */
export function computeLevels(entry: number, rule: StopRule, param: number | null, target: TargetRule, orHigh?: number | null, orLow?: number | null, atrValue?: number | null) {
  const e = toCents(entry);
  if (!(e > 0)) throw new PlanError('bad-entry');
  let rawCents: number;
  if (rule === 'or_mid' || rule === 'or_low') {
    if (orHigh == null || orLow == null) throw new PlanError('no-range');
    const oh = toCents(orHigh);
    const ol = toCents(orLow);
    if (oh <= ol) throw new PlanError('range-inverted');
    rawCents = rule === 'or_mid' ? (oh + ol) / 2 : ol;
  } else if (rule === 'price') {
    rawCents = (param ?? 0) * 100;
  } else if (rule === 'pct') {
    rawCents = e * (1 - (param ?? 0) / 100);
  } else {
    if (atrValue == null) throw new PlanError('no-bars-for-atr');
    rawCents = e - (param ?? 1) * Math.round(atrValue * 1e6) / 1e6 * 100;
  }
  const stop = Math.floor(rawCents + EPS);
  if (stop >= e) throw new PlanError('stop-above-entry');
  if (stop <= 0) throw new PlanError('stop-not-positive');
  const risk = e - stop;
  if (risk < (e * MIN_RISK_PCT) / 100) throw new PlanError('too-tight');
  const tgt = target.kind === 'r' ? Math.floor(e + target.r * risk + 0.5 + EPS) : toCents(target.price);
  if (tgt <= e) throw new PlanError('target-below-entry');
  const rr = Math.floor(((tgt - e) / risk) * 100 + 0.5 + EPS) / 100;
  return { entry: e / 100, stop: stop / 100, target: tgt / 100, risk: risk / 100, rewardRisk: rr, targetR: target.kind === 'r' ? target.r : rr };
}

export function buildPlan(input: PlanInput, now = Date.now()): Plan {
  const zone = zoneOf(input.symbol);
  const stepSec = input.intervalSec ?? 300;
  const session = input.session ?? sessionFor(zone, input.entryTime ?? now, stepSec);
  if (!session) throw new PlanError('no-session');
  const setup = input.setup ?? (input.orHigh != null ? 'orb' : 'level');
  const rule: StopRule = input.stopRule ?? (setup === 'orb' ? 'or_mid' : 'pct');
  const param = input.stopParam ?? (rule === 'pct' ? 1 : rule === 'atr' ? 1.5 : null);
  let atrValue: number | null = null;
  let atrBars: number | null = null;
  if (rule === 'atr') {
    const upto = (input.bars ?? []).filter((b) => input.entryBar == null || b.slot <= input.entryBar);
    if (upto.length < 3) throw new PlanError('no-bars-for-atr');
    [atrValue, atrBars] = atr(upto);
  }
  const target = input.target ?? { kind: 'r', r: 2 };
  const lv = computeLevels(input.entry, rule, param, target, input.orHigh, input.orLow, atrValue);
  if (input.entryTime != null && input.entryTime >= session.flatByMs) throw new PlanError('entry-after-flat');
  return {
    symbol: input.symbol.toUpperCase(),
    zone,
    currency: session.currency,
    date: session.date,
    setup,
    entry: lv.entry,
    entryTime: input.entryTime ?? null,
    entryBar: input.entryBar ?? null,
    intervalSec: stepSec,
    openingRange: input.orHigh != null && input.orLow != null ? { high: toCents(input.orHigh) / 100, low: toCents(input.orLow) / 100, minutes: OR_MINUTES } : null,
    stop: lv.stop,
    stopRule: rule,
    stopParam: param,
    target: lv.target,
    targetR: lv.targetR,
    riskPerShare: lv.risk,
    rewardRisk: lv.rewardRisk,
    flatByMs: session.flatByMs,
    atr: atrValue == null ? null : Math.round(atrValue * 1e4) / 1e4,
    atrBars,
    createdAt: now,
  };
}

export { floorCents, toCents };
