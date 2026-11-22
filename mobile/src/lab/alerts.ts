/**
 * Practice alerts (trader-alerts): above, below, stop, target, % move, time, opening bell.
 * Three alerts come from each plan: the stop, the target and a flat-by-close time alert.
 *
 * Time alerts (opening bell, flat by close) are scheduled ahead as local notifications, so they
 * arrive with the app closed on both phones. Price alerts are checked while Kesefly is open
 * (state/lab-alerts.ts); the Lab screen says so.
 */
import type { Plan } from './exit';
import type { Zone } from './sessions';

export type AlertType = 'above' | 'below' | 'stop' | 'target' | 'pct_move' | 'time' | 'opening_bell';

export type AlertRule = {
  id: string;
  type: AlertType;
  symbol: string;
  /** above / below / stop / target. */
  price?: number;
  /** pct_move: percent from the previous close (2 = 2%). */
  pct?: number;
  /** time / opening_bell: the instant it rings (UTC ms). */
  at?: number;
  zone: Zone;
  /** Session date it is for; null = every day (price rules only). */
  date: string | null;
  label?: 'flat-by' | 'opening-bell' | 'plan-stop' | 'plan-target';
  /** Ring again after the price goes back. */
  rearm?: boolean;
};

export type Ring = { id: string; symbol: string; type: AlertType; price?: number; level?: number; movePct?: number };

export type Quote = { price: number; prevClose?: number | null };

export function rulesFromPlan(plan: Plan): AlertRule[] {
  const s = plan.symbol.toLowerCase();
  return [
    { id: `${s}-plan-stop-${plan.date}`, type: 'stop', symbol: plan.symbol, price: plan.stop, zone: plan.zone, date: plan.date, label: 'plan-stop' },
    { id: `${s}-plan-target-${plan.date}`, type: 'target', symbol: plan.symbol, price: plan.target, zone: plan.zone, date: plan.date, label: 'plan-target' },
    { id: `${s}-flat-by-${plan.date}`, type: 'time', symbol: plan.symbol, at: plan.flatByMs, zone: plan.zone, date: plan.date, label: 'flat-by' },
  ];
}

export const isTimeRule = (r: AlertRule) => r.type === 'time' || r.type === 'opening_bell';

/**
 * Price rules against quotes. `rung` maps rule id to the time it rang; a rung rule does not
 * ring again unless it re-arms after the price goes back. Pure: returns rings and the new map.
 */
export function evaluatePriceAlerts(rules: AlertRule[], quotes: Record<string, Quote>, today: Record<Zone, string>, rung: Record<string, number>, now: number): { rings: Ring[]; rung: Record<string, number> } {
  const next = { ...rung };
  const rings: Ring[] = [];
  for (const r of rules) {
    if (isTimeRule(r)) continue;
    if (r.date && r.date !== today[r.zone]) continue;
    const q = quotes[r.symbol.toUpperCase()];
    if (!q) continue;
    const p = q.price;
    if (r.type === 'pct_move') {
      if (!q.prevClose || r.pct == null) continue;
      const move = 100 * (p / q.prevClose - 1);
      const dayKey = `${r.id}|${today[r.zone]}`;
      if (Math.abs(move) >= r.pct && !next[dayKey]) {
        rings.push({ id: r.id, symbol: r.symbol, type: r.type, price: p, movePct: move });
        next[dayKey] = now;
      }
      continue;
    }
    const dir = r.type === 'stop' || r.type === 'below' ? 'below' : 'above';
    const hit = dir === 'above' ? p >= (r.price ?? Infinity) : p <= (r.price ?? -Infinity);
    if (hit && !next[r.id]) {
      rings.push({ id: r.id, symbol: r.symbol, type: r.type, price: p, level: r.price });
      next[r.id] = now;
    } else if (!hit && next[r.id] && r.rearm) {
      delete next[r.id];
    }
  }
  return { rings, rung: next };
}
