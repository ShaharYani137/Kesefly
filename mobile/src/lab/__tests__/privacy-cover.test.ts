import { describe, expect, it } from 'vitest';

import { hideAppFromA11y, showPrivacyCover } from '@/state/privacy-cover';

describe('app lock privacy (P-018)', () => {
  it('hides the app from screen readers only behind the PIN cover', () => {
    expect(hideAppFromA11y('locked')).toBe(true);
    expect(hideAppFromA11y('needsPin')).toBe(true);
    expect(hideAppFromA11y('ready')).toBe(false);
    expect(hideAppFromA11y('signedOut')).toBe(false);
    expect(hideAppFromA11y('loading')).toBe(false);
  });

  it('covers the unlocked app when it leaves the foreground', () => {
    expect(showPrivacyCover('ready', 'inactive')).toBe(true);
    expect(showPrivacyCover('ready', 'background')).toBe(true);
    expect(showPrivacyCover('ready', 'active')).toBe(false);
    expect(showPrivacyCover('ready', 'unknown')).toBe(false);
  });

  it('does not cover the lock screen, PIN setup or signed-out screens', () => {
    for (const phase of ['inactive', 'background'] as const) {
      expect(showPrivacyCover('locked', phase)).toBe(false);
      expect(showPrivacyCover('needsPin', phase)).toBe(false);
      expect(showPrivacyCover('signedOut', phase)).toBe(false);
      expect(showPrivacyCover('loading', phase)).toBe(false);
    }
  });
});
