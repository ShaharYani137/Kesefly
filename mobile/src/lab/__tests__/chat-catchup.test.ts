/** Chat catch-up (chat/api.ts listMessagesSince): pages forward until a short page, against a mocked fetch. */
import { afterEach, describe, expect, it, vi } from 'vitest';

const payload = Buffer.from(JSON.stringify({ sub: 'user-1' })).toString('base64url');
const TOKEN = `h.${payload}.s`;

vi.mock('@/state/auth', () => ({
  CLOUD: true,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_KEY: 'anon',
  getAccessToken: async () => TOKEN,
}));

const urls: string[] = [];

const msg = (id: number) => ({ id, conversation_id: 'c1', sender_id: 'user-2', body: `m${id}`, created_at: '2026-11-27T10:00:00Z' });

/** A server holding messages 1..total; `failAt`: the request number (0-based) that fails. */
function server(total: number, failAt?: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const n = urls.length;
      urls.push(url);
      if (n === failAt) throw new TypeError('Network request failed');
      const q = new URL(url).searchParams;
      const after = Number(q.get('id')?.replace('gt.', '') ?? 0);
      const limit = Number(q.get('limit'));
      const rows = [];
      for (let id = after + 1; id <= total && rows.length < limit; id++) rows.push(msg(id));
      return new Response(JSON.stringify(rows), { status: 200 });
    }),
  );
}

afterEach(() => {
  urls.length = 0;
  vi.unstubAllGlobals();
});

describe('listMessagesSince', () => {
  it('asks oldest first after the given id', async () => {
    const api = await import('@/chat/api');
    server(12);
    const r = await api.listMessagesSince('c1', 10);
    expect(r).toEqual({ messages: [msg(11), msg(12)], more: false });
    expect(urls).toEqual([
      'https://example.supabase.co/rest/v1/messages?conversation_id=eq.c1&id=gt.10&select=id,conversation_id,sender_id,body,created_at&order=id.asc&limit=50',
    ]);
  });

  it('pages forward past 50 so a long gap loses nothing', async () => {
    const api = await import('@/chat/api');
    server(130);
    const r = await api.listMessagesSince('c1', 0);
    expect(r.more).toBe(false);
    expect(r.messages.map((m) => m.id)).toEqual(Array.from({ length: 130 }, (_, i) => i + 1));
    expect(urls.map((u) => new URL(u).searchParams.get('id'))).toEqual(['gt.0', 'gt.50', 'gt.100']);
  });

  it('reads one more page when the last full page ends the gap', async () => {
    const api = await import('@/chat/api');
    server(100);
    const r = await api.listMessagesSince('c1', 0);
    expect(r).toMatchObject({ more: false });
    expect(r.messages).toHaveLength(100);
    expect(urls).toHaveLength(3); // the third page is empty
  });

  it('stops after the page cap and says there is more', async () => {
    const api = await import('@/chat/api');
    server(1000);
    const r = await api.listMessagesSince('c1', 0);
    expect(urls).toHaveLength(api.CATCH_UP_MAX_PAGES);
    expect(r.messages).toHaveLength(api.CATCH_UP_MAX_PAGES * api.PAGE);
    expect(r.more).toBe(true);
    urls.length = 0;
    const next = await api.listMessagesSince('c1', r.messages[r.messages.length - 1].id, 2);
    expect(next.messages[0].id).toBe(api.CATCH_UP_MAX_PAGES * api.PAGE + 1);
    expect(urls).toHaveLength(2);
  });

  it('keeps the pages it got when a later page fails', async () => {
    const api = await import('@/chat/api');
    server(130, 1);
    const r = await api.listMessagesSince('c1', 0);
    expect(r.more).toBe(true);
    expect(r.messages.map((m) => m.id)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('throws when the first page fails', async () => {
    const api = await import('@/chat/api');
    server(10, 0);
    await expect(api.listMessagesSince('c1', 0)).rejects.toMatchObject({ code: 'network' });
  });

  it('returns nothing when there is nothing new', async () => {
    const api = await import('@/chat/api');
    server(5);
    expect(await api.listMessagesSince('c1', 5)).toEqual({ messages: [], more: false });
    expect(urls).toHaveLength(1);
  });
});

describe('listMessages', () => {
  it('still loads older pages newest first', async () => {
    const api = await import('@/chat/api');
    server(0);
    await api.listMessages('c1', { before: 70 });
    expect(urls[0]).toBe('https://example.supabase.co/rest/v1/messages?conversation_id=eq.c1&id=lt.70&select=id,conversation_id,sender_id,body,created_at&order=id.desc&limit=50');
  });
});
