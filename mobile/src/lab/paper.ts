/**
 * Practice (paper) account (trader-broker, without a broker): bracket orders with an entry,
 * a stop and a target, filled from live quotes and Yahoo bars. Nothing is ever sent to a
 * broker; the user confirms every practice order.
 *
 * Fills (KESEFLY DESIGN DECISIONS, following the skill's conservative rules):
 * - market entry: the live price when the user confirms;
 * - limit entry: the first bar whose low reaches the limit, at the limit (or the bar's open if
 *   it opened below); not filled by the entry cutoff = expired;
 * - stop: the first bar whose low reaches the stop, at the stop or the bar's open if it gapped
 *   through (a stop is not a guarantee);
 * - target: the first bar whose high reaches the target, at the target (or the open above it);
 * - a bar touching both counts as the stop;
 * - flat by: the first bar at or after flat-by time closes the trade at its open, or the live
 *   price when the app is open.
 * Bars catch up on everything that happened while the app was closed.
 */
import type { Candle } from './candles';
import type { Plan } from './exit';
import type { LabLimits } from './limits';
import type { Sizing } from './sizing';

export type ExitReason = 'stop' | 'target' | 'flat' | 'manual';
export type OrderStatus = 'pending' | 'open' | 'closed' | 'canceled' | 'expired';

export type PaperOrder = {
  id: string;
  symbol: string;
  currency: 'USD' | 'ILS';
  /** Session date the trade belongs to. */
  date: string;
  setup: Plan['setup'];
  qty: number;
  type: 'market' | 'limit';
  limit: number | null;
  planEntry: number;
  stop: number;
  target: number;
  targetR: number;
  maxLoss: number;
  flatByMs: number;
  entriesUntilMs: number;
  createdAt: number;
  status: OrderStatus;
  fill: { price: number; t: number } | null;
  exit: { price: number; t: number; reason: ExitReason } | null;
  /** Last instant the bars were checked up to. */
  checkedTo: number;
  note?: string;
};

export type PaperAccount = { cash: { USD: number; ILS: number }; orders: PaperOrder[]; startedAt: number };

export const newAccount = (limits: LabLimits, now = Date.now()): PaperAccount => ({ cash: { USD: limits.USD.budget, ILS: limits.ILS.budget }, orders: [], startedAt: now });

const r2 = (x: number) => Math.round(x * 100 + 1e-9) / 100;

export function makeOrder(id: string, plan: Plan, sizing: Sizing, entriesUntilMs: number, now: number, livePrice: number | null): PaperOrder {
  const o: PaperOrder = {
    id,
    symbol: plan.symbol,
    currency: plan.currency,
    date: plan.date,
    setup: plan.setup,
    qty: sizing.qty,
    type: sizing.orderType,
    limit: sizing.orderType === 'limit' ? sizing.entry : null,
    planEntry: plan.entry,
    stop: sizing.stop,
    target: sizing.target,
    targetR: plan.targetR,
    maxLoss: sizing.maxLoss,
    flatByMs: plan.flatByMs,
    entriesUntilMs,
    createdAt: now,
    status: 'pending',
    fill: null,
    exit: null,
    checkedTo: now,
  };
  if (o.type === 'market' && livePrice != null && livePrice > 0) {
    o.status = 'open';
    o.fill = { price: r2(livePrice), t: now };
  }
  return o;
}

