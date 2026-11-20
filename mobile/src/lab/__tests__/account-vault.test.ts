/** Account data separation (state/account-vault.ts) with in-memory storage mocks. */
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const async = new Map<string, string>();
const secure = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => async.get(k) ?? null,
    setItem: async (k: string, v: string) => void async.set(k, v),
    removeItem: async (k: string) => void async.delete(k),
    multiGet: async (ks: string[]) => ks.map((k) => [k, async.get(k) ?? null]),
    multiSet: async (kv: [string, string][]) => kv.forEach(([k, v]) => async.set(k, v)),
    multiRemove: async (ks: string[]) => ks.forEach((k) => async.delete(k)),
  },
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => secure.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void secure.set(k, v),
  deleteItemAsync: async (k: string) => void secure.delete(k),
}));
vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_a: string, v: string) => createHash('sha256').update(v).digest('hex'),
}));

const STATE = 'investapp/state/v1';
const API = 'kesefly.ai.apiKey';

describe('account vault', () => {
  beforeEach(() => {
    async.clear();
    secure.clear();
    vi.resetModules();
  });

  it('keeps each account to its own data', async () => {
    const v = await import('@/state/account-vault');
    let reloads = 0;
    v.onAccountSwitch(() => reloads++);

    // Data from before accounts were separated: the first account claims it.
    async.set(STATE, 'A-data');
    secure.set(API, 'A-key');
    await v.openAccount('a@example.com');
    expect(async.get(STATE)).toBe('A-data');
    expect(reloads).toBe(0);

    // Sign out: live data cleared, next account starts empty.
    await v.parkAccount();
    expect(async.get(STATE)).toBeUndefined();
    expect(secure.get(API)).toBeUndefined();
    await v.openAccount('B@example.com');
    expect(async.get(STATE)).toBeUndefined();

    async.set(STATE, 'B-data');
    await v.parkAccount();

    // Back to A: A's data and key return, not B's.
    await v.openAccount('a@example.com');
    expect(async.get(STATE)).toBe('A-data');
    expect(secure.get(API)).toBe('A-key');

    // A sign-in without a finished sign-out still swaps (parks A, loads B).
    await v.openAccount('b@example.com');
    expect(async.get(STATE)).toBe('B-data');
    expect(secure.get(API)).toBeUndefined();
    expect(reloads).toBeGreaterThan(0);
  });

  it('blocks saves of data loaded before a swap', async () => {
    const v = await import('@/state/account-vault');
    await v.openAccount('a@example.com');
    const at = v.generation();
    expect(v.canSave(at)).toBe(true);
    await v.parkAccount();
    expect(v.canSave(at)).toBe(false);
    expect(v.canSave(v.generation())).toBe(true);
  });
});
