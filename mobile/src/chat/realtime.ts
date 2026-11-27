/**
 * Live chat messages over Supabase Realtime (Phoenix channels on a WebSocket), no SDK.
 *
 * One shared socket; each subscription joins a channel that listens for INSERTs on
 * public.messages (optionally for one conversation). Realtime checks the table's select policy
 * with the user's token, so only messages of the user's own conversations arrive.
 *
 * The socket sends a heartbeat every 25 s, reconnects with a growing delay (1 s up to 30 s)
 * and re-joins every channel with a fresh token. It closes when nothing is subscribed.
 * After a reconnect, `onRejoin` tells the screen to fetch what it missed while the socket was
 * down. Screens still poll now and then, so a missed event only delays a message.
 */
import { getAccessToken, SUPABASE_KEY, SUPABASE_URL } from '@/state/auth';

import { chatAvailable, type Message } from './api';

type Sub = { topic: string; filter?: string; onInsert: (m: Message) => void; onRejoin?: () => void; joinRef?: string };

const HEARTBEAT_MS = 25_000;

let ws: WebSocket | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let backoff = 1000;
let ref = 0;
let seq = 0;
const subs = new Map<string, Sub>();

const nextRef = () => String(++ref);

function send(msg: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

async function join(sub: Sub) {
  const token = await getAccessToken();
  if (!token) return;
  sub.joinRef = nextRef();
  send({
    topic: sub.topic,
    event: 'phx_join',
    ref: sub.joinRef,
    join_ref: sub.joinRef,
    payload: {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
        postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'messages', ...(sub.filter ? { filter: sub.filter } : {}) }],
        private: false,
      },
      access_token: token,
    },
  });
}

function stop() {
  if (heartbeat) clearInterval(heartbeat);
  if (retry) clearTimeout(retry);
  heartbeat = null;
  retry = null;
  const s = ws;
  ws = null;
  s?.close();
}

function connect() {
  if (ws || !chatAvailable() || !subs.size) return;
  const url = `${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
  const socket = new WebSocket(url);
  ws = socket;
  socket.onopen = () => {
    backoff = 1000;
    subs.forEach((s) => {
      // Joined on an earlier socket: events may have been missed while it was down.
      const rejoin = s.joinRef !== undefined;
      void join(s).then(() => {
        if (rejoin) s.onRejoin?.();
      });
    });
    heartbeat = setInterval(() => {
      send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: nextRef() });
      // Keep the token on the channels fresh (tokens last about an hour).
      void getAccessToken().then((t) => {
        if (t) subs.forEach((s) => send({ topic: s.topic, event: 'access_token', payload: { access_token: t }, ref: nextRef() }));
      });
    }, HEARTBEAT_MS);
  };
  socket.onmessage = (e) => {
    let msg: { topic?: string; event?: string; payload?: { data?: { type?: string; record?: Message } } };
    try {
      msg = JSON.parse(String(e.data));
    } catch {
      return;
    }
    if (msg.event !== 'postgres_changes') return;
    const record = msg.payload?.data?.record;
    if (msg.payload?.data?.type !== 'INSERT' || !record) return;
    subs.forEach((s) => {
      if (s.topic === msg.topic) s.onInsert(record);
    });
  };
  socket.onclose = () => {
    if (ws !== socket) return; // closed on purpose
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    ws = null;
    if (!subs.size) return;
    retry = setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };
  socket.onerror = () => socket.close();
}

/**
 * Calls `onInsert` for each new message: of one conversation, or of all the user's
 * conversations when `conversationId` is left out. `onRejoin` runs after the socket reconnects,
 * so the caller can catch up on messages sent while it was down. Returns an unsubscribe function.
 */
export function subscribeMessages(onInsert: (m: Message) => void, conversationId?: string, onRejoin?: () => void): () => void {
  if (!chatAvailable()) return () => {};
  const key = `${++seq}`;
  const sub: Sub = {
    topic: `realtime:kesefly-chat-${conversationId ?? 'inbox'}-${key}`,
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    onInsert,
    onRejoin,
  };
  subs.set(key, sub);
  if (ws?.readyState === WebSocket.OPEN) void join(sub);
  else connect();
  return () => {
    subs.delete(key);
    send({ topic: sub.topic, event: 'phx_leave', payload: {}, ref: nextRef(), join_ref: sub.joinRef });
    if (!subs.size) stop();
  };
}
