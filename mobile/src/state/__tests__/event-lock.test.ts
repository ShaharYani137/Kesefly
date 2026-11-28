/**
 * Event-alert checks never overlap (P-092): state/event-lock.ts and its use in
 * state/event-alerts.ts, with in-memory AsyncStorage and mocked notifications / news / quotes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isLocked, LOCK_STALE_MS, singleFlight } from '@/state/event-lock';

const m = vi.hoisted(() => ({
  store: new Map<string, string>(),
  getEvents: vi.fn(),
  getQuotes: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => m.store.get(k) ?? null,
    setItem: async (k: string, v: string) => void m.store.set(k, v),
    removeItem: async (k: string) => void m.store.delete(k),
  },
}));
vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: m.notify,
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));
vi.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  registerTaskAsync: async () => {},
  unregisterTaskAsync: async () => {},
}));
vi.mock('expo-task-manager', () => ({ defineTask: () => {}, isTaskRegisteredAsync: async () => false }));
vi.mock('@/engine/news', () => ({ getEvents: m.getEvents }));
vi.mock('@/engine/stocks', () => ({ getQuotes: m.getQuotes }));
vi.mock('@/ui/bidi', () => ({ bidi: (t: string) => t, ltr: (t: string) => t }));
vi.mock('@/state/sounds', () => ({
  DEFAULT_SOUNDS: { tips: 'chime', events: 'alert', moves: 'coin', chat: 'bell' },
  channelId: (type: string, sound: string) => `${type}-${sound}`,
  contentSound: () => true,
  ensureSoundChannel: async () => {},
}));
vi.mock('@/state/app-store', () => ({
  STORAGE_KEY: 'investapp/state/v1',
  DEFAULT_PREFS: { alertScope: 'important', moveThreshold: 3, quietHours: true, sounds: {} },
}));
vi.mock('@/i18n/strings', () => {
  const key = new Proxy({}, { get: (_t, k) => String(k) });
  const s = {
    events: { cat: key, impact: key, channel: 'Events', foreignStory: 'Story from {source}:', moveUp: '{symbol} {pct}', moveDown: '{symbol} {pct}', moveBody: 'Move' },
    settings3: { soundNames: key, soundTypes: key },
  };
  return { STRINGS: { en: s, he: s } };
});

const STATE = 'investapp/state/v1';
const SEEN = 'investapp/events/seen/v1';

const story = (id: string) => ({
  id,
  title: `Story ${id}`,
  link: `https://example.com/${id}`,
  source: 'CNBC',
  lang: 'en',
  time: Date.now(),
  category: 'macro',
  impact: 'high',
  direction: null,
  affects: [],
  direct: false,
  score: 10,
});

const seen = () => JSON.parse(m.store.get(SEEN) ?? 'null') as { ids: string[]; runningSince?: number } | null;

/** A promise the test resolves by hand, to keep a check "running". */
function gate<T>() {
  let open!: (v: T) => void;
  const wait = new Promise<T>((r) => (open = r));
  return { wait, open };
}

describe('isLocked', () => {
  const now = Date.parse('2026-11-28T12:00:00Z');
  it('locks only for a timestamp from the last 2 minutes', () => {
    expect(isLocked(now - 1000, now)).toBe(true);
    expect(isLocked(now - LOCK_STALE_MS + 1, now)).toBe(true);
    expect(isLocked(now - LOCK_STALE_MS, now)).toBe(false);
    expect(isLocked(now - 10 * LOCK_STALE_MS, now)).toBe(false);
  });
  it('ignores missing, malformed and future values', () => {
    for (const v of [undefined, null, '123', Number.NaN, Infinity, now + 60_000]) expect(isLocked(v, now)).toBe(false);
  });
});

