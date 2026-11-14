/**
 * Data for the Android home-screen widget. Runs in the widget's headless JS task (no UI
 * mounted), so it reads the saved app state from AsyncStorage directly and fetches live
 * quotes and the USD/ILS rate itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { bySymbol, type DividendIn, type LotIn, position, type SaleIn } from '@/engine/positions';
import { marketStatus, formatDuration } from '@/engine/clock';
import { convert, formatPrice, formatSigned, getHistory, getQuotes, getUsdIls, type HistoryPoint, type Quote } from '@/engine/stocks';
import type { Lang } from '@/engine/types';
import { STRINGS } from '@/i18n/strings';
import { STORAGE_KEY } from '@/state/app-store';

export type ClockLine = { label: string; flag: 'US' | 'IL'; time: string; status: string; open: boolean };

/** One holding line for the widget's movers list: biggest moves today first. */
export type MoverLine = {
  symbol: string;
  price: string;
  pct: string;
  up: boolean;
  /** Last session's prices scaled to 0..1 (oldest first, at most 48 points). Only for the first 2 movers. */
  spark?: number[];
  /** Previous close on the same 0..1 scale, for the chart's baseline. */
  base?: number;
};

/** Number of movers that get a sparkline (the widget shows charts only when it lists 1-2 holdings). */
const SPARK_COUNT = 2;

/** Downsamples a price series and scales it (with the previous close) to 0..1. */
function sparkline(points: HistoryPoint[], prevClose: number): { spark: number[]; base: number } | null {
  if (points.length < 2) return null;
  const step = Math.max(1, Math.ceil(points.length / 48));
  const closes = points.filter((_, i) => i % step === 0 || i === points.length - 1).map((p) => p.close);
  const all = prevClose > 0 ? [...closes, prevClose] : closes;
  const lo = Math.min(...all);
  const span = Math.max(...all) - lo || 1;
  return { spark: closes.map((c) => (c - lo) / span), base: prevClose > 0 ? (prevClose - lo) / span : 0.5 };
}

export type WidgetData = {
  lang: Lang;
  title: string;
  /** Portfolio value text, or null when the user has no holdings. */
  value: string | null;
  day: string;
  dayUp: boolean;
  gain: string;
  gainUp: boolean;
  empty: string;
  clocks: ClockLine[];
  /** Holdings sorted by size of today's move (largest first), at most 6. */
  movers: MoverLine[];
  /** USD/ILS rate text, e.g. "USD/ILS 3.712", or null when the rate is unavailable. */
  rate: string | null;
  updated: string;
};

type Saved = {
  lang?: Lang;
  holdings?: (LotIn & { symbol: string })[];
  sales?: (SaleIn & { symbol: string })[];
  dividends?: (DividendIn & { symbol: string })[];
  profile?: { currency?: 'USD' | 'ILS' };
};

const two = (n: number) => String(n).padStart(2, '0');

/**
 * Last good widget numbers. Android runs the widget task with the phone locked or the app
 * closed, often with no network (Doze), so fetches fail; the widget then shows these instead
 * of falling back to the empty message.
 */
const CACHE_KEY = 'investapp/widget-cache/v1';
type Spark = { spark: number[]; base: number };
type Cache = { at: number; quotes: Record<string, Quote>; rate: number | null; charts: Record<string, Spark> };

/** Network calls in the widget task give up after this, so the task always renders. */
const FETCH_TIMEOUT_MS = 10_000;
function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), FETCH_TIMEOUT_MS))]);
}

async function readCache(): Promise<Cache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
}

