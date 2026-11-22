/**
 * Time Machine (trader-timemachine): replays a planned day trade before any money is at risk.
 * 10,000 simulated runs of the rest of the session from the entry, plus the same rule on
 * every past session in the data. Same algorithm and same random draws as the skill (CPython
 * Mersenne Twister, seed 19), so the numbers match it exactly.
 *
 * 1. 60 days of 5-minute bars. Keep only FULL sessions before the plan's date (every slot of
 *    a regular session: 78 bars in New York; Tel Aviv by its own session length, so Fridays
 *    and Mon-Thu are separate pools: Kesefly design decision). Half days, gaps and today are
 *    left out.
 * 2. The pool: for every bar slot 1..n-1, each past session's bar as ratios to the previous
 *    bar's close: (open, high, low, close) / previous close.
 * 3. One replay starts at the entry price and walks the rest of the session. For bar i it
 *    picks slot j = i + randint(-window, window), kept in 1..n-1, then one past bar from
 *    pool[j], scaled to the current price. The stop is checked before the target in every bar,
 *    so a bar that touches both counts as the stop (the conservative call).
 * 4. Outcomes: target, stop, or neither (still open at the close / `untilMs`).
 * 5. Price at the end: median and 5th-95th percentile; fan chart from a second run of 2,000
 *    paths with the same seed; histogram of 24 bins between the 1st and 99th percentile.
 * 6. History: the plan's own rule (opening-range breakout, same stop rule and target R) on
 *    every past full session.
 *
 * A simulation built from the stock's own recent bars is not a prediction: earnings, news
 * and halts can do what the last 60 days never did.
 */
import type { Candle, Chart } from './candles';
import type { Plan } from './exit';
import { PyRandom } from './random';
import { localDate, type LabSession, sessionFor, type Zone } from './sessions';

const STEP_SEC = 300;
const STEP = STEP_SEC * 1000;
const MIN_SESSIONS = 20;
const SAMPLE_PATHS = 160;
const BAND_PATHS = 2000;
const BAND_Q = [0.05, 0.25, 0.5, 0.75, 0.95];
const HIST_BINS = 24;
const COIN_FLIP = 0.05;
const STRONG = 0.15;
const MANY_NEITHER = 0.4;

/** Python's round(x, n) for display values (exact binary value, half away from zero at ties). */
export const pyRound = (x: number, n: number) => Number(x.toFixed(n)) + 0;

type Bar = { o: number; h: number; l: number; c: number; t: number };
type Day = { date: string; session: LabSession; nBars: number; bars: Map<number, Bar> };

export type TMErrorCode = 'no-bars' | 'not-5m' | 'entry-missing' | 'too-few-sessions' | 'nothing-left' | 'bad-plan';
export class TMError extends Error {
  constructor(public code: TMErrorCode, public detail?: Record<string, unknown>) {
    super(code);
  }
}

/** Complete regular-session 5-minute bars by local date (bars not finished at `asOf` dropped). */
export function splitSessions(chart: Chart, zone: Zone, now: number): Map<string, Day> {
  const asOf = chart.dataTime != null && chart.dataTime < now ? chart.dataTime : now;
  const days = new Map<string, Day>();
  const sessions = new Map<string, LabSession | null>();
  const anchors = new Map<string, number>();
  for (const b of chart.bars as Candle[]) {
    const date = localDate(zone, b.t);
    if (!sessions.has(date)) sessions.set(date, sessionFor(zone, b.t, STEP_SEC));
    const s = sessions.get(date);
    if (!s || b.t < s.gridOpenMs || b.t >= s.closeMs) continue;
    if (zone === 'TLV' && !anchors.has(date)) anchors.set(date, b.t);
    const anchor = zone === 'NY' ? s.gridOpenMs : anchors.get(date)!;
    if ((((b.t - anchor) % STEP) + STEP) % STEP) continue;
    if (b.t + STEP > asOf) continue;
    let d = days.get(date);
    if (!d) {
      d = { date, session: s, nBars: Math.round((s.closeMs - s.gridOpenMs) / STEP), bars: new Map() };
      days.set(date, d);
    }
    d.bars.set(Math.floor((b.t - s.gridOpenMs) / STEP), { o: b.o, h: b.h, l: b.l, c: b.c, t: b.t });
  }
  return days;
}

type Ratio = [number, number, number, number];

export function buildPool(sessions: Bar[][], nBars: number): Ratio[][] {
  const pool: Ratio[][] = Array.from({ length: nBars }, () => []);
  for (const D of sessions) {
    for (let i = 1; i < nBars; i++) {
      const pc = D[i - 1].c;
      pool[i].push([D[i].o / pc, D[i].h / pc, D[i].l / pc, D[i].c / pc]);
    }
  }
  return pool;
}

