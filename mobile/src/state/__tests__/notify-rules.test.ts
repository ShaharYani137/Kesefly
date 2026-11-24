/** Notification permission step and Android channel cleanup (state/notify-rules.ts). */
import { describe, expect, it } from 'vitest';

import { LEGACY_CHANNEL_IDS, obsoleteChannelIds, permissionStep } from '../notify-rules';

const SOUNDS = ['default', 'chime', 'coin', 'bell', 'pulse', 'alert', 'silent'] as const;
const CURRENT = { tips: 'chime', events: 'alert', moves: 'coin', chat: 'bell' } as const;

describe('permissionStep', () => {
  it('does nothing when notifications are allowed', () => {
    expect(permissionStep({ granted: true, canAskAgain: true })).toBe('granted');
    expect(permissionStep({ granted: true, canAskAgain: false })).toBe('granted');
  });
  it('explains first when the OS can still ask', () => {
    expect(permissionStep({ granted: false, canAskAgain: true })).toBe('ask');
  });
  it('sends the user to Settings when the OS will not ask again', () => {
    expect(permissionStep({ granted: false, canAskAgain: false })).toBe('settings');
  });
});

describe('obsoleteChannelIds', () => {
  const ids = obsoleteChannelIds(CURRENT, SOUNDS);

  it('keeps the chosen channel of every type', () => {
    for (const keep of ['tips-chime', 'events-alert', 'moves-coin', 'chat-bell']) expect(ids).not.toContain(keep);
  });
  it('deletes the other sounds of every type', () => {
    expect(ids).toContain('chat-chime');
    expect(ids).toContain('tips-silent');
    expect(ids).toContain('events-default');
    // 4 types x 6 sounds that are not chosen, plus the legacy ids.
    expect(ids).toHaveLength(4 * (SOUNDS.length - 1) + LEGACY_CHANNEL_IDS.length);
  });
  it('deletes the old single tips channel but never the Lab channel', () => {
    expect(ids).toContain('tips');
    expect(ids).not.toContain('lab');
  });
  it('follows a changed choice', () => {
    const next = obsoleteChannelIds({ ...CURRENT, chat: 'pulse' }, SOUNDS);
    expect(next).toContain('chat-bell');
    expect(next).not.toContain('chat-pulse');
  });
});
