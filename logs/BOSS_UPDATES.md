# Boss progress updates

Twice a day (morning and evening) the **boss** agent appends an update here and sends it to the team. Format: `.claude/agents/boss.md`, section "Twice-daily progress update".

## 2026-11-23 morning

**Blocked:** the npm registry was unreachable from the cloud run, so dependencies could not install and typecheck, lint and tests could not run. With no QA pass possible, no code was implemented this cycle. The 4 approved items are queued for the next run.

**Waiting for you**
1. **PR #3 (web app on GitHub Pages): merge or hold?** Security review FAILED (P-008). In the browser, sign-in tokens, AI API keys and all financial data sit in plaintext localStorage, shared by every site on `shaharyani137.github.io`, and stay there after sign-out. Recommendation: **hold.** Before merging: use a dedicated domain, delete data on web sign-out, and warn in the app (or drop the web PIN lock).
2. **P-003: lock message timestamps on the server?** Right now a sender can post a fake future date and pin a chat at the top. Recommendation: **yes.** It is a one-line grant change in Supabase, which you would run in the SQL editor.
3. **P-001: move the verified badge to the server?** Anyone who takes the username `shasha` gets the verified seal. Recommendation: **yes.** Store it by user id, and reserve that name now.
4. **P-002: add chat blocking and rate limits?** Anyone can pull any user into a chat, and leaving a 1:1 does not stop it. Recommendation: **yes, but after P-001/P-003.** It is medium effort.
5. **PR #2 (agent team) is still open.** Until it is merged, the team works from `Shavit`.

**Security:** P-008 high (web build data exposure), P-001 medium (badge impersonation), P-002 medium (chat spam/re-add), P-003 low (fake timestamps), P-004 low (unsafe news link scheme on web).

**Approved since last update:** P-004 news link scheme check · P-005 lazy CSV lookup maps · P-006 faster security search, with new tests · P-007 chat list stops polling when hidden.

**Next:** implement P-004 and P-006 if the npm registry is reachable, then audit connectivity-engineer + ios-specialist.
