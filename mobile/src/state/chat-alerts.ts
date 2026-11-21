/**
 * New-message notifications for user chat, checked on the phone (no push server).
 *
 * - In the background: expo-background-task runs `checkChats` about every 15 minutes (the
 *   Android minimum; the OS picks the exact time and may wait longer to save battery).
 * - The chats list and chat room keep the unread badge right while the app is open
 *   (`updateChatBadge`).
 *
 * One notification per chat that has a message newer than the last one we notified about:
 * "Name: last message" (1:1) or "Group: last message", plus "+N more" when several are unread.
 * At most 5 per run. The app icon badge shows the total unread count (on launchers that
 * support badges).
 *
 * The task reads language and sound straight from AsyncStorage, because it may run with no UI
 * mounted. Signed out or device mode: nothing is checked and the badge is cleared.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { listConversations, type Conversation } from '@/chat/api';
import type { Lang } from '@/engine/types';
import { STRINGS } from '@/i18n/strings';
import { bidi } from '@/ui/bidi';

import { DEFAULT_PREFS, fill, type Prefs, STORAGE_KEY } from './app-store';
import { CLOUD, getAccessToken } from './auth';
import { channelId, contentSound, DEFAULT_SOUNDS, ensureSoundChannel, type SoundId } from './sounds';

export const CHAT_TASK = 'kesefly-chat-check';
const NOTIFIED_KEY = 'investapp/chat/notified/v1';
const MAX_PER_RUN = 5;
const PREVIEW_LEN = 120;

type Saved = { lang?: Lang; prefs?: Partial<Prefs> };
/** Conversation id -> `last_at` of the newest message already notified. */
type Notified = Record<string, string>;

async function readSaved(): Promise<{ lang: Lang; sound: SoundId }> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Saved) : {};
    return { lang: saved.lang ?? 'he', sound: saved.prefs?.sounds?.chat ?? DEFAULT_PREFS.sounds.chat };
  } catch {
    return { lang: 'he', sound: DEFAULT_SOUNDS.chat };
  }
}

async function readNotified(): Promise<Notified> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_KEY);
    return raw ? (JSON.parse(raw) as Notified) : {};
  } catch {
    return {};
  }
}

const totalUnread = (convs: Conversation[]) => convs.reduce((n, c) => n + Math.max(0, c.unread ?? 0), 0);

/** Sets the app icon badge to the total unread count. */
export async function updateChatBadge(convs: Conversation[]) {
  await Notifications.setBadgeCountAsync(totalUnread(convs)).catch(() => false);
}

export async function clearChatBadge() {
  await Notifications.setBadgeCountAsync(0).catch(() => false);
}

/** Creates (or renames) the Android channel for message notifications with the chosen sound. */
export async function ensureChatChannel(lang: Lang, sound: SoundId = DEFAULT_SOUNDS.chat) {
  const s = STRINGS[lang];
  await ensureSoundChannel('chat', sound, bidi(`${s.settings3.soundTypes.chat} · ${s.settings3.soundNames[sound]}`, lang === 'he'));
}

function chatName(c: Conversation, lang: Lang): string {
  const s = STRINGS[lang].chat;
  if (c.is_group) return c.title || s.group;
  return c.peer_name || (c.peer_username ? `@${c.peer_username}` : s.title);
}

/**
 * Checks for new messages and posts notifications. Returns the number posted.
 * `quiet`: update the badge and the "already notified" marks, but post nothing (app on screen).
 */
export async function checkChats(quiet = false): Promise<number> {
  if (!CLOUD || !(await getAccessToken())) {
    await clearChatBadge();
    return 0;
  }
  const convs = await listConversations();
  await updateChatBadge(convs);

  const notified = await readNotified();
  const fresh = convs.filter((c) => (c.unread ?? 0) > 0 && c.last_at && c.last_at !== notified[c.id] && c.last_at > (notified[c.id] ?? ''));
  const next: Notified = {};
  // Keep marks only for chats the user is still in.
  for (const c of convs) if (notified[c.id]) next[c.id] = notified[c.id];

  let sent = 0;
  if (!quiet && fresh.length) {
    const { lang, sound } = await readSaved();
    const s = STRINGS[lang].chat;
    const he = lang === 'he';
    await ensureChatChannel(lang, sound);
    for (const c of fresh.slice(0, MAX_PER_RUN)) {
      const preview = (c.last_body ?? '').replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LEN);
      const more = (c.unread ?? 0) > 1 ? ` ${fill(s.notifyMore, { n: (c.unread ?? 0) - 1 })}` : '';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: bidi(chatName(c, lang), he),
          body: bidi(`${preview}${more}`, he),
          data: { url: `/chats/${c.id}` },
          sound: contentSound(sound),
        },
        trigger: { channelId: channelId('chat', sound) } as Notifications.NotificationTriggerInput,
      });
      sent++;
    }
  }
  for (const c of fresh) next[c.id] = c.last_at;
  await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify(next));
  return sent;
}

// Must be defined at module scope, so the OS can run it when the app is not open.
TaskManager.defineTask(CHAT_TASK, async () => {
  try {
    // App on screen: the chat pages show new messages live, so only the badge is updated.
    await checkChats(AppState.currentState === 'active');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function enableChatAlerts() {
  if (!(await TaskManager.isTaskRegisteredAsync(CHAT_TASK))) await BackgroundTask.registerTaskAsync(CHAT_TASK, { minimumInterval: 15 });
}

export async function disableChatAlerts() {
  if (await TaskManager.isTaskRegisteredAsync(CHAT_TASK)) await BackgroundTask.unregisterTaskAsync(CHAT_TASK);
  await clearChatBadge();
}
