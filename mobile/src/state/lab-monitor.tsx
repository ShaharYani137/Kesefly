/**
 * Day-Trading Lab background work while Kesefly is open, and its scheduled notifications.
 *
 * - Every 30 s while the app is in the foreground: advance open practice trades over the
 *   session's 5-minute bars and the live price (fills, stop, target, flat by), and check
 *   price alerts (stop, target, % move). Bars also catch up on whatever happened while the
 *   app was closed.
 * - Time alerts (flat by close for each open practice trade, opening bell per market) are
 *   scheduled ahead as local notifications (kind 'lab-time'), so they arrive with the app
 *   closed on Android and iPhone. Only 'lab-time' notifications are replaced here.
 */
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { getQuotes } from '@/engine/stocks';
import type { Lang } from '@/engine/types';
import { STRINGS } from '@/i18n/strings';
import { evaluatePriceAlerts, type Ring } from '@/lab/alerts';
import { getCandles } from '@/lab/candles';
import { advanceOrder, openOrders, type PaperOrder } from '@/lab/paper';
import { localDate, nextSession, type Zone, zoneOf } from '@/lab/sessions';
import { bidi } from '@/ui/bidi';

import { fill, useApp } from './app-store';
import { useLab } from './lab-store';
import { cancelScheduled, tagged } from './scheduled';

const TICK_MS = 30_000;
const CHANNEL = 'lab';

async function ensureLabChannel(lang: Lang) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: STRINGS[lang].lab.notif.channel,
    // eslint-disable-next-line import/namespace -- enum is re-exported via `export *`, which the rule cannot follow
    importance: Notifications.AndroidImportance.HIGH,
  });
}

