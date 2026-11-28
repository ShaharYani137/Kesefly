/**
 * World / economy event alerts, checked on the phone (no server).
 *
 * - In the background: expo-background-task runs `checkEvents` about every 30 minutes
 *   (the OS picks the exact time; Android WorkManager / iOS BGTaskScheduler, needs network).
 * - In the foreground: the app runs the same check every 10 minutes (see app/_layout.tsx).
 *
 * A story triggers a notification when it is new since the last check and either
 *   - names one of the user's stocks (medium impact or more), or
 *   - has high impact on markets.
 * Big daily moves (±3% or more) in the user's holdings also alert, once per symbol per exchange trading day
 * (see move-alert-keys.ts).
 * At most 3 alerts per run, so a busy news day does not flood the phone.
 *
 * The task reads settings straight from AsyncStorage, because it may run with no UI mounted.
 *
 * Checks never overlap (P-092, see event-lock.ts): callers in the same JS runtime share the
 * running check, and a check in another runtime skips while the seen-record's `runningSince`
 * is under 2 minutes old. Otherwise two checks could post the same story or move twice, and
 * the later write would drop the seen ids of the other.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { getEvents, type MarketEvent } from '@/engine/news';
import { getQuotes } from '@/engine/stocks';
import type { Lang } from '@/engine/types';
import { STRINGS } from '@/i18n/strings';
import { bidi, ltr } from '@/ui/bidi';

import { DEFAULT_PREFS, type Prefs, STORAGE_KEY } from './app-store';
import { isLocked, singleFlight } from './event-lock';
import { moveToAlert, pruneMoveKeys } from './move-alert-keys';
import { channelId, contentSound, DEFAULT_SOUNDS, ensureSoundChannel, type NotifType, type SoundId } from './sounds';

export const EVENTS_TASK = 'kesefly-event-check';
const SEEN_KEY = 'investapp/events/seen/v1';
const MAX_PER_RUN = 3;

type Saved = { lang?: Lang; holdings?: { symbol: string }[]; watchlist?: string[]; eventAlerts?: boolean; prefs?: Partial<Prefs> };
/** `runningSince`: start time of the check in progress (absent when none; older records lack it). */
type Seen = { ids: string[]; lastCheck: number; moves: string[]; runningSince?: number };

async function readSeen(): Promise<Seen> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (raw) return { ids: [], lastCheck: 0, moves: [], ...(JSON.parse(raw) as Partial<Seen>) };
  } catch {
    // fall through
  }
  return { ids: [], lastCheck: 0, moves: [] };
}

