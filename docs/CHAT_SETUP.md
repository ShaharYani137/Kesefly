# User chat: connect Supabase

The chat code is in the app. It starts working once a Supabase project is connected.
Until then, the Chats page explains that chat needs a cloud account.

## 1. Create the project

1. Create a project at supabase.com.
2. Turn on email sign-in: Authentication > Providers > Email.

## 2. Create the chat tables

1. Open Dashboard > SQL Editor.
2. Paste `supabase/migrations/20261121000000_user_chat.sql` and click Run.

The migration creates these tables:

| Table | Holds |
|---|---|
| `profiles` | @username and name |
| `conversations` | 1:1 and group chats |
| `conversation_members` | who is in each chat, and what they read |
| `messages` | the messages |

Row Level Security is on for all of them. The migration also creates the app's functions (`start_direct`, `create_group`, `add_group_members`, `leave_conversation`, `mark_read`, `my_conversations`). Finally, it adds `messages` to Realtime for live delivery.

You can run it again safely. It skips or replaces what already exists.

## 3. Connect the app

Copy the two values from Settings > API:

- Local builds: put them in `mobile/.env.local`. Do not put them in `.env.example`, which is committed.
- GitHub builds: add them as repository variables (Settings > Secrets and variables > Actions > Variables).

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

The anon key is public by design. Never use the `service_role` key in the app.

Rebuild the app (`npm run apk`, or the GitHub workflow). Accounts made in device mode cannot chat. Create a new account after connecting.

## 4. Check it

1. Use two phones, or one phone plus a second account.
2. Open Home > chat button and pick a @username on each.
3. Start a 1:1 chat, then a group.
4. A message from one side should appear on the other within a second (live). If live updates are down, it appears within 15 seconds (catch-up check).

## How it works

| Piece | File |
|---|---|
| REST client (fetch, no SDK) | `mobile/src/chat/api.ts` |
| Live updates (Realtime WebSocket, no SDK) | `mobile/src/chat/realtime.ts` |
| Screens | `mobile/src/app/chats/index.tsx` (list), `new.tsx` (find people, create group), `[id].tsx` (chat) |
| Shared UI | `mobile/src/ui/chat-ui.tsx` |

## Not in this version

- Push notifications for new messages. They need a server-side sender, such as a Supabase Edge Function with Expo push.
- Blocking and reporting users.
- Images and files.
- Editing and deleting messages.