export async function widgetData(): Promise<WidgetData> {
  let saved: Saved = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw) as Saved;
  } catch {
    // Empty state below.
  }
  const lang: Lang = saved.lang === 'he' ? 'he' : 'en';
  const s = STRINGS[lang];
  const cur = saved.profile?.currency ?? 'USD';
  const holdings = saved.holdings ?? [];
  const lotsBy = bySymbol(holdings);
  const salesBy = bySymbol(saved.sales ?? []);
  const divsBy = bySymbol(saved.dividends ?? []);

  let value: string | null = null;
  let day = '';
  let gain = '';
  let dayUp = true;
  let gainUp = true;
  let movers: MoverLine[] = [];
  const symbols = [...new Set([...holdings, ...(saved.sales ?? [])].map((h) => h.symbol.toUpperCase()))];
  const [fresh, freshRate, cache] = await Promise.all([
    symbols.length ? withTimeout(getQuotes(symbols, true), {} as Record<string, Quote>) : Promise.resolve<Record<string, Quote>>({}),
    withTimeout(getUsdIls(), null),
    readCache(),
  ]);
  // Missing quotes (offline, locked phone, timeout) come from the last good fetch.
  const quotes: Record<string, Quote> = { ...cache?.quotes, ...fresh };
  const rate = freshRate ?? cache?.rate ?? null;
  const stale = symbols.some((sym) => !fresh[sym]) || (freshRate == null && rate != null);
  const charts: Record<string, Spark> = { ...cache?.charts };
  if (holdings.length) {
    // Same math as the app (engine/positions.ts): sales, dividends and fees count in the gain.
    let total = 0;
    let gainSum = 0;
    let invested = 0;
    let dayChange = 0;
    const held = new Set<string>();
    for (const sym of new Set([...lotsBy.keys(), ...salesBy.keys(), ...divsBy.keys()])) {
      const q = quotes[sym];
      if (!q) continue;
      const lots = lotsBy.get(sym) ?? [];
      const p = position(lots, salesBy.get(sym) ?? [], divsBy.get(sym) ?? []);
      const conv = (v: number) => convert(v, q.currency, cur, rate);
      if (p.shares > 0) held.add(sym);
      total += conv(q.price * p.shares);
      dayChange += conv(q.change * p.shares);
      gainSum += conv(q.price * p.shares - p.cost + p.realized + p.dividends);
      invested += conv(lots.reduce((a, l) => a + l.shares * l.buyPrice + (l.fee ?? 0), 0));
    }
    if (total > 0) {
      value = formatPrice(total, cur, lang);
      day = `${s.stock.dayChange} ${formatSigned(dayChange, cur, lang)}`;
      dayUp = dayChange >= 0;
      gain = `${s.stock.totalGain} ${formatSigned(invested ? gainSum / invested : 0, cur, lang, true)}`;
      gainUp = gainSum >= 0;
    }
    const top = symbols
      .filter((sym) => held.has(sym))
      .map((sym) => quotes[sym])
      .filter((q) => !!q)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 6);
    // Charts only when the list is short enough to show them (1-2 holdings). A failed fetch keeps the cached chart.
    if (top.length <= SPARK_COUNT) {
      const got = await withTimeout(
        Promise.all(top.map((q) => getHistory(q.symbol, '1D').then((pts) => sparkline(pts, q.prevClose)).catch(() => null))),
        [] as (Spark | null)[],
      );
      top.forEach((q, i) => {
        const c = got[i];
        if (c) charts[q.symbol.toUpperCase()] = c;
      });
    }
    movers = top.map((q) => ({
      symbol: q.symbol.toUpperCase(),
      price: formatPrice(q.price, q.currency, lang),
      pct: formatSigned(q.changePct, q.currency, lang, true),
      up: q.changePct >= 0,
      ...(charts[q.symbol.toUpperCase()] ?? {}),
    }));
  }

  // Save what this run has, for the next run that cannot reach the network.
  // Stale run: keep the older fetch time, so "Updated" never claims numbers are newer than they are.
  const at = stale && cache ? cache.at : Date.now();
  const keep = Object.fromEntries(symbols.filter((sym) => quotes[sym]).map((sym) => [sym, quotes[sym]]));
  const keepCharts = Object.fromEntries(symbols.filter((sym) => charts[sym]).map((sym) => [sym, charts[sym]]));
  if (Object.keys(keep).length || rate != null) {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at, quotes: keep, rate, charts: keepCharts } satisfies Cache)).catch(() => {});
  }

  const now = Date.now();
  const clocks: ClockLine[] = (
    [
      ['NY', s.clock.wallStreet, 'US'],
      ['TLV', s.clock.telAviv, 'IL'],
    ] as const
  ).map(([zone, label, flag]) => {
    const st = marketStatus(zone, now);
    const open = st.phase === 'open';
    return {
      label,
      flag,
      open,
      time: `${two(st.time.hour)}:${two(st.time.minute)}`,
      status: `${s.clock.phase[st.phase]} · ${(open ? s.clock.closesIn : s.clock.opensIn).replace('{t}', formatDuration(st.minutesToChange, lang))}`,
    };
  });

  // "Updated" shows when the numbers were fetched, not when the widget was redrawn.
  const d = new Date(at);
  return {
    lang,
    title: s.widget.title,
    value,
    day,
    dayUp,
    gain,
    gainUp,
    empty: s.widget.empty,
    clocks,
    movers,
    rate: rate ? `USD/ILS ${rate.toFixed(3)}` : null,
    updated: s.widget.updated.replace('{time}', `${two(d.getHours())}:${two(d.getMinutes())}`),
  };
}
