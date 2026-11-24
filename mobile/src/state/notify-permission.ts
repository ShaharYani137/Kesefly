/**
 * Notification permission flow and Android channel cleanup.
 *
 * - The OS prompt (Android 13+ POST_NOTIFICATIONS, iOS) is never shown cold: the app first
 *   explains why in its own dialog (or the chats card), and asks the OS only after the user
 *   taps Continue. When the OS will not ask again (`canAskAgain` false), the app offers
 *   "Turn on in Settings", which opens Kesefly's page in the phone settings.
 * - `useNotifyPermission` keeps the current status and re-reads it when the app comes back
 *   to the foreground (the user may have changed it in Settings).
 * - `deleteOldChannels` removes Android channels that older versions created and that
 *   nothing posts to any more (notify-rules.ts).
 *
 * expo-notifications calls used here: getPermissionsAsync / requestPermissionsAsync (already
 * used by the app before this change) and deleteNotificationChannelAsync (Android only).
 */
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import type { Strings } from '@/i18n/strings';
import { showDialog } from '@/ui/dialog';

import { obsoleteChannelIds, type PermStatus, permissionStep } from './notify-rules';
import { type NotifType, SOUND_IDS, type SoundId } from './sounds';

export type PermReason = 'chat' | 'tips' | 'events';

let current: PermStatus | null = null;
const listeners = new Set<(p: PermStatus) => void>();

function publish(p: { granted: boolean; canAskAgain: boolean }): PermStatus {
  const next = { granted: p.granted, canAskAgain: p.canAskAgain };
  current = next;
  listeners.forEach((l) => l(next));
  return next;
}

/** Reads the OS status (no prompt) and tells every `useNotifyPermission` user. */
export async function readPermission(): Promise<PermStatus> {
  return publish(await Notifications.getPermissionsAsync());
}

/** Shows the OS prompt. Call only after the user has seen the explanation and tapped Continue. */
export async function askOsPermission(): Promise<boolean> {
  return publish(await Notifications.requestPermissionsAsync()).granted;
}

/** Opens Kesefly's page in the phone settings. */
export function openAppSettings() {
  Linking.openSettings().catch(() => {});
}

/** Current permission status; null until the first read. Re-read when the app returns to the foreground. */
export function useNotifyPermission(): PermStatus | null {
  const [p, setP] = useState<PermStatus | null>(current);
  useEffect(() => {
    listeners.add(setP);
    readPermission().catch(() => {});
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') readPermission().catch(() => {});
    });
    return () => {
      listeners.delete(setP);
      sub.remove();
    };
  }, []);
  return p;
}

/**
 * Makes sure notifications may be shown, asking the user the polite way. Resolves true when
 * allowed. Not allowed yet: explains why first and shows the OS prompt only after Continue.
 * The OS will not ask again: explains how, with a "Turn on in Settings" button (resolves false).
 */
export async function confirmNotifyPermission(s: Strings, reason: PermReason): Promise<boolean> {
  const p = await readPermission();
  const step = permissionStep(p);
  if (step === 'granted') return true;
  const t = s.notifPerm;
  return new Promise<boolean>((resolve) => {
    const notNow = { text: t.notNow, style: 'cancel' as const, onPress: () => resolve(false) };
    if (step === 'ask') {
      showDialog(t.title, `${t.why[reason]}\n\n${t.next}`, [
        notNow,
        { text: t.continue, onPress: () => askOsPermission().then(resolve, () => resolve(false)) },
      ]);
    } else {
      showDialog(t.blockedTitle, `${t.why[reason]}\n\n${t.blockedBody}`, [
        notNow,
        {
          text: t.openSettings,
          onPress: () => {
            openAppSettings();
            resolve(false);
          },
        },
      ]);
    }
  });
}

/** Deletes Android channels from older versions and from sounds no longer chosen. */
export async function deleteOldChannels(sounds: Record<NotifType, SoundId>) {
  if (Platform.OS !== 'android') return;
  for (const id of obsoleteChannelIds(sounds, SOUND_IDS)) {
    await Notifications.deleteNotificationChannelAsync(id).catch(() => {});
  }
}
