/**
 * Data for the Android home-screen widget. Runs in the widget's headless JS task (no UI
 * mounted), so it reads the saved app state from AsyncStorage directly and fetches live
 * quotes and the USD/ILS rate itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

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

type Saved = { lang?: Lang; holdings?: { symbol: string; shares: number; buyPrice: number }[]; profile?: { currency?: 'USD' | 'ILS' } };

const two = (n: number) => String(n).padStart(2, '0');

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

  let value: string | null = null;
  let day = '';
  let gain = '';
  let dayUp = true;
  let gainUp = true;
  let movers: MoverLine[] = [];
  const symbols = [...new Set(holdings.map((h) => h.symbol.toUpperCase()))];
  const [quotes, rate] = await Promise.all([
    symbols.length ? getQuotes(symbols, true) : Promise.resolve<Record<string, Quote>>({}),
    getUsdIls(),
  ]);
  if (holdings.length) {
    let total = 0;
    let cost = 0;
    let dayChange = 0;
    for (const h of holdings) {
      const q = quotes[h.symbol.toUpperCase()];
      if (!q) continue;
      total += convert(q.price * h.shares, q.currency, cur, rate);
      cost += convert(h.buyPrice * h.shares, q.currency, cur, rate);
      dayChange += convert(q.change * h.shares, q.currency, cur, rate);
    }
    if (total > 0) {
      value = formatPrice(total, cur, lang);
      day = `${s.stock.dayChange} ${formatSigned(dayChange, cur, lang)}`;
      dayUp = dayChange >= 0;
      gain = `${s.stock.totalGain} ${formatSigned(cost ? total / cost - 1 : 0, cur, lang, true)}`;
      gainUp = total >= cost;
    }
    const top = symbols
      .map((sym) => quotes[sym])
      .filter((q) => !!q)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 6);
    // Charts only when the list is short enough to show them (1-2 holdings).
    const charts =
      top.length <= SPARK_COUNT
        ? await Promise.all(top.map((q) => getHistory(q.symbol, '1D').then((pts) => sparkline(pts, q.prevClose)).catch(() => null)))
        : [];
    movers = top.map((q, i) => ({
      symbol: q.symbol.toUpperCase(),
      price: formatPrice(q.price, q.currency, lang),
      pct: formatSigned(q.changePct, q.currency, lang, true),
      up: q.changePct >= 0,
      ...(charts[i] ?? {}),
    }));
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

  const d = new Date();
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
