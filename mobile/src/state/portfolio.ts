/**
 * Live portfolio numbers, in the user's currency (USD or ILS), using the live USD/ILS rate.
 * Shared by the Stocks tab, the stock page and Home.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { convert, getHistory, getQuotes, getUsdIls, type HistoryPoint, type Quote, type RangeKey } from '@/engine/stocks';

import { type Holding, useApp } from './app-store';

export type PositionRow = {
  symbol: string;
  shares: number;
  /** Average buy price per share, in the stock's currency. */
  avgCost: number;
  quote?: Quote;
  /** In the user's currency. */
  value: number;
  cost: number;
  day: number;
  weight: number;
  ids: string[];
};

export function usePortfolio(extraSymbols: string[] = []) {
  const { holdings, profile } = useApp();
  const cur = profile.currency;
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);

  const extraKey = extraSymbols.join(',');
  const symbols = useMemo(
    () => [...new Set([...holdings.map((h) => h.symbol), ...extraKey.split(',').filter(Boolean)])],
    [holdings, extraKey],
  );

  const fetchAll = useCallback((force: boolean) => Promise.all([getQuotes(symbols, force), getUsdIls()]), [symbols]);
  const apply = useCallback(
    ([q, r]: [Record<string, Quote>, number | null]) => {
      setQuotes(q);
      setRate(r);
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

  const rows = useMemo(() => {
    const list = groupRows(holdings, quotes, cur, rate);
    const sum = list.reduce((a, r) => a + r.value, 0);
    return list.map((r) => ({ ...r, weight: sum ? r.value / sum : 0 }));
  }, [holdings, quotes, cur, rate]);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const cost = rows.reduce((a, r) => a + r.cost, 0);
  const day = rows.reduce((a, r) => a + r.day, 0);

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
      if (out.length < 2) throw new Error('no data');
      return out;
    },
    [rows, cur, rate],
  );

  return { rows, total, cost, day, cur, rate, quotes, loading, updated, failed, refresh, history };
}

function groupRows(holdings: Holding[], quotes: Record<string, Quote>, cur: string, rate: number | null): PositionRow[] {
  const map = new Map<string, PositionRow>();
  for (const h of holdings) {
    const q = quotes[h.symbol];
    const qc = q?.currency ?? (h.symbol.endsWith('.TA') ? 'ILS' : 'USD');
    const prev = map.get(h.symbol);
    const shares = (prev?.shares ?? 0) + h.shares;
    const costNative = (prev ? prev.avgCost * prev.shares : 0) + h.buyPrice * h.shares;
    map.set(h.symbol, {
      symbol: h.symbol,
      shares,
      avgCost: costNative / shares,
      quote: q,
      value: q ? convert(q.price * shares, qc, cur, rate) : 0,
      cost: convert(costNative, qc, cur, rate),
      day: q ? convert(q.change * shares, qc, cur, rate) : 0,
      weight: 0,
      ids: [...(prev?.ids ?? []), h.id],
    });
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}
