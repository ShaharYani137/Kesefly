/**
 * Pure rules for notification permission and Android channel cleanup (no React Native, so the
 * unit tests can run them). The side effects live in state/notify-permission.ts.
 */
import type { NotifType, SoundId } from './sounds';

export type PermStatus = { granted: boolean; canAskAgain: boolean };

/**
 * What to do before asking the OS:
 * - 'granted': notifications are allowed, nothing to ask.
 * - 'ask': explain why in the app first; show the OS prompt only after the user taps Continue.
 * - 'settings': the OS will not show its prompt again, so offer "Turn on in Settings".
 */
export type PermStep = 'granted' | 'ask' | 'settings';

export function permissionStep(p: PermStatus): PermStep {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'ask' : 'settings';
}

/**
 * Channel ids made by older versions of the app that no current code posts to:
 * 'tips' (the single tips channel before per-sound channels, removed in c42a61a).
 */
export const LEGACY_CHANNEL_IDS = ['tips'] as const;

/**
 * Android channels to delete: the legacy ids above, plus every "<type>-<sound>" channel
 * (sounds.ts channelId) whose sound is no longer the chosen one for that type. Picking a
 * sound creates a new channel, so the old ones would pile up in the phone's settings.
 * The 'lab' channel and channels this app never created are not touched.
 */
export function obsoleteChannelIds(current: Record<NotifType, SoundId>, soundIds: readonly SoundId[]): string[] {
  const out: string[] = [...LEGACY_CHANNEL_IDS];
  for (const type of Object.keys(current) as NotifType[]) {
    for (const sound of soundIds) if (sound !== current[type]) out.push(`${type}-${sound}`);
  }
  return out;
}
