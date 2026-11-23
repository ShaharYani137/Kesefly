# Proposals register

Kept by the **boss** agent (`.claude/agents/boss.md`). Every specialist proposal gets an ID here before any code changes. Rules: `.claude/TEAM_RULES.md`.

Status: `proposed` → `approved` / `rejected` / `needs-human` → `in-progress` → `done`.

| ID | Date | Agent | Title | Risk | Status | Decision note | PR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-001 | 2026-11-23 | security-guardian | Verified badge keyed on a username anyone can take (`VERIFIED_USERNAMES`, chat-ui.tsx:19-27): move verification to the server by user id, reserve names | low | needs-human | Supabase schema/RLS change (human gate). Real impersonation risk in a finance chat | — |
| P-002 | 2026-11-23 | security-guardian | Chat abuse: anyone can add any user to chats, `start_direct` re-adds a user who left; add blocks table, refuse left/blocked pairs, rate-limit messages | medium | needs-human | Supabase functions/RLS change (human gate) | — |
| P-003 | 2026-11-23 | security-guardian | Clients can set `messages.created_at` (insert grant covers all columns), pinning a chat on top / fake times; limit insert grant to `(conversation_id, body)` or force `now()` | low | needs-human | Supabase grant change (human gate). Small and recommended | — |
| P-004 | 2026-11-23 | security-guardian | News links opened without a scheme check (`news.ts`, `lab/setup/[symbol].tsx:160`); keep only `https?://` links | low | approved | Low risk, no gate, has unit-test plan; matters before any web build ships. Queued: build checks could not run this cycle | — |
| P-005 | 2026-11-23 | performance-engineer | Build csv-import TASE lookup maps (4,256 rows, ~11 ms in V8) on first use instead of at module load | low | approved | Same behaviour, less work at load. Queued: build checks could not run this cycle | — |
| P-006 | 2026-11-23 | performance-engineer | Pre-normalise TASE names once in `search.ts` (4.5 ms → 0.15 ms per search in V8); add `searchSymbols` tests first | low | approved | Clear gain, tests written against current code first. Queued | — |
| P-007 | 2026-11-23 | performance-engineer | Chat list: poll and Realtime only while focused, fetch profile on focus only, coalesce Realtime bursts (~500 ms, design decision) | low | approved | Cuts ~4 req/min plus 2 per message while in a room; touches chat network, so security-guardian reviews too. Queued | — |
| P-008 | 2026-11-23 | security-guardian | Review of PR #3 (web app on GitHub Pages): FAIL. Session tokens, AI key, PIN hash and all financial data in plaintext localStorage on the shared `shaharyani137.github.io` origin; sign-out leaves data behind; web PIN lock is not real protection; no CSP; build job lacks `permissions:` | high | needs-human | New place for personal/financial data (human gate). Recommend: do not merge #3 until findings 1–3 are fixed | [#3](https://github.com/ShaharYani137/Kesefly/pull/3) |
