/**
 * Capital-gains and dividend tax estimates for the Tax view. Pure: no I/O.
 *
 * Simplified on purpose. This is education, not tax filing:
 * - Israel resident: 25% on capital gains (individual, not a "significant shareholder"); losses
 *   in the same tax year offset gains. Gains are nominal in the stock's currency converted at
 *   today's rate. Israeli rules use the real (inflation-adjusted) gain for shekel assets and
 *   the shekel gain for foreign ones, so the real figure can differ. Cost is average cost, as
 *   in the rest of the app (positions.ts).
 * - US resident: lots held over one year are long-term, the rest short-term (taxed as ordinary
 *   income). Lots are matched FIFO, the IRS default. Short and long results net against each
 *   other. The user picks both rates (no bracket math). Net losses can offset up to $3,000 of
 *   other income a year; not modelled.
 * - Dividends: Israel taxes 25%, with credit for foreign tax withheld up to that rate. US
 *   shares withhold 25% from Israeli residents who filed a W-8BEN (treaty rate), 30% without
 *   one. For US residents, qualified dividends use the long-term rate.
 *
 * All amounts out are in the user's currency, via the `conv` callback.
 */
import type { Country } from './types';
import type { DividendIn, LotIn, SaleIn } from './positions';
import { bySymbol } from './positions';

export const IL_GAINS_RATE = 0.25;
export const IL_DIVIDEND_RATE = 0.25;
/** US withholding on dividends for Israeli residents with a W-8BEN (US-Israel treaty). */
export const US_TREATY_WITHHOLDING = 0.25;
/** US withholding with no W-8BEN on file. */
export const US_DEFAULT_WITHHOLDING = 0.3;
const YEAR_MS = 365 * 86400_000;

export type TaxRules = { country: Country; usShort: number; usLong: number };

type Sym = { symbol: string };
export type TaxInput = {
  lots: (LotIn & Sym)[];
  sales: (SaleIn & Sym)[];
  dividends: (DividendIn & Sym)[];
  /** Current price per symbol, in the stock's currency. Symbols with no price are skipped. */
  prices: Record<string, number | undefined>;
  /** Stock currency → user currency. */
  conv: (v: number, symbol: string) => number;
  rules: TaxRules;
  /** Tax year (calendar year in both countries). */
  year: number;
  now?: number;
};

export type GainSplit = { short: number; long: number };

export type SymbolTax = {
  symbol: string;
  shares: number;
  /** Unrealized gain on held shares (user currency). */
  gain: number;
  split: GainSplit;
  /** Tax if only this position were sold today, on top of this year's realized result. */
  taxIfSold: number;
  /** US only: first lot still short-term and in profit, and what waiting saves. */
  longSoon?: { date: string; days: number; shares: number; saves: number };
};

export type TaxReport = {
  rules: TaxRules;
  year: number;
  /** Sales dated in `year`. */
  realized: { gains: number; losses: number; net: number; split: GainSplit; tax: number; count: number };
  /** Sales with no date: cannot be placed in a tax year. */
  undatedSales: number;
  open: SymbolTax[];
  /** Tax if everything were sold today, on top of this year's realized result. */
  taxIfSoldAll: number;
  /** Positions at a loss whose sale would lower this year's tax (only when tax is due). */
  offsets: { symbol: string; loss: number; saves: number }[];
  dividends: {
    gross: number;
    withheld: number;
    /** Extra tax still due after the credit for tax withheld (estimate). */
    due: number;
    /** Symbols where US withholding looks like 30%: a W-8BEN would cut it to 25%. */
    w8ben: string[];
  };
};

/** Tax on a year's net result, with US short/long netting. */
export function taxOn(split: GainSplit, rules: TaxRules): number {
  if (rules.country === 'IL') return Math.max(0, split.short + split.long) * IL_GAINS_RATE;
  let { short, long } = split;
  if (short < 0) {
    long += short;
    short = 0;
  }
  if (long < 0) {
    short += long;
    long = 0;
  }
  return Math.max(0, short) * rules.usShort + Math.max(0, long) * rules.usLong;
}

const add = (a: GainSplit, b: GainSplit): GainSplit => ({ short: a.short + b.short, long: a.long + b.long });
const ZERO: GainSplit = { short: 0, long: 0 };

type OpenLot = { shares: number; cost: number; date?: string };
type RealizedSale = { date?: string; split: GainSplit };

/**
 * Replays one symbol's buys and sells in date order (same order as positions.ts).
 * Israel: average cost, every gain counts as "long" (no split). US: FIFO with holding periods.
 */
