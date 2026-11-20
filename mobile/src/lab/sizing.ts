/**
 * Position sizing (trader-budget): how many whole shares a plan can take, from the max loss,
 * the budget, the position cap, the max order and the cash. Shows which limit decided.
 * Dollars for New York, shekels for Tel Aviv (see limits.ts).
 *
 *   shares = min( max loss / risk a share,
 *                 position cap (% of budget) / entry,
 *                 max order / entry,
 *                 (cash or budget) minus the cash buffer / entry )
 * A market order is sized at the higher of a fresh price and the plan's entry.
 * qty 0 or a reward to risk under the minimum gives a refusal with the reason.
 */
import type { Plan } from './exit';
import type { LabLimits } from './limits';

export type LimitName = 'max-loss' | 'position-cap' | 'max-order' | 'cash';
export type SizeLimit = { name: LimitName; amount: number; per: number; shares: number; binds: boolean };

export type Sizing = {
  symbol: string;
  currency: 'USD' | 'ILS';
  entry: number;
  entryFrom: 'plan' | 'price' | 'limit';
  stop: number;
  target: number;
  riskPerShare: number;
  rewardRisk: number;
  budget: number;
  cashBuffer: number;
  cashAvailable: number;
  limits: SizeLimit[];
  qty: number;
  boundBy: LimitName;
  cost: number;
  maxLoss: number;
  orderType: 'market' | 'limit';
  refusal: null | { code: 'max-loss' | 'too-expensive' | 'reward-risk' | 'min-order'; limit?: LimitName };
};

const EPS = 1e-9;
export const roundCent = (x: number) => Math.floor(x * 100 + 0.5 + EPS) / 100;
const cents = (x: number) => Math.round(x * 100);

/** Whole shares that fit in `amount` at `perShare`, in exact integer cents. */
export function sharesFor(amount: number, perShare: number): number {
  const u = cents(amount);
  const p = cents(perShare);
  if (p <= 0 || u <= 0) return 0;
  return Math.floor(u / p);
}

export function sizeTrade(plan: Plan, limits: LabLimits, opts: { cash?: number | null; price?: number | null; limit?: number | null } = {}): Sizing {
  const L = limits[plan.currency];
  let entry: number;
  let entryFrom: Sizing['entryFrom'];
  if (opts.limit != null) [entry, entryFrom] = [roundCent(opts.limit), 'limit'];
  else if (opts.price != null && roundCent(opts.price) > roundCent(plan.entry)) [entry, entryFrom] = [roundCent(opts.price), 'price'];
  else [entry, entryFrom] = [roundCent(plan.entry), 'plan'];
  const stop = roundCent(plan.stop);
  const target = roundCent(plan.target);
  if (stop >= entry) throw new Error('stop-above-entry');
  if (target <= entry) throw new Error('target-passed');
  const riskC = cents(entry - stop);
  const rewardC = cents(target - entry);
  const risk = riskC / 100;

  const cashBuffer = roundCent((L.budget * L.cashBufferPct) / 100);
  let available = L.budget - cashBuffer;
  if (opts.cash != null && opts.cash - cashBuffer < available - 0.005) available = opts.cash - cashBuffer;
  available = Math.max(roundCent(available), 0);

  const list: Omit<SizeLimit, 'binds'>[] = [];
  if (L.maxLossPerTrade) list.push({ name: 'max-loss', amount: L.maxLossPerTrade, per: risk, shares: sharesFor(L.maxLossPerTrade, risk) });
  if (L.maxPositionPct) {
    const cap = roundCent((L.budget * L.maxPositionPct) / 100);
    list.push({ name: 'position-cap', amount: cap, per: entry, shares: sharesFor(cap, entry) });
  }
  if (L.maxOrder) list.push({ name: 'max-order', amount: L.maxOrder, per: entry, shares: sharesFor(L.maxOrder, entry) });
  list.push({ name: 'cash', amount: available, per: entry, shares: sharesFor(available, entry) });

  const qty = Math.max(0, Math.min(...list.map((l) => l.shares)));
  const boundBy = list.find((l) => l.shares === qty)!.name;
  const cost = roundCent(qty * entry);
  const maxLoss = roundCent((qty * riskC) / 100);
  let refusal: Sizing['refusal'] = null;
  if (qty === 0) refusal = boundBy === 'max-loss' ? { code: 'max-loss' } : { code: 'too-expensive', limit: boundBy };
  else if (limits.minRewardRisk && rewardC < limits.minRewardRisk * riskC - EPS) refusal = { code: 'reward-risk' };
  else if (cost < L.minOrder - 0.005) refusal = { code: 'min-order' };
  return {
    symbol: plan.symbol,
    currency: plan.currency,
    entry,
    entryFrom,
    stop,
    target,
    riskPerShare: risk,
    rewardRisk: Math.round((rewardC / riskC) * 100) / 100,
    budget: L.budget,
    cashBuffer,
    cashAvailable: available,
    limits: list.map((l) => ({ ...l, binds: l.name === boundBy })),
    qty,
    boundBy,
    cost,
    maxLoss,
    orderType: opts.limit != null ? 'limit' : 'market',
    refusal,
  };
}
