/**
 * iOS home-screen and lock-screen widget (WidgetKit, Swift in `targets/widget/`).
 *
 * The widget runs outside the app, so the app writes everything it needs into the shared App
 * Group (`group.com.kesefly.app`, UserDefaults key `kesefly.widget`) as one JSON string:
 * - positions (shares, cost basis, realized + dividends, money put in, last price), so the
 *   widget can fetch fresh prices from Yahoo itself and recompute value, today's change and
 *   total gain without the app running;
 * - a snapshot of the same numbers already formatted (from the Android widget's widgetData()),
 *   shown when the widget cannot reach the network;
 * - Wall Street / Tel Aviv phase changes for the next 3 days (engine/clock.ts knows holidays
 *   and early closes; Swift only looks up the current segment);
 * - every label in the app language.
 * Android: ExtensionStorage is a no-op there (the native module is iOS only).
 * Builds without the widget (KESEFLY_IOS_WIDGET=0, see app.config.js) skip all of this.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtensionStorage } from '@bacons/apple-targets';
import Constants from 'expo-constants';

import { marketStatus, type Zone } from '@/engine/clock';
import { bySymbol, type DividendIn, type LotIn, position, type SaleIn } from '@/engine/positions';
import { getQuotes, getUsdIls } from '@/engine/stocks';
import type { Lang } from '@/engine/types';
import { STRINGS } from '@/i18n/strings';
import { STORAGE_KEY } from '@/state/app-store';

import { widgetData } from './data';

export const APP_GROUP = 'group.com.kesefly.app';
const KEY = 'kesefly.widget';
const STEP_MS = 5 * 60_000;
const AHEAD_MS = 3 * 86400_000;

export type IosPosition = {
  symbol: string;
  /** Currency of the price: USD or ILS (Tel Aviv, agorot already converted). */
  currency: string;
  shares: number;
  /** Cost basis of held shares, fees included (stock currency). */
  cost: number;
  /** Realized profit + dividends after tax (stock currency). */
  extra: number;
  /** Money put in: every purchase plus its fee (stock currency). */
  invested: number;
  /** Last price and change the app saw, used when the widget cannot fetch. */
  price: number;
  change: number;
  /** Mutual funds (number.TA) have no Yahoo price: the widget keeps the app's price. */
  fund: boolean;
};

export type IosSegment = { t: number; phase: string; open: boolean };

type Saved = {
  lang?: Lang;
  holdings?: (LotIn & { symbol: string })[];
  sales?: (SaleIn & { symbol: string })[];
  dividends?: (DividendIn & { symbol: string })[];
  profile?: { currency?: 'USD' | 'ILS' };
};

/** Phase changes from now for the next 3 days, sampled every 5 minutes. */
function segments(zone: Zone, lang: Lang, now: number): IosSegment[] {
  const s = STRINGS[lang];
  const out: IosSegment[] = [];
  for (let t = now; t <= now + AHEAD_MS; t += STEP_MS) {
    const phase = marketStatus(zone, t).phase;
    const label = s.clock.phase[phase];
    if (!out.length || out[out.length - 1].phase !== label) out.push({ t: out.length ? t : now, phase: label, open: phase === 'open' });
  }
  return out;
}

/** False in the iPhone build without the widget (free Apple ID). */
export const hasIosWidget = Constants.expoConfig?.extra?.iosWidget !== false;

export async function syncIosWidget(): Promise<void> {
  if (!hasIosWidget) return;
  let saved: Saved = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw) as Saved;
  } catch {
    // Empty widget below.
  }
  const lang: Lang = saved.lang === 'he' ? 'he' : 'en';
  const s = STRINGS[lang];
  const now = Date.now();

  // Snapshot first: it fetches quotes and refreshes the shared quote cache.
  const snap = await widgetData();
  const lots = bySymbol(saved.holdings ?? []);
  const sold = bySymbol(saved.sales ?? []);
  const divs = bySymbol(saved.dividends ?? []);
  const symbols = [...new Set([...lots.keys(), ...sold.keys(), ...divs.keys()])];
  const [quotes, rate] = await Promise.all([getQuotes(symbols).catch(() => ({}) as Awaited<ReturnType<typeof getQuotes>>), getUsdIls()]);

  const positions: IosPosition[] = symbols.map((symbol) => {
    const mine = lots.get(symbol) ?? [];
    const p = position(mine, sold.get(symbol) ?? [], divs.get(symbol) ?? []);
    const q = quotes[symbol];
    return {
      symbol,
      currency: q?.currency ?? (symbol.endsWith('.TA') ? 'ILS' : 'USD'),
      shares: p.shares,
      cost: p.cost,
      extra: p.realized + p.dividends,
      invested: mine.reduce((a, l) => a + l.shares * l.buyPrice + (l.fee ?? 0), 0),
      price: q?.price ?? 0,
      change: q?.change ?? 0,
      fund: /^\d{5,9}\.TA$/i.test(symbol),
    };
  });

  const payload = {
    v: 1,
    lang,
    currency: saved.profile?.currency ?? 'USD',
    at: now,
    /** Shekels per dollar the app saw (fallback when the widget cannot fetch ILS=X). */
    rate,
    positions,
    labels: {
      title: s.widget.title,
      empty: s.widget.empty,
      updated: s.widget.updated,
      day: s.stock.dayChange,
      gain: s.stock.totalGain,
      closesIn: s.clock.closesIn,
      opensIn: s.clock.opensIn,
      units: lang === 'he' ? { d: 'י׳', h: 'ש׳', m: 'ד׳' } : { d: 'd', h: 'h', m: 'm' },
    },
    markets: [
      { label: s.clock.wallStreet, flag: '🇺🇸', tz: 'America/New_York', segments: segments('NY', lang, now) },
      { label: s.clock.telAviv, flag: '🇮🇱', tz: 'Asia/Jerusalem', segments: segments('TLV', lang, now) },
    ],
    /** Open Day-trading lab practice trade (one line), or null. */
    lab: snap.lab,
    snapshot: { value: snap.value, day: snap.day, dayUp: snap.dayUp, gain: snap.gain, gainUp: snap.gainUp, movers: snap.movers.map(({ symbol, price, pct, up }) => ({ symbol, price, pct, up })), rate: snap.rate, updated: snap.updated },
  };

  const storage = new ExtensionStorage(APP_GROUP);
  storage.set(KEY, JSON.stringify(payload));
  ExtensionStorage.reloadWidget();
}