/** Moves one order forward over bars (oldest first) and an optional live price. Pure. */
export function advanceOrder(order: PaperOrder, bars: Candle[], now: number, live: number | null, stepMs = 300_000): PaperOrder {
  const o: PaperOrder = { ...order, fill: order.fill && { ...order.fill }, exit: order.exit && { ...order.exit } };
  if (o.status === 'closed' || o.status === 'canceled' || o.status === 'expired') return o;
  const close = (price: number, t: number, reason: ExitReason) => {
    o.status = 'closed';
    o.exit = { price: r2(price), t, reason };
  };
  for (const b of bars) {
    if (b.t + stepMs <= o.checkedTo && o.status === 'open') continue;
    if (o.status === 'pending') {
      if (b.t < o.createdAt - stepMs) continue;
      if (b.t > o.entriesUntilMs) {
        o.status = 'expired';
        break;
      }
      if (o.limit != null && b.l <= o.limit) {
        o.status = 'open';
        o.fill = { price: r2(Math.min(o.limit, b.o)), t: Math.max(b.t, o.createdAt) };
        continue; // stops and targets count from the next bar
      }
      continue;
    }
    if (o.status === 'open' && o.fill) {
      if (b.t < o.fill.t) continue;
      if (b.t >= o.flatByMs) {
        close(b.o, b.t, 'flat');
        break;
      }
      if (b.l <= o.stop) {
        close(Math.min(o.stop, b.o), b.t, 'stop');
        break;
      }
      if (b.h >= o.target) {
        close(Math.max(o.target, b.o), b.t, 'target');
        break;
      }
    }
  }
  if (o.status === 'pending' && now > o.entriesUntilMs) o.status = 'expired';
  if (o.status === 'open' && live != null && live > 0) {
    if (live <= o.stop) close(live, now, 'stop');
    else if (live >= o.target) close(live, now, 'target');
    else if (now >= o.flatByMs) close(live, now, 'flat');
  }
  o.checkedTo = Math.max(o.checkedTo, now);
  return o;
}

/** Cash after applying an order's fill and exit (the account keeps cash; orders keep history). */
export function cashEffect(o: PaperOrder): number {
  let d = 0;
  if (o.fill) d -= o.qty * o.fill.price;
  if (o.exit) d += o.qty * o.exit.price;
  return r2(d);
}

export function applyUpdate(acct: PaperAccount, before: PaperOrder, after: PaperOrder): PaperAccount {
  const delta = r2(cashEffect(after) - cashEffect(before));
  return {
    ...acct,
    cash: { ...acct.cash, [after.currency]: r2(acct.cash[after.currency] + delta) },
    orders: acct.orders.map((x) => (x.id === after.id ? after : x)),
  };
}

export function placeOrder(acct: PaperAccount, o: PaperOrder): PaperAccount {
  return { ...acct, cash: { ...acct.cash, [o.currency]: r2(acct.cash[o.currency] + cashEffect(o)) }, orders: [o, ...acct.orders] };
}

/** Closes an open trade at the live price, or cancels a pending one. */
export function closeNow(o: PaperOrder, price: number | null, now: number): PaperOrder {
  if (o.status === 'pending') return { ...o, status: 'canceled', checkedTo: now };
  if (o.status !== 'open' || price == null) return o;
  return { ...o, status: 'closed', exit: { price: r2(price), t: now, reason: 'manual' }, checkedTo: now };
}

export type JournalRow = { order: PaperOrder; pnl: number; R: number; minutes: number };

/** Closed trades with profit and R multiple, newest first. R = (exit - fill) / (fill - stop). */
export function journal(acct: PaperAccount): JournalRow[] {
  return acct.orders
    .filter((o) => o.status === 'closed' && o.fill && o.exit)
    .map((o) => {
      const risk = o.fill!.price - o.stop;
      return {
        order: o,
        pnl: r2(o.qty * (o.exit!.price - o.fill!.price)),
        R: risk > 0 ? Math.round(((o.exit!.price - o.fill!.price) / risk) * 100) / 100 : 0,
        minutes: Math.round((o.exit!.t - o.fill!.t) / 60_000),
      };
    })
    .sort((a, b) => b.order.exit!.t - a.order.exit!.t);
}

export type JournalStats = { trades: number; wins: number; losses: number; winRate: number | null; avgR: number | null; pnl: { USD: number; ILS: number } };

export function journalStats(rows: JournalRow[]): JournalStats {
  const wins = rows.filter((r) => r.pnl > 0).length;
  const losses = rows.filter((r) => r.pnl < 0).length;
  const pnl = { USD: 0, ILS: 0 };
  for (const r of rows) pnl[r.order.currency] = r2(pnl[r.order.currency] + r.pnl);
  return {
    trades: rows.length,
    wins,
    losses,
    winRate: rows.length ? wins / rows.length : null,
    avgR: rows.length ? Math.round((rows.reduce((a, r) => a + r.R, 0) / rows.length) * 100) / 100 : null,
    pnl,
  };
}

/** Orders that count against today's limits for that session date (everything except canceled). */
export function ordersOn(acct: PaperAccount, date: string): PaperOrder[] {
  return acct.orders.filter((o) => o.date === date && o.status !== 'canceled');
}

export const openOrders = (acct: PaperAccount) => acct.orders.filter((o) => o.status === 'open' || o.status === 'pending');