describe('singleFlight', () => {
  it('shares one run between overlapping callers and runs again afterwards', async () => {
    const g = gate<number>();
    const fn = vi.fn(() => g.wait);
    const once = singleFlight(fn);
    const a = once();
    const b = once();
    expect(a).toBe(b);
    g.open(7);
    expect(await Promise.all([a, b])).toEqual([7, 7]);
    expect(fn).toHaveBeenCalledTimes(1);
    fn.mockResolvedValueOnce(8);
    expect(await once()).toBe(8);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('lets the next call run after a failure', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(1);
    const once = singleFlight(fn);
    await expect(once()).rejects.toThrow('boom');
    expect(await once()).toBe(1);
  });
});

describe('checkEvents lock', () => {
  beforeEach(() => {
    m.store.clear();
    m.store.set(STATE, JSON.stringify({ lang: 'en', eventAlerts: true, holdings: [], prefs: { quietHours: false } }));
    m.getEvents.mockReset().mockResolvedValue([story('a')]);
    m.getQuotes.mockReset().mockResolvedValue({});
    m.notify.mockReset().mockResolvedValue('id');
    vi.resetModules();
  });
  afterEach(() => vi.useRealTimers());

  it('posts once when two checks overlap in the same runtime', async () => {
    const { checkEvents } = await import('@/state/event-alerts');
    const [a, b] = await Promise.all([checkEvents(), checkEvents()]);
    expect([a, b]).toEqual([1, 1]);
    expect(m.getEvents).toHaveBeenCalledTimes(1);
    expect(m.notify).toHaveBeenCalledTimes(1);
    expect(seen()?.ids).toEqual(['a']);
    expect(seen()?.runningSince).toBeUndefined();
  });

  it('skips while another runtime is checking, and that run keeps its seen ids', async () => {
    const g = gate<unknown[]>();
    m.getEvents.mockReturnValueOnce(g.wait);
    const background = (await import('@/state/event-alerts')).checkEvents;
    vi.resetModules(); // a second module instance = a second JS runtime sharing AsyncStorage
    const foreground = (await import('@/state/event-alerts')).checkEvents;

    const bg = background();
    await vi.waitFor(() => expect(m.getEvents).toHaveBeenCalledTimes(1));
    expect(typeof seen()?.runningSince).toBe('number');
    expect(await foreground()).toBe(0);
    expect(m.getEvents).toHaveBeenCalledTimes(1);

    g.open([story('a')]);
    expect(await bg).toBe(1);
    expect(m.notify).toHaveBeenCalledTimes(1);
    expect(seen()?.ids).toEqual(['a']);
    expect(seen()?.runningSince).toBeUndefined();

    // Lock released: the next check runs, and the story already seen is not posted again.
    expect(await foreground()).toBe(0);
    expect(m.getEvents).toHaveBeenCalledTimes(2);
    expect(m.notify).toHaveBeenCalledTimes(1);
  });

  it('ignores a runningSince older than 2 minutes (crashed run)', async () => {
    m.store.set(SEEN, JSON.stringify({ ids: [], lastCheck: 0, moves: [], runningSince: Date.now() - LOCK_STALE_MS - 1000 }));
    const { checkEvents } = await import('@/state/event-alerts');
    expect(await checkEvents()).toBe(1);
    expect(seen()?.runningSince).toBeUndefined();
  });

  it('blocks a fresh runningSince for at most 2 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const t0 = Date.parse('2026-11-28T12:00:00Z');
    vi.setSystemTime(t0);
    m.store.set(SEEN, JSON.stringify({ ids: [], lastCheck: 0, moves: [], runningSince: t0 - 1000 }));
    m.getEvents.mockImplementation(async () => [story('a')]);
    const { checkEvents } = await import('@/state/event-alerts');
    expect(await checkEvents()).toBe(0);
    expect(m.getEvents).not.toHaveBeenCalled();
    vi.setSystemTime(t0 - 1000 + LOCK_STALE_MS);
    expect(await checkEvents()).toBe(1);
  });

  it('clears runningSince when a check throws, so the next one runs', async () => {
    m.store.set(SEEN, JSON.stringify({ ids: ['old'], lastCheck: 5, moves: [] }));
    m.getEvents.mockRejectedValueOnce(new Error('network'));
    const { checkEvents } = await import('@/state/event-alerts');
    await expect(checkEvents()).rejects.toThrow('network');
    expect(seen()).toEqual({ ids: ['old'], lastCheck: 5, moves: [] });
    expect(await checkEvents()).toBe(1);
    expect(seen()?.ids).toEqual(['a', 'old']);
  });

  it('reads old records without runningSince and saves the same fields as before', async () => {
    m.store.set(SEEN, JSON.stringify({ ids: ['x'], lastCheck: Date.now() - 60_000, moves: [] }));
    const { checkEvents } = await import('@/state/event-alerts');
    expect(await checkEvents()).toBe(1);
    expect(Object.keys(seen() ?? {}).sort()).toEqual(['ids', 'lastCheck', 'moves']);
    expect(await checkEvents()).toBe(0);
    expect(m.notify).toHaveBeenCalledTimes(1);
  });
});
