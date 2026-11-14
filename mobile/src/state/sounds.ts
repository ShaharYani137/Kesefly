/**
 * Custom sound per notification type (weekly tips, market events, price moves).
 *
 * Android fixes a channel's sound when the channel is created, so every (type, sound) pair has
 * its own channel id, e.g. "events-alert". Picking a sound in Settings creates that channel and
 * new notifications post to it. iOS plays the file named in the notification content.
 * Sound files: assets/sounds/*.wav (scripts/make_sounds.py), bundled by the expo-notifications
 * config plugin (app.json "sounds").
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const SOUND_IDS = ['default', 'chime', 'coin', 'bell', 'pulse', 'alert', 'silent'] as const;
export type SoundId = (typeof SOUND_IDS)[number];
export type NotifType = 'tips' | 'events' | 'moves';

export const DEFAULT_SOUNDS: Record<NotifType, SoundId> = { tips: 'chime', events: 'alert', moves: 'coin' };

export const channelId = (type: NotifType, sound: SoundId) => `${type}-${sound}`;

const file = (sound: SoundId) => (sound === 'default' || sound === 'silent' ? null : `${sound}.wav`);

/** Creates (or renames) the channel for a type + sound. `name` is shown in Android settings. */
export async function ensureSoundChannel(type: NotifType, sound: SoundId, name: string) {
  if (Platform.OS !== 'android') return;
  const f = file(sound);
  await Notifications.setNotificationChannelAsync(channelId(type, sound), {
    name,
    // eslint-disable-next-line import/namespace -- enum is re-exported via `export *`, which the rule cannot follow
    importance: sound === 'silent' ? Notifications.AndroidImportance.LOW : type === 'tips' ? Notifications.AndroidImportance.DEFAULT : Notifications.AndroidImportance.HIGH,
    lightColor: '#0F7B6C',
    ...(sound === 'silent' ? { sound: null, enableVibrate: false } : f ? { sound: f } : {}),
  });
}

/** Content field for iOS (Android uses the channel's sound). */
export function contentSound(sound: SoundId): string | boolean {
  if (sound === 'silent') return false;
  return file(sound) ?? true;
}
