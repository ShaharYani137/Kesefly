/**
 * Data for the Android home-screen widget. Runs in the widget's headless JS task (no UI
 * mounted), so it reads the saved app state from AsyncStorage directly and fetches live
 * quotes and the USD/ILS rate itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { marketStatus, formatDuration } from '@/engine/clock';
import { convert, formatPrice, formatSigned, getQuotes, getUsdIls } from '@/engine/stocks';
import type { Lang } from '@/engine/types';
import { STRINGS } from '@/i18n/strings';
import { STORAGE_KEY } from '@/state/app-store';

export type ClockLine = { label: string; flag: 'US' | 'IL'; time: string; status: string; open: boolean };

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
  if (holdings.length) {
    const [quotes, rate] = await Promise.all([getQuotes([...new Set(holdings.map((h) => h.symbol))], true), getUsdIls()]);
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
    updated: s.widget.updated.replace('{time}', `${two(d.getHours())}:${two(d.getMinutes())}`),
  };
}