async function writeSeen(seen: Seen) {
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

/** Clears our `runningSince` after a failed run, unless another run has taken the lock since. */
async function releaseLock(stamp: number) {
  try {
    const { runningSince, ...rest } = await readSeen();
    if (runningSince === stamp) await writeSeen(rest);
  } catch {
    // The mark goes stale after 2 minutes anyway.
  }
}

/** Creates (or renames) the event and price-move channels for the chosen sounds. */
export async function ensureEventsChannel(lang: Lang, sounds: Record<NotifType, SoundId> = DEFAULT_SOUNDS) {
  const s = STRINGS[lang];
  const he = lang === 'he';
  await ensureSoundChannel('events', sounds.events, bidi(`${s.events.channel} · ${s.settings3.soundNames[sounds.events]}`, he));
  await ensureSoundChannel('moves', sounds.moves, bidi(`${s.settings3.soundTypes.moves} · ${s.settings3.soundNames[sounds.moves]}`, he));
}

/** Plays a sound by posting a short sample notification on that type's channel (sound preview). */
export async function previewSound(type: NotifType, sound: SoundId, lang: Lang) {
  const s = STRINGS[lang];
  const he = lang === 'he';
  const name = bidi(`${s.settings3.soundTypes[type]} · ${s.settings3.soundNames[sound]}`, he);
  await ensureSoundChannel(type, sound, name);
  await Notifications.scheduleNotificationAsync({
    content: { title: bidi(s.settings3.previewTitle, he), body: name, sound: contentSound(sound) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(type, sound) },
  });
}

/**
 * Notification text in the app language. Title: category · impact · affected symbols.
 * Body: the headline; when the story is in the other language, a line in the app language
 * says so ("כתבה באנגלית מ-CNBC:") and the headline keeps its own direction.
 */
export function eventContent(e: MarketEvent, lang: Lang): { title: string; body: string } {
  const s = STRINGS[lang];
  const he = lang === 'he';
  const tag = e.affects.length ? ` · ${e.affects.slice(0, 3).join(', ')}` : '';
  const title = bidi(`${s.events.cat[e.category]} · ${s.events.impact[e.impact]}${tag}`, he);
  if (e.lang === lang) return { title, body: bidi(e.title, he) };
  const intro = bidi(s.events.foreignStory.replace('{source}', e.source), he);
  const headline = e.lang === 'he' ? bidi(e.title, true) : ltr(e.title);
  return { title, body: `${intro}\n${headline}` };
}

function worth(e: MarketEvent, since: number, scope: Prefs['alertScope']): boolean {
  if (e.time <= since) return false;
  if (scope === 'mine') return e.direct && e.impact !== 'low';
  if (scope === 'all') return e.impact !== 'low';
  return (e.direct && e.impact !== 'low') || e.impact === 'high';
}

/** 22:00-07:00 phone time. */
function isQuiet(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 22 || h < 7;
}

/**
 * One check. Returns how many notifications were sent. Safe to call from UI or background.
 * Calls made while a check runs get that check's result; returns 0 when another JS runtime
 * is checking (that run sends the alerts).
 */
export const checkEvents: () => Promise<number> = singleFlight(runCheck);

async function runCheck(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  const saved = JSON.parse(raw) as Saved;
  if (!saved.eventAlerts) return 0;
  const prefs = { ...DEFAULT_PREFS, ...saved.prefs };
  // Quiet hours: send nothing and keep the last-check time, so the stories wait for the morning.
  if (prefs.quietHours && isQuiet()) return 0;
  const lang: Lang = saved.lang === 'he' ? 'he' : 'en';
  const s = STRINGS[lang];
  const held = (saved.holdings ?? []).map((h) => h.symbol.toUpperCase());
  const symbols = [...new Set([...held, ...(saved.watchlist ?? [])])];

  const seen = await readSeen();
  // Another JS runtime (the headless background task) is checking: skip, that run sends the alerts.
  const stamp = Date.now();
  if (isLocked(seen.runningSince, stamp)) return 0;
  await writeSeen({ ...seen, runningSince: stamp });
  let done = false;
  try {
    // First run: only look back 2 hours, so turning alerts on does not replay yesterday's news.
    const since = seen.lastCheck || Date.now() - 2 * 3600_000;
    const sounds = { ...DEFAULT_SOUNDS, ...prefs.sounds };
    await ensureEventsChannel(lang, sounds);

    const events = await getEvents({ symbols, lang, force: true });
    // Stories in the app language rank a little higher, so a Hebrew user gets Hebrew sources first.
    const rank = (e: MarketEvent) => e.score + (e.lang === lang ? 8 : 0);
    const fresh = events
      .filter((e) => !seen.ids.includes(e.id) && worth(e, since, prefs.alertScope))
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, MAX_PER_RUN);

    let sent = 0;
    for (const e of fresh) {
      await Notifications.scheduleNotificationAsync({
        content: { ...eventContent(e, lang), data: { url: '/events', link: e.link }, sound: contentSound(sounds.events) },
        trigger: { channelId: channelId('events', sounds.events) } as Notifications.NotificationTriggerInput,
      });
      sent++;
    }

    // Big moves in the user's own holdings, once per symbol per exchange trading day.
    const moves = pruneMoveKeys(seen.moves, Date.now());
    if (held.length && sent < MAX_PER_RUN) {
      const quotes = await getQuotes(held, true);
      for (const sym of held) {
        if (sent >= MAX_PER_RUN) break;
        const q = quotes[sym];
        const key = moveToAlert(sym, q, prefs.moveThreshold, moves, Date.now());
        if (!q || !key) continue;
        const pct = `${q.changePct > 0 ? '+' : ''}${(q.changePct * 100).toFixed(1)}%`;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: bidi((q.changePct > 0 ? s.events.moveUp : s.events.moveDown).replace('{symbol}', sym).replace('{pct}', pct), lang === 'he'),
            body: bidi(s.events.moveBody, lang === 'he'),
            data: { url: `/stock/${encodeURIComponent(sym)}` },
            sound: contentSound(sounds.moves),
          },
          trigger: { channelId: channelId('moves', sounds.moves) } as Notifications.NotificationTriggerInput,
        });
        moves.push(key);
        sent++;
      }
    }

    const ids = [...fresh.map((e) => e.id), ...seen.ids].slice(0, 400);
    // Saved without runningSince, which releases the lock.
    await writeSeen({ ids, lastCheck: Date.now(), moves });
    done = true;
    return sent;
  } finally {
    if (!done) await releaseLock(stamp);
  }
}

// Must be defined at module scope, so the OS can run it when the app is not open.
TaskManager.defineTask(EVENTS_TASK, async () => {
  try {
    await checkEvents();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function enableEventAlerts() {
  const registered = await TaskManager.isTaskRegisteredAsync(EVENTS_TASK);
  if (!registered) await BackgroundTask.registerTaskAsync(EVENTS_TASK, { minimumInterval: 30 });
}

export async function disableEventAlerts() {
  if (await TaskManager.isTaskRegisteredAsync(EVENTS_TASK)) await BackgroundTask.unregisterTaskAsync(EVENTS_TASK);
}

/** Sends a sample alert from the current top story, so the user sees what alerts look like. */
export async function sendTestEventAlert(lang: Lang, symbols: string[], sounds: Record<NotifType, SoundId> = DEFAULT_SOUNDS) {
  await ensureEventsChannel(lang, sounds);
  const s = STRINGS[lang];
  const rank = (e: MarketEvent) => e.score + (e.lang === lang ? 8 : 0);
  const [top] = (await getEvents({ symbols, lang })).sort((a, b) => rank(b) - rank(a));
  const content = top ? eventContent(top, lang) : { title: bidi(s.events.title, lang === 'he'), body: bidi(s.events.empty, lang === 'he') };
  await Notifications.scheduleNotificationAsync({
    content: { ...content, data: { url: '/events' }, sound: contentSound(sounds.events) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: channelId('events', sounds.events) },
  });
}
