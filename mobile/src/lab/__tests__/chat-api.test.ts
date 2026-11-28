/** User chat REST client (chat/api.ts) against a mocked fetch. */
import { afterEach, describe, expect, it, vi } from 'vitest';

// Fake token with sub = "user-1" (header.payload.signature).
const payload = Buffer.from(JSON.stringify({ sub: 'user-1' })).toString('base64url');
const TOKEN = `h.${payload}.s`;

vi.mock('@/state/auth', () => ({
  CLOUD: true,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_KEY: 'anon',
  getAccessToken: async () => TOKEN,
}));

type Call = { url: string; init: RequestInit };
const calls: Call[] = [];

function reply(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(status === 204 ? null : JSON.stringify(body), { status });
    }),
  );
}

afterEach(() => {
  calls.length = 0;
  vi.unstubAllGlobals();
});

describe('chat api', () => {
  it('reads the user id from the token and sends auth headers', async () => {
    const api = await import('@/chat/api');
    expect(await api.myUserId()).toBe('user-1');
    reply(200, [{ id: 'user-1', username: 'dana', display_name: 'Dana' }]);
    const p = await api.getMyProfile();
    expect(p?.username).toBe('dana');
    expect(calls[0].url).toBe('https://example.supabase.co/rest/v1/profiles?id=eq.user-1&select=id,username,display_name');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('keeps search input from changing the filter', async () => {
    const api = await import('@/chat/api');
    reply(200, []);
    await api.searchUsers('@Da,na).or(');
    const url = decodeURIComponent(calls[0].url);
    // Only letters and digits survive: no comma or bracket can close the or() early.
    expect(url).toContain('or=(username.ilike.danaor*,display_name.ilike.danaor*)&');
    expect(url).toContain('id=neq.user-1');
    expect(await api.searchUsers('a')).toEqual([]); // too short: no request
    expect(calls).toHaveLength(1);
  });

  it('maps server errors', async () => {
    const api = await import('@/chat/api');
    reply(409, { code: '23505', message: 'duplicate key' });
    await expect(api.saveProfile('dana', 'Dana')).rejects.toMatchObject({ code: 'taken' });
    reply(404, { code: 'PGRST202', message: 'function not found' });
    await expect(api.listConversations()).rejects.toMatchObject({ code: 'notSetUp' });
    await expect(api.saveProfile('Bad Name!', '')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('refuses look-alike display names before any request', async () => {
    const api = await import('@/chat/api');
    reply(200, [{ id: 'user-1', username: 'dana', display_name: 'Kesefly' }]);
    await expect(api.saveProfile('dana', 'Kesefly')).rejects.toMatchObject({ code: 'invalid' });
    expect(calls).toHaveLength(0);
  });

  it('sends trimmed messages and refuses empty ones', async () => {
    const api = await import('@/chat/api');
    reply(201, [{ id: 7, conversation_id: 'c1', sender_id: 'user-1', body: 'hi', created_at: '2026-11-21T10:00:00Z' }]);
    const m = await api.sendMessage('c1', '  hi  ');
    expect(m.id).toBe(7);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ conversation_id: 'c1', body: 'hi' });
    await expect(api.sendMessage('c1', '   ')).rejects.toMatchObject({ code: 'invalid' });
  });
});