const pct = (a: number[], q: number) => a[Math.min(a.length - 1, Math.floor(q * a.length))];

export type MonteCarlo = {
  replays: number;
  seed: number;
  window: number;
  barsLeft: number;
  pTarget: number;
  pStop: number;
  pNeither: number;
  pGreen: number;
  medianClose: number;
  p5Close: number;
  p95Close: number;
  avgR: number;
  rAtTarget: number;
  /** Per bar from the entry: [p5, p25, p50, p75, p95]. */
  bands: number[][];
  bandTimes: number[];
  samplePaths: number[][];
  hist: { lo: number; hi: number; bins: number[] };
  untilMs: number;
  poolSessions: number;
  poolFrom: string;
  poolTo: string;
};

type SimArgs = { pool: Ratio[][]; nBars: number; entry: number; stop: number; target: number; k: number; last: number; replays: number; seed: number; window: number };

/** The simulation as a generator: yields progress 0..1 every `chunk` replays, returns the numbers. */
export function* simulateSteps(a: SimArgs, chunk = 500): Generator<number, Omit<MonteCarlo, 'bandTimes' | 'untilMs' | 'poolSessions' | 'poolFrom' | 'poolTo'>> {
  const { pool, nBars, entry, stop, target, k, last, replays, seed, window } = a;
  const risk = entry - stop;
  const rTarget = pyRound((target - entry) / risk, 4);
  const top = nBars - 1;
  const slot = (rng: PyRandom, i: number) => (window === 0 ? i : Math.min(top, Math.max(1, i + rng.randint(-window, window))));
  let rng = new PyRandom(seed);
  let nT = 0;
  let nS = 0;
  let green = 0;
  let sumR = 0;
  const closes = new Array<number>(replays);
  const paths: number[][] = [];
  const total = replays + BAND_PATHS;
  for (let n = 0; n < replays; n++) {
    let p = entry;
    let outcome: 0 | 1 | 2 = 0; // 0 neither, 1 stop, 2 target
    const keep = n < SAMPLE_PATHS;
    const path = keep ? [entry] : null;
    for (let i = k + 1; i <= last; i++) {
      const r = rng.choice(pool[slot(rng, i)]);
      if (outcome === 0) {
        if (p * r[2] <= stop) outcome = 1;
        else if (p * r[1] >= target) outcome = 2;
      }
      p = p * r[3];
      if (path) path.push(pyRound(p, 2));
    }
    closes[n] = p;
    if (outcome === 2) {
      nT++;
      green++;
      sumR += rTarget;
    } else if (outcome === 1) {
      nS++;
      sumR += -1;
    } else {
      if (p > entry) green++;
      sumR += (p - entry) / risk;
    }
    if (path) paths.push(path);
    if ((n + 1) % chunk === 0) yield (n + 1) / total;
  }
  const srt = closes.slice().sort((x, y) => x - y);
  rng = new PyRandom(seed);
  const cols: number[][] = Array.from({ length: last - k + 1 }, () => new Array<number>(BAND_PATHS));
  for (let n = 0; n < BAND_PATHS; n++) {
    let p = entry;
    cols[0][n] = entry;
    for (let i = k + 1, j = 1; i <= last; i++, j++) {
      p = p * rng.choice(pool[slot(rng, i)])[3];
      cols[j][n] = p;
    }
    if ((n + 1) % chunk === 0) yield (replays + n + 1) / total;
  }
  const bands = cols.map((col) => {
    col.sort((x, y) => x - y);
    return BAND_Q.map((q) => pyRound(pct(col, q), 2));
  });
  const lo = pct(srt, 0.01);
  const hi = pct(srt, 0.99);
  const W = (hi - lo) / HIST_BINS;
  const bins = new Array<number>(HIST_BINS).fill(0);
  for (const c of srt) {
    const b = W > 0 ? Math.trunc((c - lo) / W) : 0;
    if (b >= 0 && b < HIST_BINS) bins[b]++;
  }
  return {
    replays,
    seed,
    window,
    barsLeft: last - k,
    pTarget: pyRound(nT / replays, 4),
    pStop: pyRound(nS / replays, 4),
    pNeither: pyRound((replays - nT - nS) / replays, 4),
    pGreen: pyRound(green / replays, 4),
    medianClose: pyRound(pct(srt, 0.5), 2),
    p5Close: pyRound(pct(srt, 0.05), 2),
    p95Close: pyRound(pct(srt, 0.95), 2),
    avgR: pyRound(sumR / replays, 3),
    rAtTarget: rTarget,
    bands,
    samplePaths: paths,
    hist: { lo: pyRound(lo, 2), hi: pyRound(hi, 2), bins },
  };
}

