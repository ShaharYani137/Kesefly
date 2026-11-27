/**
 * Live portfolio numbers, in the user's currency (USD or ILS), using the live USD/ILS rate.
 * Shared by the Stocks tab, the stock page and Home.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getUsdIlsInfo, lastUsdIls, type UsdIls } from '@/engine/fx';
import { bySymbol, position } from '@/engine/positions';
import { convert, getHistory, getQuotes, type HistoryPoint, type Quote, type RangeKey } from '@/engine/stocks';

import { type Dividend, type Holding, type Sale, useApp } from './app-store';

export type PositionRow = {
  symbol: string;
  shares: number;
  /** Average buy price per share, in the stock's currency. */
  avgCost: number;
  quote?: Quote;
  /** In the user's currency. */
  value: number;
  /** Cost basis of the shares held now, fees included. */
  cost: number;
  day: number;
  /** Profit locked in by sales, dividends after tax, and all fees paid (user's currency). */
  realized: number;
  dividends: number;
  fees: number;
  /** Unrealized + realized + dividends (user's currency). */
  gain: number;
  weight: number;
  ids: string[];
};

/** Currency of a symbol before its quote arrives: Tel Aviv (incl. funds) is ILS, the rest USD. */
export const guessCurrency = (symbol: string) => (symbol.endsWith('.TA') ? 'ILS' : 'USD');

/** Gain as a fraction of the money put in; NaN (shown as "—") when amounts could not be converted. */
export const gainPct = (gain: number, invested: number) => (!Number.isFinite(invested) ? NaN : invested ? gain / invested : 0);

export function usePortfolio(extraSymbols: string[] = []) {
  const { holdings, sales, dividends, profile } = useApp();
  const cur = profile.currency;
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  // Start from the last good rate already in memory, so a remount never renders without one.
  // (Treated as live until the mount fetch below answers, a moment later.)
  const [fx, setFx] = useState<UsdIls>(() => {
    const last = lastUsdIls();
    return last ? { ...last, fresh: true } : { rate: null, at: null, fresh: false };
  });
  const rate = fx.rate;
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);

  const extraKey = extraSymbols.join(',');
  const symbols = useMemo(
    () => [...new Set([...holdings.map((h) => h.symbol), ...sales.map((x) => x.symbol), ...extraKey.split(',').filter(Boolean)])],
    [holdings, sales, extraKey],
  );

  const fetchAll = useCallback((force: boolean) => Promise.all([getQuotes(symbols, force), getUsdIlsInfo()]), [symbols]);
  const apply = useCallback(
    ([q, r]: [Record<string, Quote>, UsdIls]) => {
      setQuotes(q);
      // A missing rate never replaces a good one.
      setFx((prev) => (r.rate != null ? r : prev));
      setFailed(symbols.length > 0 && Object.keys(q).length === 0);
      setUpdated(new Date());
      setLoading(false);
    },
    [symbols],
  );

  useEffect(() => {
    let alive = true;
    fetchAll(false).then((d) => alive && apply(d));
    return () => {
      alive = false;
    };
  }, [fetchAll, apply]);

  const refresh = () => {
    setLoading(true);
    fetchAll(true).then(apply);
  };

  const all = useMemo(() => groupRows(holdings, sales, dividends, quotes, cur, rate), [holdings, sales, dividends, quotes, cur, rate]);
  // Open positions only; fully sold symbols still count in realized / dividends / fees.
  const rows = useMemo(() => {
    const open = all.filter((r) => r.shares > 0);
    const sum = open.reduce((a, r) => a + r.value, 0);
    return open.map((r) => ({ ...r, weight: sum ? r.value / sum : 0 }));
  }, [all]);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const cost = rows.reduce((a, r) => a + r.cost, 0);
  const day = rows.reduce((a, r) => a + r.day, 0);
  const realized = all.reduce((a, r) => a + r.realized, 0);
  const income = all.reduce((a, r) => a + r.dividends, 0);
  const fees = all.reduce((a, r) => a + r.fees, 0);
  /** Total gain: unrealized on held shares + realized from sales + dividends. Fees are already inside cost and realized. */
  const gain = total - cost + realized + income;
  /** Base for the gain %: cost of held shares plus cost of shares already sold. */
  const invested = all.reduce((a, r) => a + r.invested, 0);

  /** Daily portfolio value over a range, in the user's currency (holdings forward-filled by date). */
  const history = useCallback(
    async (range: RangeKey): Promise<HistoryPoint[]> => {
      const series = await Promise.all(
        rows.map(async (r) => ({ r, pts: await getHistory(r.symbol, range).catch(() => [] as HistoryPoint[]) })),
      );
      const day = (t: number) => (range === '1D' || range === '1W' ? Math.floor(t / 1800_000) : Math.floor(t / 86400_000));
      const keys = [...new Set(series.flatMap((s) => s.pts.map((p) => day(p.t))))].sort((a, b) => a - b);
      const last = new Map<string, number>();
      const idx = new Map<string, number>();
      const out: HistoryPoint[] = [];
      for (const k of keys) {
        let sum = 0;
        let any = false;
        for (const { r, pts } of series) {
          let i = idx.get(r.symbol) ?? 0;
          while (i < pts.length && day(pts[i].t) <= k) {
            last.set(r.symbol, pts[i].close);
            i++;
          }
          idx.set(r.symbol, i);
          const c = last.get(r.symbol);
          if (c !== undefined) {
            sum += convert(c * r.shares, r.quote?.currency ?? 'USD', cur, rate);
            any = true;
          }
        }
        if (any) out.push({ t: (range === '1D' || range === '1W' ? k * 1800_000 : k * 86400_000), close: sum });
      }
      // NaN = a USD/ILS conversion without any rate: no chart rather than a wrong one.
      if (out.length < 2 || out.some((p) => !Number.isFinite(p.close))) throw new Error('no data');
      return out;
    },
    [rows, cur, rate],
  );

  /** Fetch time of the rate when it is an old one (the live fetch failed); null when live or none. */
  const rateAsOf = fx.rate != null && !fx.fresh && fx.at != null ? new Date(fx.at) : null;

  return { rows, all, total, cost, day, realized, income, fees, gain, invested, cur, rate, rateAsOf, quotes, loading, updated, failed, refresh, history };
}

