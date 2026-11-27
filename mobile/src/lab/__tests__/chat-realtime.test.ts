/** Chat Realtime socket (chat/realtime.ts): `onRejoin` runs only when a channel re-joins on a new socket. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/state/auth', () => ({
  CLOUD: true,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_KEY: 'anon',
  getAccessToken: async () => 'token',
}));

type Sent = { topic: string; event: string; ref?: string; join_ref?: string };

/** Enough of a WebSocket for realtime.ts: the test opens and drops it by hand. */
class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static all: FakeSocket[] = [];
  readyState = FakeSocket.CONNECTING;
  sent: Sent[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as Sent);
  }
  close() {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  /** The server or network drops the connection. */
  drop() {
    this.close();
  }
  joins() {
    return this.sent.filter((m) => m.event === 'phx_join').map((m) => m.topic);
  }
}

const last = () => FakeSocket.all[FakeSocket.all.length - 1];
/** Lets the awaited token and the `.then` after each join run. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  FakeSocket.all = [];
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', FakeSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('subscribeMessages onRejoin', () => {
  it('does not run on the first join', async () => {
    const { subscribeMessages } = await import('@/chat/realtime');
    const onRejoin = vi.fn();
    const off = subscribeMessages(() => {}, 'c1', onRejoin);
    expect(FakeSocket.all).toHaveLength(1);
    last().open();
    await flush();
    expect(last().joins()).toHaveLength(1);
    expect(onRejoin).not.toHaveBeenCalled();
    off();
  });

  it('runs once after the socket reconnects, after the channel joined again', async () => {
    const { subscribeMessages } = await import('@/chat/realtime');
    const order: string[] = [];
    const first = () => FakeSocket.all[0];
    const onRejoin = vi.fn(() => order.push(`rejoin after ${last().joins().length} join(s)`));
    const off = subscribeMessages(() => {}, 'c1', onRejoin);
    first().open();
    await flush();
    first().drop();
    expect(FakeSocket.all).toHaveLength(1); // waits before reconnecting
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeSocket.all).toHaveLength(2);
    expect(onRejoin).not.toHaveBeenCalled(); // not before the new socket is open
    last().open();
    await flush();
    expect(onRejoin).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['rejoin after 1 join(s)']);
    off();
  });

  it('a channel first joined on the new socket does not rejoin; one without onRejoin is fine', async () => {
    const { subscribeMessages } = await import('@/chat/realtime');
    const roomRejoin = vi.fn();
    const inbox = subscribeMessages(() => {}); // like the chats inbox: no onRejoin
    last().open();
    await flush();
    last().drop();
    await vi.advanceTimersByTimeAsync(1000);
    // Opened a chat while the socket was down: it joins for the first time on the new socket.
    const room = subscribeMessages(() => {}, 'c2', roomRejoin);
    last().open();
    await flush();
    expect(last().joins()).toHaveLength(2);
    expect(roomRejoin).not.toHaveBeenCalled();
    room();
    inbox();
  });

  it('a channel joined on an open socket rejoins after a later drop', async () => {
    const { subscribeMessages } = await import('@/chat/realtime');
    const inbox = subscribeMessages(() => {});
    last().open();
    await flush();
    const onRejoin = vi.fn();
    const room = subscribeMessages(() => {}, 'c3', onRejoin); // joins at once on the open socket
    await flush();
    expect(last().joins()).toHaveLength(2);
    last().drop();
    await vi.advanceTimersByTimeAsync(1000);
    last().open();
    await flush();
    expect(onRejoin).toHaveBeenCalledTimes(1);
    room();
    inbox();
  });

  it('does not reconnect or rejoin after the last unsubscribe', async () => {
    const { subscribeMessages } = await import('@/chat/realtime');
    const onRejoin = vi.fn();
    const off = subscribeMessages(() => {}, 'c4', onRejoin);
    last().open();
    await flush();
    off();
    expect(last().readyState).toBe(FakeSocket.CLOSED);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all).toHaveLength(1);
    expect(onRejoin).not.toHaveBeenCalled();
  });
});