/* ---------- history replay ---------- */

export type HistoryRule = { orMinutes: number; stopRule: 'or_mid' | 'or_low' | 'pct'; targetR: number; stopPct?: number };
export type HistoryTrade = { date: string; time: number; entry: number; stop: number; target: number; outcome: 'target' | 'stop' | 'close'; R: number };
export type History = { sessions: number; triggered: number; target: number; stop: number; close: number; green: number; avgR: number | null; rule: HistoryRule | null; trades: HistoryTrade[] };

const centsAway = (x: number) => Math.floor(pyRound(x * 100, 4)) / 100;

function ruleStop(rule: HistoryRule, oh: number, ol: number, entry: number): number {
  if (rule.stopRule === 'or_mid') return centsAway((oh + ol) / 2);
  if (rule.stopRule === 'or_low') return centsAway(ol);
  return centsAway(entry * (1 - (rule.stopPct ?? 1) / 100));
}

export function resolveRule(plan: Plan): HistoryRule | null {
  if (plan.setup !== 'orb' || !plan.openingRange) return null;
  const rule: HistoryRule = { orMinutes: plan.openingRange.minutes, stopRule: 'pct', targetR: plan.targetR };
  if (plan.stopRule === 'or_mid' || plan.stopRule === 'or_low') rule.stopRule = plan.stopRule;
  else rule.stopPct = pyRound((100 * plan.riskPerShare) / plan.entry, 4);
  return rule;
}

export function historyReplay(sessions: { date: string; bars: Bar[]; gridOpenMs: number }[], rule: HistoryRule, last: number): History {
  const n = rule.orMinutes / 5;
  const trades: HistoryTrade[] = [];
  for (const { date, bars: D, gridOpenMs } of sessions) {
    const rows = D.slice(0, n);
    const oh = Math.max(...rows.map((b) => b.h));
    const ol = Math.min(...rows.map((b) => b.l));
    let kk = -1;
    for (let i = n; i <= last; i++) {
      if (D[i].c > oh) {
        kk = i;
        break;
      }
    }
    if (kk < 0) continue;
    const e = pyRound(D[kk].c, 2);
    const s = ruleStop(rule, oh, ol, e);
    const risk = e - s;
    if (risk <= 0) continue;
    const t = pyRound(e + rule.targetR * risk, 2);
    let oc: HistoryTrade['outcome'] | null = null;
    for (const b of D.slice(kk + 1, last + 1)) {
      if (b.l <= s) {
        oc = 'stop';
        break;
      }
      if (b.h >= t) {
        oc = 'target';
        break;
      }
    }
    const cl = D[last].c;
    const R = oc === 'target' ? (t - e) / risk : oc === 'stop' ? -1 : (cl - e) / risk;
    trades.push({ date, time: gridOpenMs + STEP * (kk + 1), entry: e, stop: s, target: t, outcome: oc ?? 'close', R: pyRound(R, 2) });
  }
  return {
    sessions: sessions.length,
    triggered: trades.length,
    target: trades.filter((x) => x.outcome === 'target').length,
    stop: trades.filter((x) => x.outcome === 'stop').length,
    close: trades.filter((x) => x.outcome === 'close').length,
    green: trades.filter((x) => x.R > 0).length,
    avgR: trades.length ? pyRound(trades.reduce((a, x) => a + x.R, 0) / trades.length, 3) : null,
    rule,
    trades,
  };
}

/* ---------- verdict ---------- */

export type VerdictCode = 'none' | 'coin' | 'even' | 'lean-target' | 'lean-stop' | 'strong-target' | 'strong-stop';
export type Verdict = { code: VerdictCode; share: number | null; breakEven: number | null; pTarget: number; pStop: number; r: number; manyNeither: boolean; avgRAgainst: boolean };

export function verdict(mc: Pick<MonteCarlo, 'pTarget' | 'pStop' | 'pNeither' | 'rAtTarget' | 'avgR'>): Verdict {
  const { pTarget: pt, pStop: ps } = mc;
  const r = mc.rAtTarget || 1;
  const base = { pTarget: pt, pStop: ps, r, manyNeither: false, avgRAgainst: false };
  if (pt + ps <= 0) return { ...base, code: 'none', share: null, breakEven: null };
  const share = pt / (pt + ps);
  const even = 1 / (1 + r);
  const d = share - even;
  const oneR = Math.abs(r - 1) < 0.005;
  let code: VerdictCode;
  if (Math.abs(d) < COIN_FLIP) code = oneR ? 'coin' : 'even';
  else if (Math.abs(d) < STRONG) code = d > 0 ? 'lean-target' : 'lean-stop';
  else code = d > 0 ? 'strong-target' : 'strong-stop';
  return {
    ...base,
    code,
    share,
    breakEven: even,
    manyNeither: mc.pNeither > MANY_NEITHER,
    avgRAgainst: Math.abs(d) >= COIN_FLIP && mc.avgR !== 0 && mc.avgR > 0 !== d > 0,
  };
}