const money = (v: number, cur: string, lang: Lang) =>
  `${cur === 'ILS' ? '₪' : '$'}${v.toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function notifyNow(title: string, body: string, url: string, kind: 'lab-price', lang: Lang) {
  const he = lang === 'he';
  await Notifications.scheduleNotificationAsync({
    content: { title: bidi(title, he), body: bidi(body, he), data: tagged(kind, { url }), sound: true },
    trigger: (Platform.OS === 'android' ? { channelId: CHANNEL } : null) as Notifications.NotificationTriggerInput,
  });
}

/** Replaces the scheduled Lab time alerts. */
export async function scheduleLabTimeAlerts(orders: PaperOrder[], opts: { timeAlerts: boolean; bell: Record<Zone, boolean> }, lang: Lang) {
  await cancelScheduled('lab-time');
  await ensureLabChannel(lang);
  const s = STRINGS[lang].lab;
  const he = lang === 'he';
  const now = Date.now();
  const at = (date: number) => ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(date), ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) }) as Notifications.NotificationTriggerInput;
  if (opts.timeAlerts) {
    for (const o of orders) {
      if (o.flatByMs <= now + 5000) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: bidi(fill(s.notif.flatTitle, { sym: o.symbol }), he), body: bidi(s.notif.flatBody, he), data: tagged('lab-time', { url: '/lab' }), sound: true },
        trigger: at(o.flatByMs),
      });
    }
  }
  for (const zone of ['NY', 'TLV'] as Zone[]) {
    if (!opts.bell[zone]) continue;
    let t = now;
    for (let i = 0; i < 5; i++) {
      const ses = nextSession(zone, t);
      if (!ses) break;
      if (ses.openMs > now + 5000) {
        await Notifications.scheduleNotificationAsync({
          content: { title: bidi(fill(s.notif.bellTitle, { market: s.markets[zone] }), he), body: bidi(s.notif.bellBody, he), data: tagged('lab-time', { url: '/lab/scanner' }), sound: true },
          trigger: at(ses.openMs),
        });
      }
      t = ses.closeMs + 60_000;
    }
  }
}

function ringText(r: Ring, lang: Lang): { title: string; body: string } {
  const s = STRINGS[lang].lab.notif;
  const cur = zoneOf(r.symbol) === 'TLV' ? 'ILS' : 'USD';
  const v = { sym: r.symbol, price: money(r.price ?? 0, cur, lang), level: money(r.level ?? 0, cur, lang), pct: `${(r.movePct ?? 0) > 0 ? '+' : ''}${(r.movePct ?? 0).toFixed(1)}%` };
  const body = r.type === 'stop' || r.type === 'below' ? s.stop : r.type === 'pct_move' ? s.move : s.target;
  return { title: STRINGS[lang].lab.title, body: fill(body, v) };
}

/** Mounted once in the root layout. */
export function LabMonitor() {
  const lab = useLab();
  const { lang } = useApp();
  const ref = useRef({ lab, lang });
  useEffect(() => {
    ref.current = { lab, lang };
  }, [lab, lang]);
  const busy = useRef(false);

  // Time alerts follow the open trades and the switches.
  const open = openOrders(lab.account);
  const openKey = open.map((o) => `${o.id}:${o.status}:${o.flatByMs}`).join(',');
  useEffect(() => {
    if (!lab.hydrated) return;
    scheduleLabTimeAlerts(openOrders(ref.current.lab.account), { timeAlerts: lab.timeAlerts, bell: lab.bell }, lang).catch(() => {});
  }, [lab.hydrated, openKey, lab.timeAlerts, lab.bell, lang]);

  useEffect(() => {
    if (!lab.hydrated) return;
    const tick = async () => {
      if (busy.current || AppState.currentState !== 'active') return;
      busy.current = true;
      try {
        const { lab: L, lang: lg } = ref.current;
        const now = Date.now();
        const today = { NY: localDate('NY', now), TLV: localDate('TLV', now) };
        const live = openOrders(L.account);
        const ruleSyms = L.priceAlerts ? L.alerts.filter((r) => r.date === null || r.date === today[r.zone]).map((r) => r.symbol) : [];
        const symbols = [...new Set([...live.map((o) => o.symbol), ...ruleSyms])];
        if (!symbols.length) return;
        const quotes = await getQuotes(symbols, true).catch(() => ({}) as Awaited<ReturnType<typeof getQuotes>>);
        const pairs: [PaperOrder, PaperOrder][] = [];
        for (const o of live) {
          const sameDay = o.date === today[zoneOf(o.symbol)];
          const chart = await getCandles(o.symbol, '5m', sameDay ? '1d' : '5d').catch(() => null);
          const after = advanceOrder(o, chart?.bars ?? [], now, quotes[o.symbol]?.price ?? null);
          if (after.status !== o.status || after.checkedTo !== o.checkedTo) pairs.push([o, after]);
        }
        L.applyOrders(pairs);
        for (const [before, after] of pairs) {
          if (before.status === 'open' && after.status === 'closed' && after.exit && after.fill) {
            const s = STRINGS[lg].lab;
            const pnl = after.qty * (after.exit.price - after.fill.price);
            await notifyNow(
              fill(s.notif.closedTitle, { sym: after.symbol }),
              fill(s.notif.closedBody, { reason: s.journal.reason[after.exit.reason], price: money(after.exit.price, after.currency, lg), pnl: `${pnl >= 0 ? '+' : '−'}${money(Math.abs(pnl), after.currency, lg)}` }),
              '/lab/journal',
              'lab-price',
              lg,
            ).catch(() => {});
          }
        }
        if (L.priceAlerts && L.alerts.length) {
          const q = Object.fromEntries(Object.entries(quotes).map(([k, v]) => [k, { price: v.price, prevClose: v.prevClose }]));
          const { rings, rung } = evaluatePriceAlerts(L.alerts, q, today, L.rung, now);
          if (rings.length) {
            await ensureLabChannel(lg);
            for (const r of rings) {
              const t = ringText(r, lg);
              await notifyNow(t.title, t.body, `/lab/setup/${encodeURIComponent(r.symbol)}`, 'lab-price', lg).catch(() => {});
            }
            L.setRung(rung);
          }
        }
      } finally {
        busy.current = false;
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [lab.hydrated]);
  return null;
}
