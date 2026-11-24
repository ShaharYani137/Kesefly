/**
 * Privacy rules for the app lock (P-018). Plain TypeScript so it can be unit tested.
 *
 * - hideAppFromA11y: while the PIN cover (lock screen or PIN setup) is up, the live app stays
 *   mounted underneath. Screen readers must not reach it, or VoiceOver / TalkBack could read
 *   balances through the lock.
 * - showPrivacyCover: when the app leaves the foreground (iOS 'inactive' for the app switcher,
 *   'background' on both platforms), an opaque cover hides the app so the system snapshot shows
 *   no balances. Only while unlocked ('ready'): the lock screen and PIN setup are already opaque,
 *   and covering them would also hide the PIN pad behind the Face ID prompt (which makes iOS
 *   'inactive' too). Signed out there is no personal data on screen.
 */

/** Same values as auth.tsx `Status`. */
export type LockStatus = 'loading' | 'signedOut' | 'needsPin' | 'locked' | 'ready';

/** Same values as react-native `AppStateStatus`. */
export type AppPhase = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export function hideAppFromA11y(status: LockStatus): boolean {
  return status === 'locked' || status === 'needsPin';
}

export function showPrivacyCover(status: LockStatus, phase: AppPhase): boolean {
  return status === 'ready' && (phase === 'inactive' || phase === 'background');
}
