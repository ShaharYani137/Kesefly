/**
 * Position math for one symbol from its purchases, sales and dividends, in the stock's own
 * currency. Pure: shared by the app (state/portfolio.ts) and the home-screen widget.
 *
 * Method: average cost. Purchases add shares and cost (buy fees are part of the cost, as
 * Israeli tax rules count them). A sale removes shares at the current average cost; the
 * difference to the sale proceeds (minus the sale fee) is realized profit. Events run in date
 * order; records without a date count as the oldest, in the order they were entered.
 */

export type LotIn = { shares: number; buyPrice: number; date?: string; fee?: number };
export type SaleIn = { shares: number; price: number; date?: string; fee?: number };
export type DividendIn = { amount: number; tax?: number; date?: string };

export type Position = {
  /** Shares held now (purchases minus sales). */
  shares: number;
  /** Average cost per held share, fees included. 0 when nothing is held. */
  avgCost: number;
  /** Cost basis of the held shares. */
  cost: number;
  /** Profit or loss locked in by sales, after sale fees. */
  realized: number;
  /** Dividends received after tax withheld. */
  dividends: number;
  /** All buy and sell fees paid. */
  fees: number;
  /** Total shares sold. */
  sold: number;
};

type Event = { kind: 'buy'; at: string; i: number; lot: LotIn } | { kind: 'sell'; at: string; i: number; sale: SaleIn };

export function position(lots: LotIn[], sales: SaleIn[] = [], dividends: DividendIn[] = []): Position {
  const events: Event[] = [
    ...lots.map((lot, i) => ({ kind: 'buy' as const, at: lot.date ?? '', i, lot })),
    ...sales.map((sale, i) => ({ kind: 'sell' as const, at: sale.date ?? '', i: 1e6 + i, sale })),
  ];
  // Same day: buys before sells, so a same-day round trip has shares to sell.
  events.sort((a, b) => (a.at === b.at ? a.i - b.i : a.at < b.at ? -1 : 1));

  let shares = 0;
  let cost = 0;
  let realized = 0;
  let fees = 0;
  let sold = 0;
  for (const e of events) {
    if (e.kind === 'buy') {
      const fee = e.lot.fee ?? 0;
      shares += e.lot.shares;
      cost += e.lot.shares * e.lot.buyPrice + fee;
      fees += fee;
    } else {
      const fee = e.sale.fee ?? 0;
      // Selling more than held (data entry error): only the held shares carry a cost.
      const n = Math.min(e.sale.shares, shares);
      const avg = shares ? cost / shares : 0;
      realized += e.sale.shares * e.sale.price - fee - avg * n;
      cost -= avg * n;
      shares -= n;
      fees += fee;
      sold += e.sale.shares;
    }
  }
  const div = dividends.reduce((a, d) => a + d.amount - (d.tax ?? 0), 0);
  // Float dust after selling everything.
  if (shares < 1e-9) {
    shares = 0;
    cost = 0;
  }
  return { shares, avgCost: shares ? cost / shares : 0, cost, realized, dividends: div, fees, sold };
}

/** Records of one symbol, grouped. */
export function bySymbol<T extends { symbol: string }>(items: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of items) {
    const k = x.symbol.toUpperCase();
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}

/**
 * Net open positions as one line per symbol (shares held, average cost), for code that only
 * understands simple holdings (the chat assistant). Fully sold symbols are left out.
 */
export function netHoldings(
  lots: (LotIn & { symbol: string })[],
  sales: (SaleIn & { symbol: string })[],
): { symbol: string; shares: number; buyPrice: number }[] {
  const l = bySymbol(lots);
  const s = bySymbol(sales);
  const out: { symbol: string; shares: number; buyPrice: number }[] = [];
  for (const [symbol, mine] of l) {
    const p = position(mine, s.get(symbol) ?? []);
    if (p.shares > 0) out.push({ symbol, shares: p.shares, buyPrice: p.avgCost });
  }
  return out;
}