function groupRows(
  holdings: Holding[],
  sales: Sale[],
  dividends: Dividend[],
  quotes: Record<string, Quote>,
  cur: string,
  rate: number | null,
): (PositionRow & { invested: number })[] {
  const lots = bySymbol(holdings);
  const sold = bySymbol(sales);
  const divs = bySymbol(dividends);
  const symbols = new Set([...lots.keys(), ...sold.keys(), ...divs.keys()]);
  const out: (PositionRow & { invested: number })[] = [];
  for (const symbol of symbols) {
    const q = quotes[symbol];
    const qc = q?.currency ?? guessCurrency(symbol);
    const myLots = lots.get(symbol) ?? [];
    const p = position(myLots, sold.get(symbol) ?? [], divs.get(symbol) ?? []);
    const conv = (v: number) => convert(v, qc, cur, rate);
    const value = q ? conv(q.price * p.shares) : 0;
    const cost = conv(p.cost);
    const realized = conv(p.realized);
    const dividends = conv(p.dividends);
    // Money put in: every purchase plus its fee.
    const invested = conv(myLots.reduce((a, l) => a + l.shares * l.buyPrice + (l.fee ?? 0), 0));
    out.push({
      symbol,
      shares: p.shares,
      avgCost: p.avgCost,
      quote: q,
      value,
      cost,
      day: q ? conv(q.change * p.shares) : 0,
      realized,
      dividends,
      fees: conv(p.fees),
      gain: (q ? value - cost : 0) + realized + dividends,
      invested,
      weight: 0,
      ids: myLots.map((l) => l.id),
    });
  }
  return out.sort((a, b) => b.value - a.value);
}
