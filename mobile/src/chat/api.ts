/**
 * User chat over Supabase REST (PostgREST + the functions in
 * supabase/migrations/20261121000000_user_chat.sql). No SDK: plain fetch, like state/auth.tsx.
 *
 * Every call runs as the signed-in cloud account (its access token); Row Level Security on the
 * server decides what the user may read and write. Nothing here is stored on the phone.
 */
import { isAllowedChatName } from '@/chat/names';
import { CLOUD, getAccessToken, SUPABASE_KEY, SUPABASE_URL } from '@/state/auth';

export type ChatErrorCode = 'offline' | 'signedOut' | 'network' | 'taken' | 'invalid' | 'notSetUp';

export class ChatError extends Error {
  constructor(public code: ChatErrorCode) {
    super(code);
  }
}

export type Profile = { id: string; username: string; display_name: string };

export type Conversation = {
  id: string;
  is_group: boolean;
  title: string | null;
  peer_id: string | null;
  peer_username: string | null;
  peer_name: string | null;
  member_count: number;
  last_body: string | null;
  last_sender: string | null;
  last_at: string;
  unread: number;
};

export type Message = { id: number; conversation_id: string; sender_id: string; body: string; created_at: string };

export type Member = { user_id: string; role: 'admin' | 'member'; profile: Profile | null };

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const MAX_BODY = 4000;

/** Chat works only with cloud accounts (Supabase configured at build time). */
export const chatAvailable = () => CLOUD;

/** The user id inside the access token (JWT `sub`). */
function userIdOf(token: string): string {
  const part = token.split('.')[1] ?? '';
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return (JSON.parse(atob(b64)) as { sub: string }).sub;
}

export async function myUserId(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new ChatError('signedOut');
  return userIdOf(token);
}

async function request<T>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  if (!CLOUD) throw new ChatError('offline');
  const token = await getAccessToken();
  if (!token) throw new ChatError('signedOut');
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: init.method ?? 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ChatError('network');
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (json ?? {}) as { code?: string; message?: string };
    if (err.code === '23505') throw new ChatError('taken'); // unique violation (username)
    // Migration not run (42P01, PGRST202, PGRST205), or the tables have no grants for signed-in users (42501).
    if (err.code === '42P01' || err.code === 'PGRST202' || err.code === 'PGRST205' || err.code === '42501') throw new ChatError('notSetUp');
    if (res.status === 401) throw new ChatError('signedOut');
    if (res.status >= 500) throw new ChatError('network');
    throw new ChatError('invalid');
  }
  return json as T;
}

const rpc = <T>(name: string, args: Record<string, unknown> = {}) => request<T>(`rpc/${name}`, { method: 'POST', body: args });
const enc = encodeURIComponent;

/* ---------- Profile ---------- */

export async function getMyProfile(): Promise<Profile | null> {
  const id = await myUserId();
  const rows = await request<Profile[]>(`profiles?id=eq.${id}&select=id,username,display_name`);
  return rows[0] ?? null;
}

/** Create or change the user's own profile. Username: 3-20 of a-z, 0-9, _. */
export async function saveProfile(username: string, displayName: string): Promise<Profile> {
  const name = username.trim().toLowerCase();
  if (!USERNAME_RE.test(name)) throw new ChatError('invalid');
  // Screens check the name first and show why (chat/names.ts); this is the last line of defence.
  if (!isAllowedChatName(displayName)) throw new ChatError('invalid');
  const id = await myUserId();
  const rows = await request<Profile[]>('profiles?on_conflict=id&select=id,username,display_name', {
    method: 'POST',
    body: { id, username: name, display_name: displayName.trim().slice(0, 40) },
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  return rows[0];
}

/** Users whose username or display name starts with the query (not the caller). */
export async function searchUsers(query: string): Promise<Profile[]> {
  const q = query.trim().replace(/^@/, '').toLowerCase();
  if (q.length < 2) return [];
  // PostgREST pattern: `*` is the wildcard. Keep only Latin letters, digits, _ and Hebrew
  // letters, so nothing can change the filter (spaces and commas would split the `or`).
  const safe = q.replace(/[^a-z0-9_א-ת]/g, '');
  if (!safe) return [];
  const me = await myUserId();
  return request<Profile[]>(
    `profiles?select=id,username,display_name&id=neq.${me}&or=(username.ilike.${enc(`${safe}*`)},display_name.ilike.${enc(`${safe}*`)})&order=username&limit=20`,
  );
}

/* ---------- Conversations ---------- */

export const listConversations = () => rpc<Conversation[]>('my_conversations');
export const startDirect = (other: string) => rpc<string>('start_direct', { other });
export async function createGroup(title: string, memberIds: string[]): Promise<string> {
  if (!isAllowedChatName(title)) throw new ChatError('invalid');
  return rpc<string>('create_group', { group_title: title.trim(), member_ids: memberIds });
}
export const addGroupMembers = (conv: string, memberIds: string[]) => rpc<void>('add_group_members', { conv, member_ids: memberIds });
export const leaveConversation = (conv: string) => rpc<void>('leave_conversation', { conv });
export const markRead = (conv: string) => rpc<void>('mark_read', { conv });

export async function getConversation(conv: string): Promise<{ is_group: boolean; title: string | null } | null> {
  const rows = await request<{ is_group: boolean; title: string | null }[]>(`conversations?id=eq.${conv}&select=is_group,title`);
  return rows[0] ?? null;
}

export async function listMembers(conv: string): Promise<Member[]> {
  const rows = await request<{ user_id: string; role: Member['role'] }[]>(`conversation_members?conversation_id=eq.${conv}&select=user_id,role`);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.user_id).join(',');
  const profiles = await request<Profile[]>(`profiles?id=in.(${ids})&select=id,username,display_name`);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
}

/* ---------- Messages ---------- */

const PAGE = 50;

/** Newest first. `before`: load older than this message id. `after`: only newer (catch-up). */
export function listMessages(conv: string, opts: { before?: number; after?: number } = {}): Promise<Message[]> {
  const range = opts.before ? `&id=lt.${opts.before}` : opts.after ? `&id=gt.${opts.after}` : '';
  return request<Message[]>(`messages?conversation_id=eq.${conv}${range}&select=id,conversation_id,sender_id,body,created_at&order=id.desc&limit=${PAGE}`);
}

export async function sendMessage(conv: string, body: string): Promise<Message> {
  const text = body.trim();
  if (!text || text.length > MAX_BODY) throw new ChatError('invalid');
  const rows = await request<Message[]>('messages?select=id,conversation_id,sender_id,body,created_at', {
    method: 'POST',
    body: { conversation_id: conv, body: text },
    prefer: 'return=representation',
  });
  return rows[0];
}
