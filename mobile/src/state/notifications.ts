/**
 * Weekly advice notifications, built and scheduled on the device (expo-notifications, local only:
 * no push server, nothing leaves the phone).
 *
 * We schedule the next WEEKS notifications as one-off dated notifications, each with a different
 * tip taken from the user's own ideas list (engine/recommendations.ts) plus a check-up summary.
 * The schedule is rebuilt whenever the profile or language changes, so tips stay current.
 *
 * DESIGN DECISIONS: Sunday 10:00 local time (the Israeli work week starts on Sunday; US users
 * get a calm weekend read). 8 weeks ahead.
 */
import * as Notifications from 'expo-notifications';

import { checkup } from '@/engine/health';
import { recommendations } from '@/engine/recommendations';
import type { Lang, Profile } from '@/engine/types';
import type { Strings } from '@/i18n/strings';
import { bidi } from '@/ui/bidi';

import { channelId, contentSound, DEFAULT_SOUNDS, ensureSoundChannel, type SoundId } from './sounds';
import { ideaText } from '@/ui/idea-card';

const WEEKS = 8;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Creates or renames the tips channel for the chosen sound (Android shows its name in system settings). */
export async function ensureChannel(s: Strings, sound: SoundId = DEFAULT_SOUNDS.tips) {
  await ensureSoundChannel('tips', sound, `${s.settings.notifyLabel} · ${s.settings3.soundNames[sound]}`);
}

/** Asks for permission if needed. Returns true when notifications may be shown. */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Next Sunday at 10:00 local time, `weeksAhead` weeks out (0 = the coming Sunday). */
function sunday(weeksAhead: number): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(10, 0, 0, 0);
  let add = (7 - d.getDay()) % 7; // days until Sunday (getDay: 0 = Sunday)
  if (add === 0 && d <= now) add = 7;
  d.setDate(d.getDate() + add + weeksAhead * 7);
  return d;
}

function tips(profile: Profile, s: Strings, lang: Lang): { title: string; body: string }[] {
  const ideas = recommendations(profile).map((i) => ideaText(i, s, profile, lang));
  const done = checkup(profile).filter((c) => c.ok).length;
  const pool = [
    ...ideas.map((t) => ({ title: `${s.notif.title}: ${t.title}`, body: t.body })),
    { title: s.notif.title, body: s.notif.checkup.replace('{n}', String(done)) },
    { title: s.notif.title, body: s.notif.keepGoing },
  ];
  return Array.from({ length: WEEKS }, (_, i) => pool[i % pool.length]);
}

/** Replaces all scheduled tips with a fresh set. Call when enabling, or when the plan changes. */
export async function scheduleWeeklyTips(profile: Profile, s: Strings, lang: Lang, sound: SoundId = DEFAULT_SOUNDS.tips) {
  await ensureChannel(s, sound);
  await Notifications.cancelAllScheduledNotificationsAsync();
  const list = tips(profile, s, lang);
  for (let w = 0; w < list.length; w++) {
    await Notifications.scheduleNotificationAsync({
      content: { title: bidi(list[w].title, lang === 'he'), body: bidi(list[w].body, lang === 'he'), sound: contentSound(sound) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sunday(w), channelId: channelId('tips', sound) },
    });
  }
}

export async function cancelTips() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Sends one tip in 3 seconds, so the user can see what it looks like. */
export async function sendTestTip(profile: Profile, s: Strings, lang: Lang, sound: SoundId = DEFAULT_SOUNDS.tips) {
  await ensureChannel(s, sound);
  const t = tips(profile, s, lang)[0];
  await Notifications.scheduleNotificationAsync({
    content: { title: bidi(t.title, lang === 'he'), body: bidi(t.body, lang === 'he'), sound: contentSound(sound) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: channelId('tips', sound) },
  });
}
