-- Kesefly user chat: 1:1 and group chats between users, found by @username.
--
-- Run once in the Supabase project: Dashboard > SQL Editor > paste this file > Run
-- (or `supabase db push` with the Supabase CLI). Needs Supabase Auth (the app's cloud accounts).
--
-- Security model (Row Level Security on every table):
--   - profiles: every signed-in user can read usernames and display names (needed for search);
--     each user can create and change only their own profile.
--   - conversations / members / messages: readable only by members of that conversation.
--   - messages: a member can send only as themselves.
--   - Conversations and memberships are created only through the functions below
--     (security definer), which check the caller. There are no direct insert policies.
-- Live updates: messages are added to the supabase_realtime publication; Realtime applies the
-- same select policy, so a user only receives messages of their own conversations.

-- ---------- Tables ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 40),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text check (title is null or char_length(title) between 1 and 60),
  -- 1:1 chats only: "<smaller uuid>:<larger uuid>", so a pair has at most one chat.
  direct_key text unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, id desc);

-- ---------- Helpers ----------

-- Security definer so policies can ask "is the caller a member?" without recursing into the
-- members table's own policy.
create or replace function public.is_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id = auth.uid()
  );
$$;

-- Keep conversations.last_message_at current (sorts the chat list).
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations
  for select to authenticated using (public.is_member(id));

drop policy if exists "members read members" on public.conversation_members;
create policy "members read members" on public.conversation_members
  for select to authenticated using (public.is_member(conversation_id));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages
  for select to authenticated using (public.is_member(conversation_id));

drop policy if exists "members send as themselves" on public.messages;
create policy "members send as themselves" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_member(conversation_id));

-- ---------- Functions the app calls (POST /rest/v1/rpc/<name>) ----------

-- Open the 1:1 chat with another user, creating it the first time. Returns the conversation id.
create or replace function public.start_direct(other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  k text;
  conv uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if other is null or other = me then raise exception 'invalid user'; end if;
  if not exists (select 1 from public.profiles where id = other) then raise exception 'invalid user'; end if;
  k := least(me::text, other::text) || ':' || greatest(me::text, other::text);
  insert into public.conversations (is_group, direct_key, created_by)
    values (false, k, me)
    on conflict (direct_key) do nothing;
  select id into conv from public.conversations where direct_key = k;
  insert into public.conversation_members (conversation_id, user_id, role)
    values (conv, me, 'member'), (conv, other, 'member')
    on conflict do nothing;
  return conv;
end;
$$;

-- Create a group with the caller as admin. Returns the conversation id.
create or replace function public.create_group(group_title text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if group_title is null or char_length(btrim(group_title)) not between 1 and 60 then raise exception 'invalid title'; end if;
  if coalesce(array_length(member_ids, 1), 0) > 255 then raise exception 'too many members'; end if;
  insert into public.conversations (is_group, title, created_by) values (true, btrim(group_title), me) returning id into conv;
  insert into public.conversation_members (conversation_id, user_id, role) values (conv, me, 'admin');
  insert into public.conversation_members (conversation_id, user_id, role)
    select conv, p.id, 'member' from public.profiles p
    where p.id = any (member_ids) and p.id <> me
    on conflict do nothing;
  return conv;
end;
$$;

-- Add people to a group (admins only).
create or replace function public.add_group_members(conv uuid, member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversation_members m
    join public.conversations c on c.id = m.conversation_id
    where m.conversation_id = conv and m.user_id = auth.uid() and m.role = 'admin' and c.is_group
  ) then raise exception 'not allowed'; end if;
  insert into public.conversation_members (conversation_id, user_id, role)
    select conv, p.id, 'member' from public.profiles p where p.id = any (member_ids)
    on conflict do nothing;
end;
$$;

-- Leave a chat. A group with no members left is deleted. If the last admin leaves, the oldest
-- member becomes admin.
create or replace function public.leave_conversation(conv uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.conversation_members where conversation_id = conv and user_id = auth.uid();
  if not exists (select 1 from public.conversation_members where conversation_id = conv) then
    delete from public.conversations where id = conv;
  elsif not exists (select 1 from public.conversation_members where conversation_id = conv and role = 'admin') then
    update public.conversation_members set role = 'admin'
    where conversation_id = conv
      and user_id = (select user_id from public.conversation_members where conversation_id = conv order by joined_at limit 1);
  end if;
end;
$$;

-- Mark a chat as read up to now.
create or replace function public.mark_read(conv uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversation_members set last_read_at = now()
  where conversation_id = conv and user_id = auth.uid();
$$;

-- The caller's chat list in one call: newest first, with the last message and unread count.
-- For 1:1 chats, peer_* is the other person.
create or replace function public.my_conversations()
returns table (
  id uuid,
  is_group boolean,
  title text,
  peer_id uuid,
  peer_username text,
  peer_name text,
  member_count int,
  last_body text,
  last_sender uuid,
  last_at timestamptz,
  unread int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.is_group,
    c.title,
    peer.id,
    peer.username,
    peer.display_name,
    (select count(*)::int from public.conversation_members x where x.conversation_id = c.id),
    last.body,
    last.sender_id,
    coalesce(last.created_at, c.created_at),
    (select count(*)::int from public.messages u
      where u.conversation_id = c.id and u.created_at > me.last_read_at and u.sender_id <> auth.uid())
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select p.id, p.username, p.display_name
    from public.conversation_members o join public.profiles p on p.id = o.user_id
    where not c.is_group and o.conversation_id = c.id and o.user_id <> auth.uid()
    limit 1
  ) peer on true
  left join lateral (
    select m.body, m.sender_id, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.id desc limit 1
  ) last on true
  where me.user_id = auth.uid()
  order by c.last_message_at desc;
$$;

-- Only signed-in users may call the functions.
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.start_direct(uuid) from public, anon;
revoke execute on function public.create_group(text, uuid[]) from public, anon;
revoke execute on function public.add_group_members(uuid, uuid[]) from public, anon;
revoke execute on function public.leave_conversation(uuid) from public, anon;
revoke execute on function public.mark_read(uuid) from public, anon;
revoke execute on function public.my_conversations() from public, anon;
revoke execute on function public.touch_conversation() from public, anon, authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.start_direct(uuid) to authenticated;
grant execute on function public.create_group(text, uuid[]) to authenticated;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;
grant execute on function public.leave_conversation(uuid) to authenticated;
grant execute on function public.mark_read(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;

-- ---------- Live updates ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