/* ---------- the run ---------- */

export type TimeMachineResult = { mc: MonteCarlo; history: History; verdict: Verdict; warnings: ('entry-outside-bar')[]; shortSessionsLeftOut: number };

export type TMOptions = { replays?: number; seed?: number; window?: number; untilMs?: number };

/** Validates, builds the pool, then yields progress while simulating. */
export function* timeMachineSteps(chart: Chart, plan: Plan, now: number, opts: TMOptions = {}): Generator<number, TimeMachineResult> {
  const replays = opts.replays ?? 10_000;
  const seed = opts.seed ?? 19;
  const window = opts.window ?? 2;
  if (chart.granularity && chart.granularity !== '5m') throw new TMError('not-5m');
  if (plan.entryBar == null) throw new TMError('bad-plan');
  const days = splitSessions(chart, plan.zone, now);
  if (!days.size) throw new TMError('no-bars');
  const entryDay = days.get(plan.date);
  const k = plan.entryBar;
  if (!entryDay || !entryDay.bars.has(k)) throw new TMError('entry-missing', { date: plan.date });
  const nBars = entryDay.nBars;
  const untilMs = opts.untilMs ?? entryDay.session.closeMs;
  const last = Math.round((untilMs - entryDay.session.gridOpenMs) / STEP) - 1;
  if (last <= k) throw new TMError('nothing-left');
  const warnings: TimeMachineResult['warnings'] = [];
  const eb = entryDay.bars.get(k)!;
  if (!(eb.l - 0.01 <= plan.entry && plan.entry <= eb.h + 0.01)) warnings.push('entry-outside-bar');

  const full: { date: string; bars: Bar[]; gridOpenMs: number }[] = [];
  let short = 0;
  for (const date of [...days.keys()].sort()) {
    if (date >= plan.date) continue;
    const d = days.get(date)!;
    if (d.nBars === nBars && d.bars.size === nBars) full.push({ date, bars: Array.from({ length: nBars }, (_, i) => d.bars.get(i)!), gridOpenMs: d.session.gridOpenMs });
    else short++;
  }
  if (full.length < MIN_SESSIONS) throw new TMError('too-few-sessions', { found: full.length, need: MIN_SESSIONS });
  const pool = buildPool(full.map((f) => f.bars), nBars);
  const sim = simulateSteps({ pool, nBars, entry: plan.entry, stop: plan.stop, target: plan.target, k, last, replays, seed, window });
  let step = sim.next();
  while (!step.done) {
    yield step.value;
    step = sim.next();
  }
  const mc: MonteCarlo = {
    ...step.value,
    untilMs,
    poolSessions: full.length,
    poolFrom: full[0].date,
    poolTo: full[full.length - 1].date,
    bandTimes: Array.from({ length: last - k + 1 }, (_, j) => entryDay.session.gridOpenMs + STEP * (k + 1 + j)),
  };
  const rule = resolveRule(plan);
  const history: History = rule ? historyReplay(full, rule, last) : { sessions: full.length, triggered: 0, target: 0, stop: 0, close: 0, green: 0, avgR: null, rule: null, trades: [] };
  return { mc, history, verdict: verdict(mc), warnings, shortSessionsLeftOut: short };
}

/** Synchronous run (tests). */
export function runTimeMachine(chart: Chart, plan: Plan, now: number, opts?: TMOptions): TimeMachineResult {
  const g = timeMachineSteps(chart, plan, now, opts);
  let s = g.next();
  while (!s.done) s = g.next();
  return s.value;
}

/** Runs in small chunks, giving the UI thread a turn between them, so the phone never freezes. */
export async function runTimeMachineAsync(chart: Chart, plan: Plan, now: number, opts?: TMOptions, onProgress?: (p: number) => void): Promise<TimeMachineResult> {
  const g = timeMachineSteps(chart, plan, now, opts);
  let s = g.next();
  while (!s.done) {
    onProgress?.(s.value);
    await new Promise((r) => setTimeout(r, 0));
    s = g.next();
  }
  onProgress?.(1);
  return s.value;
}
