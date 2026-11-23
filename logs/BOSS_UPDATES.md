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

## 2026-11-23 evening

**Still blocked:** the cloud run still cannot reach the npm registry, so app code cannot be type-checked or tested here. To work around this, the team opened PR #5, which runs the checks on GitHub for every PR.

**Waiting for you**
1. **Merge PR #5 (PR checks)?** It adds one CI workflow that runs tests, typecheck and lint on PRs. It is read-only and uses no secrets. QA and security reviews passed. **Recommendation: merge.** After that, the 10 queued fixes can ship as checked PRs. The alternative is to allow `registry.npmjs.org` in this scheduled task's cloud network settings.
2. **PR #2 (agent team): merge?** **Recommendation: yes.** The team still runs from `Shavit` until it is merged.
3. **PR #3 (web app): hold.** Security review failed (P-008): tokens, API keys and finance data are stored in plaintext localStorage. No change since this morning.
4. **P-003 / P-001 / P-002 (Supabase):** these are still waiting for your yes or no. **Recommendation:** yes to P-003 (lock message timestamps) and P-001 (verified badge by user id), then P-002 (blocking and rate limits).

**In progress:** P-016, the PR checks workflow, in [#5](https://github.com/ShaharYani137/Kesefly/pull/5). It is done when its first GitHub run is green.

**Security:** no new findings. The P-016 review passed; one low, optional note is to pin actions by SHA.

**Approved since last update:**
- P-009: network calls time out instead of hanging.
- P-010: keep the last price when a refresh fails.
- P-011: chat reconnects after network changes and backgrounding.
- P-012: decimal input fix. "0,5" is currently saved as 5. Top priority.
- P-013: Hebrew Face ID prompt and iOS RTL. Needs a device test.
- P-014: 44pt touch targets.
- P-015: pin the iOS CI Xcode version.

**Next:** if #5 is merged or npm is reachable, implement P-012, then P-004. Next audit: security-guardian + android-specialist.
