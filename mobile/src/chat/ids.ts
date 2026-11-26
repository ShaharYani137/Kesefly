/** Chat ids are Postgres `uuid`s (`conversations.id`, supabase/migrations/20261121000000_user_chat.sql). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a well-formed chat id. Anything else is never sent to the server. */
export function isChatId(id: unknown): id is string {
  return typeof id === 'string' && UUID.test(id);
}