function replay(lots: LotIn[], sales: SaleIn[], country: Country): { open: OpenLot[]; realized: RealizedSale[] } {
  type E = { buy?: LotIn; sell?: SaleIn; at: string; i: number };
  const events: E[] = [
    ...lots.map((buy, i) => ({ buy, at: buy.date ?? '', i })),
    ...sales.map((sell, i) => ({ sell, at: sell.date ?? '', i: 1e6 + i })),
  ];
  events.sort((a, b) => (a.at === b.at ? a.i - b.i : a.at < b.at ? -1 : 1));
  const open: OpenLot[] = [];
  const realized: RealizedSale[] = [];
  for (const e of events) {
    if (e.buy) {
      open.push({ shares: e.buy.shares, cost: e.buy.shares * e.buy.buyPrice + (e.buy.fee ?? 0), date: e.buy.date });
      continue;
    }
    const s = e.sell!;
    const held = open.reduce((a, l) => a + l.shares, 0);
    const n = Math.min(s.shares, held);
    const proceeds = s.shares * s.price - (s.fee ?? 0);
    if (country === 'IL') {
      const cost = open.reduce((a, l) => a + l.cost, 0);
      const avg = held ? cost / held : 0;
      // Scale every lot down evenly: average cost keeps one blended cost per share.
      const k = held ? 1 - n / held : 0;
      for (const l of open) {
        l.shares *= k;
        l.cost *= k;
      }
      realized.push({ date: s.date, split: { short: 0, long: proceeds - avg * n } });
    } else {
      let left = n;
      const split: GainSplit = { short: 0, long: 0 };
      // Sale proceeds per share, so each matched lot carries its share of the proceeds.
      const per = s.shares ? proceeds / s.shares : 0;
      while (left > 1e-9 && open.length) {
        const l = open[0];
        const take = Math.min(left, l.shares);
        const cost = l.shares ? (l.cost * take) / l.shares : 0;
        const long = isLong(l.date, s.date);
        split[long ? 'long' : 'short'] += per * take - cost;
        l.cost -= cost;
        l.shares -= take;
        left -= take;
        if (l.shares < 1e-9) open.shift();
      }
      // Shares sold beyond what was bought (entry error): no cost, counted short-term.
      if (s.shares > n) split.short += per * (s.shares - n);
      realized.push({ date: s.date, split });
    }
  }
  return { open: open.filter((l) => l.shares > 1e-9), realized };
}

/** Held more than one year. Undated lots are old (saved before dates existed): long-term. */
function isLong(buy?: string, sell?: string | number): boolean {
  if (!buy) return true;
  const end = typeof sell === 'number' ? sell : sell ? Date.parse(sell) : Date.now();
  return end - Date.parse(buy) > YEAR_MS;
}

export function taxReport(input: TaxInput): TaxReport {
  const { rules, year, conv } = input;
  const now = input.now ?? Date.now();
  const lots = bySymbol(input.lots);
  const sales = bySymbol(input.sales);
  const divs = bySymbol(input.dividends);
  const prefix = `${year}-`;

  let realizedSplit = ZERO;
  let gains = 0;
  let losses = 0;
  let count = 0;
  let undatedSales = 0;
  const positions: { symbol: string; open: OpenLot[] }[] = [];

  for (const symbol of new Set([...lots.keys(), ...sales.keys()])) {
    const r = replay(lots.get(symbol) ?? [], sales.get(symbol) ?? [], rules.country);
    for (const sale of r.realized) {
      if (!sale.date) {
        undatedSales++;
        continue;
      }
      if (!sale.date.startsWith(prefix)) continue;
      const split = { short: conv(sale.split.short, symbol), long: conv(sale.split.long, symbol) };
      const total = split.short + split.long;
      if (total >= 0) gains += total;
      else losses += total;
      realizedSplit = add(realizedSplit, split);
      count++;
    }
    if (r.open.length) positions.push({ symbol, open: r.open });
  }
  const baseTax = taxOn(realizedSplit, rules);

  const open: SymbolTax[] = [];
  let allSplit = realizedSplit;
  for (const { symbol, open: lotsOpen } of positions) {
    const price = input.prices[symbol];
    if (price === undefined) continue;
    let split = ZERO;
    let longSoon: SymbolTax['longSoon'];
    for (const l of lotsOpen) {
      const g = conv(l.shares * price - l.cost, symbol);
      const long = rules.country === 'IL' || isLong(l.date, now);
      split = add(split, long ? { short: 0, long: g } : { short: g, long: 0 });
      if (!long && g > 0 && l.date) {
        const at = Date.parse(l.date) + YEAR_MS + 86400_000;
        const days = Math.ceil((at - now) / 86400_000);
        const saves = g * (rules.usShort - rules.usLong);
        if (!longSoon || days < longSoon.days) longSoon = { date: new Date(at).toISOString().slice(0, 10), days, shares: l.shares, saves };
      }
    }
    allSplit = add(allSplit, split);
    open.push({
      symbol,
      shares: lotsOpen.reduce((a, l) => a + l.shares, 0),
      gain: split.short + split.long,
      split,
      taxIfSold: taxOn(add(realizedSplit, split), rules) - baseTax,
      longSoon,
    });
  }
  open.sort((a, b) => b.gain - a.gain);

  const offsets =
    baseTax > 0
      ? open
          .filter((p) => p.gain < 0)
          .map((p) => ({ symbol: p.symbol, loss: p.gain, saves: -p.taxIfSold }))
          .filter((o) => o.saves > 0.5)
          .sort((a, b) => b.saves - a.saves)
      : [];

  // Dividends this year.
  let gross = 0;
  let withheld = 0;
  let due = 0;
  const w8ben: string[] = [];
  const divRate = rules.country === 'IL' ? IL_DIVIDEND_RATE : rules.usLong;
  for (const [symbol, list] of divs) {
    const mine = list.filter((d) => d.date?.startsWith(prefix));
    if (!mine.length) continue;
    const g = mine.reduce((a, d) => a + d.amount, 0);
    const w = mine.reduce((a, d) => a + (d.tax ?? 0), 0);
    gross += conv(g, symbol);
    withheld += conv(w, symbol);
    due += Math.max(0, conv(g * divRate - w, symbol));
    const usListed = !symbol.endsWith('.TA');
    if (rules.country === 'IL' && usListed && g > 0 && w / g > (US_TREATY_WITHHOLDING + US_DEFAULT_WITHHOLDING) / 2) w8ben.push(symbol);
  }

  return {
    rules,
    year,
    realized: { gains, losses, net: realizedSplit.short + realizedSplit.long, split: realizedSplit, tax: baseTax, count },
    undatedSales,
    open,
    taxIfSoldAll: taxOn(allSplit, rules) - baseTax,
    offsets,
    dividends: { gross, withheld, due, w8ben },
  };
}
