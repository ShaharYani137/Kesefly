/**
 * Risk check (trader-risk): PASS or BLOCK for one practice order, with every reason.
 *
 * BLOCK when any of these fails (the skill's day-trade rules):
 *   stop required and under the entry; max loss a trade; target above the entry; reward to
 *   risk at least the minimum; daily loss (already at risk today + this one); trades a day;
 *   entry window (after the opening range, before the cutoff, exchange open); size (min and
 *   max order, cash left above the buffer, no margin, position cap); a second trade in the
 *   same symbol the same day.
 */
import type { Plan } from './exit';
import type { LabLimits } from './limits';
import { type PaperAccount, ordersOn } from './paper';
import { type LabSession, phaseOf } from './sessions';
import type { Sizing } from './sizing';

export type RiskCode =
  | 'qty-zero'
  | 'stop-not-below'
  | 'max-loss'
  | 'target-not-above'
  | 'reward-risk'
  | 'daily-loss'
  | 'trades'
  | 'window-closed'
  | 'window-early'
  | 'window-late'
  | 'min-order'
  | 'max-order'
  | 'margin'
  | 'cash-buffer'
  | 'position-cap'
  | 'duplicate';

export type RiskReason = { code: RiskCode; values?: Record<string, number | string> };

export type RiskResult = {
  verdict: 'PASS' | 'BLOCK';
  reasons: RiskReason[];
  info: { maxLoss: number; rewardRisk: number; tradesToday: number; lossAtRiskToday: number; cashAfter: number };
};

const CENT = 0.005;

export function checkRisk(plan: Plan, s: Sizing, limits: LabLimits, acct: PaperAccount, session: LabSession | null, now = Date.now()): RiskResult {
  const L = limits[plan.currency];
  const reasons: RiskReason[] = [];
  const add = (code: RiskCode, values?: RiskReason['values']) => reasons.push({ code, values });

  const today = ordersOn(acct, plan.date);
  const tradesToday = today.length;
  const lossToday = today.filter((o) => o.currency === plan.currency).reduce((a, o) => a + o.maxLoss, 0);
  const cash = acct.cash[plan.currency];
  const cashAfter = cash - s.cost;

  if (s.qty <= 0) add('qty-zero');
  if (s.stop >= s.entry - CENT) add('stop-not-below', { stop: s.stop, entry: s.entry });
  if (s.maxLoss > L.maxLossPerTrade + CENT) add('max-loss', { loss: s.maxLoss, cap: L.maxLossPerTrade });
  if (s.target <= s.entry + CENT) add('target-not-above', { target: s.target, entry: s.entry });
  else if (limits.minRewardRisk && s.rewardRisk < limits.minRewardRisk - 1e-9) add('reward-risk', { rr: s.rewardRisk, min: limits.minRewardRisk });
  if (L.maxDailyLoss && lossToday + s.maxLoss > L.maxDailyLoss + CENT) add('daily-loss', { used: lossToday, loss: s.maxLoss, cap: L.maxDailyLoss });
  if (limits.maxTradesPerDay && tradesToday >= limits.maxTradesPerDay) add('trades', { done: tradesToday, cap: limits.maxTradesPerDay });

  const phase = phaseOf(session, now);
  if (!session || session.date !== plan.date || phase === 'closed' || phase === 'pre-open') add('window-closed');
  else if (phase === 'forming') add('window-early', { from: session.entriesFromMs });
  else if (phase === 'no-new-entries' || phase === 'flat') add('window-late', { until: session.entriesUntilMs });

  if (s.qty > 0) {
    if (s.cost < L.minOrder - CENT) add('min-order', { cost: s.cost, min: L.minOrder });
    if (L.maxOrder && s.cost > L.maxOrder + CENT) add('max-order', { cost: s.cost, max: L.maxOrder });
    const held = acct.orders.filter((o) => o.currency === plan.currency && o.status === 'open' && o.fill);
    const heldValue = held.reduce((a, o) => a + o.qty * o.fill!.price, 0);
    const total = cash + heldValue;
    const buffer = (total * L.cashBufferPct) / 100;
    if (cashAfter < -CENT) add('margin', { cost: s.cost, cash });
    else if (cashAfter < buffer - CENT) add('cash-buffer', { left: Math.max(cashAfter, 0), buffer });
    const sameValue = held.filter((o) => o.symbol === plan.symbol).reduce((a, o) => a + o.qty * o.fill!.price, 0);
    const cap = (total * L.maxPositionPct) / 100;
    if (total > 0 && sameValue + s.cost > cap + CENT) add('position-cap', { value: sameValue + s.cost, cap, pct: L.maxPositionPct });
  }
  if (today.some((o) => o.symbol === plan.symbol)) add('duplicate', { symbol: plan.symbol });

  return {
    verdict: reasons.length ? 'BLOCK' : 'PASS',
    reasons,
    info: { maxLoss: s.maxLoss, rewardRisk: s.rewardRisk, tradesToday, lossAtRiskToday: Math.round(lossToday * 100) / 100, cashAfter: Math.round(cashAfter * 100) / 100 },
  };
}
