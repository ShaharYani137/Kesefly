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
1. **Merge PR #5 (PR checks)?** It adds one CI workflow that runs tests, typecheck and lint on PRs. It is read-only and uses no secrets. QA and security reviews passed, and its first GitHub run is green. **Recommendation: merge.** After that, the 10 queued fixes can ship as checked PRs. The alternative is to allow `registry.npmjs.org` in this scheduled task's cloud network settings.
2. **PR #2 (agent team): merge?** **Recommendation: yes.** The team still runs from `Shavit` until it is merged.
3. **PR #3 (web app): hold.** Security review failed (P-008): tokens, API keys and finance data are stored in plaintext localStorage. No change since this morning.
4. **P-003 / P-001 / P-002 (Supabase):** these are still waiting for your yes or no. **Recommendation:** yes to P-003 (lock message timestamps) and P-001 (verified badge by user id), then P-002 (blocking and rate limits).

**Done:** P-016, the PR checks workflow, in [#5](https://github.com/ShaharYani137/Kesefly/pull/5). Its first GitHub run is green: tests, typecheck and lint all pass on `main`'s code. It is waiting for your merge.

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

## 2026-11-24 morning

**Still blocked locally:** the cloud run still cannot reach the npm registry. The team now works around it by stacking each fix on PR #5, so the GitHub PR checks run on every agent PR. No human replies or merges since last evening.

**Waiting for you**
1. **Merge PR #5 (PR checks)?** **Recommendation: merge first.** PRs #6 and #7 are stacked on it.
2. **P-019: stop the confirmation email link from carrying sign-in tokens?** Today the link sends tokens to `kesefly://`, and another Android app could catch them. **Recommendation: yes.** Point the redirect to a plain https "Email confirmed, go back to the app" page. It is a Supabase auth setting plus a small app change.
3. **P-017: make the PIN lockout survive a force-quit, with longer waits?** Right now a force-quit resets the counter, so the 4-digit PIN can be guessed. **Recommendation: yes.**
4. **P-024: Android backup.** Holdings are included in Google backup by default. Turn backup off (private, but data is lost on a new phone) or keep it and say so? **Recommendation: turn off,** if cloud sync already covers restore.
5. **P-020 / P-021:** add "remove my data from this phone" on sign-out, and stop the AI "auto" mode from trying your key with other companies. **Recommendation: yes to both.**
6. **Still open from before:** PR #2 (agent team) merge, PR #3 (web app) hold, P-001 / P-002 / P-003 (Supabase chat fixes).

**Done (awaiting your merge, after #5)**
- P-012: "0,5" is now read as 0.5, not 5, and typed "12." stays. [#6](https://github.com/ShaharYani137/Kesefly/pull/6). QA static PASS; GitHub checks green (tests, typecheck, lint). Please try "0,5" shares on a phone.
- P-004: news opens only http(s) links. [#7](https://github.com/ShaharYani137/Kesefly/pull/7). QA static PASS, security PASS, GitHub checks green.

**Security:** P-019 medium (tokens in the confirmation link), P-017 medium (PIN brute-force after force-quit), P-018 low (screen readers and app switcher can see behind the lock), P-020 low, P-021 low, P-024 medium (Android backup).

**Approved since last update:** P-018 hide the app behind the lock from screen readers and the app switcher · P-022 Android notification permission flow · P-023 widget shows when prices are old, plus an RTL fix · P-026 M3 tab bar colours · P-027 small link follow-ups after #7. Needs-human: P-017, P-019, P-020, P-021, P-024, P-025 (release signing key, only before a store release).

**Next:** implement P-018 and P-022. Next audit: connectivity-engineer + product-ux.

## 2026-11-24 evening

**Still blocked locally:** the cloud run still cannot reach the npm registry. Fixes are stacked on PR #5, so GitHub runs the checks on every agent PR. No human replies or merges since this morning.

**Waiting for you**
1. **Merge PR #5 (PR checks) first?** **Recommendation: merge.** Four checked fixes (#6, #7, #8, #9) are stacked on it and are ready after it.
2. **P-019: stop the confirmation email link from carrying sign-in tokens?** **Recommendation: yes,** with an https "Email confirmed" page. This is still the top security item.
3. **P-017: make the PIN lockout survive a force-quit?** **Recommendation: yes.**
4. **P-039: block screenshots and the Android Recents preview (FLAG_SECURE, new package `expo-screen-capture`)?** Tonight's app switcher cover is not reliable on Android. **Recommendation: yes,** unless you want users to be able to screenshot their numbers.
5. **P-024: Android backup on or off?** **Recommendation: off,** if cloud sync covers restore.
6. **Still open:** P-020 and P-041 (what sign-out keeps on the phone), P-021 (AI auto mode), P-001 / P-002 / P-003 (Supabase chat), P-029 (server de-duplication of chat messages), PR #2 (agent team) merge, and PR #3 (web app) hold.

**Done (awaiting your merge, after #5)**
- P-018: while locked, screen readers can't reach the app, the app switcher shows a cover, and iOS lock-screen widgets hide money values. [#8](https://github.com/ShaharYani137/Kesefly/pull/8). QA and security PASS. GitHub checks are green after a typecheck fix. Please test with VoiceOver and TalkBack.
- P-022: the app explains before it asks for notification permission, offers "Turn on in Settings" once the phone can't ask again, stops chat alert polling when alerts are off, and removes old Android channels. [#9](https://github.com/ShaharYani137/Kesefly/pull/9). QA and security PASS, GitHub checks green. Please test on Android 13+.
- From before: P-012 [#6](https://github.com/ShaharYani137/Kesefly/pull/6), P-004 [#7](https://github.com/ShaharYani137/Kesefly/pull/7), P-016 [#5](https://github.com/ShaharYani137/Kesefly/pull/5).
- #8 and #9 conflict in one import line and the action log. Keep both sides.

**Security:** P-040 low (dialogs show above the lock screen and stay tappable), P-041 low (the last account's chat marks survive sign-out), and P-039 (Android preview, see above). The P-018 and P-022 reviews passed.

**Approved since last update**
- P-028: chat sends no longer duplicate, and failed sends are kept.
- P-030: news alerts are not lost after time offline.
- P-031: news is kept offline, with an "as of" time.
- P-032: news refreshes every 5 min, not every 1.
- P-033: polls pause while offline.
- P-034: each chat message gets its own text direction.
- P-035: remove the "advice group" wording from chat.
- P-036: not-advice line in Helper, and fixed wording on the debt answer.
- P-037: Israeli surtax note on the Tax screen.
- P-038: chips announce "selected" to screen readers.
- P-040: close dialogs while locked.

**Next:** implement P-035 and P-036 (copy and framing). Next audit: security-guardian + performance-engineer.

## 2026-11-25 morning

**Still blocked locally:** the cloud run still cannot reach the npm registry, so fixes stay stacked on PR #5 and GitHub runs the checks. No human replies or merges since last evening.

**Waiting for you**
1. **Merge PR #5 (PR checks) first?** **Recommendation: merge.** Five checked fixes (#6–#10) are stacked on it.
2. **P-019: stop the confirmation email link from carrying sign-in tokens?** **Recommendation: yes,** with an https "Email confirmed" page. Still the top security item.
3. **P-017: make the PIN lockout survive a force-quit?** **Recommendation: yes.**
4. **P-039: block screenshots and the Android Recents preview (`expo-screen-capture`)?** **Recommendation: yes.**
5. **P-024: Android backup on or off?** **Recommendation: off,** if cloud sync covers restore.
6. **P-048 (new): shorten the ~2 s intro on every cold start?** Full intro only on the first launch after install or update, a short fade otherwise, tap to skip. **Recommendation: yes,** unless the intro is part of the brand you want every time.
7. **Still open:** P-020 / P-041 (what sign-out keeps), P-021 (AI auto mode), P-001 / P-002 / P-003 (Supabase chat), P-029 (server de-duplication), PR #2 (agent team) merge, PR #3 (web app) hold.

**Done (awaiting your merge, after #5)**
- P-035 + P-036: chat no longer suggests an "advice group"; Helper tab gets the not-advice line; the debt answer no longer promises "15%+, better than any fund"; Hebrew "Review my portfolio" label fixed. [#10](https://github.com/ShaharYani137/Kesefly/pull/10). QA static PASS; GitHub checks green (tests, typecheck, lint).
- From before: P-018 [#8](https://github.com/ShaharYani137/Kesefly/pull/8), P-022 [#9](https://github.com/ShaharYani137/Kesefly/pull/9), P-012 [#6](https://github.com/ShaharYani137/Kesefly/pull/6), P-004 [#7](https://github.com/ShaharYani137/Kesefly/pull/7), P-016 [#5](https://github.com/ShaharYani137/Kesefly/pull/5).

**Security**
- P-042 medium impact, low-risk fix: the APK/IPA build jobs hold a GitHub token that can publish releases while running every npm install script. One bad package could swap the public download. Fix: read-only builds, a separate release job, actions pinned by SHA.
- P-043 low: a web page Claude reads can save a hidden "memory" that steers every later chat (e.g. "always call XYZ a buy"). Fix: no memory saves in a turn that used web search.
- Checked and clean: AI keys stay in SecureStore, no logging of personal data, CSV import is paste-only.

**Approved since last update**
- P-042: lock down release workflow permissions.
- P-043: block memory saves after web search.
- P-044: cache number and date formatters (about 40x faster per label).
- P-045: typing in chat stops re-rendering every message (after P-028/P-034).
- P-046: Helper typewriter re-renders one bubble, not the whole screen.
- P-047: clocks and lab polls pause when their screen is hidden.
- P-049: remove the remaining "guaranteed return" claims (idea card, academy).

**Next:** implement P-042 and P-043 (security first). Next audit: connectivity-engineer + qa-tester.

## 2026-11-25 evening

**Still blocked locally:** the cloud run still cannot reach the npm registry, so fixes stay stacked on PR #5 and GitHub runs the checks. No human replies or merges since this morning.

**Waiting for you**
1. **Merge PR #5 (PR checks) first?** **Recommendation: merge.** Seven checked fixes (#6–#12) are stacked on it.
2. **P-019: stop the confirmation email link from carrying sign-in tokens?** **Recommendation: yes,** with an https "Email confirmed" page. Still the top security item.
3. **P-054 (new): chat says "Sign in again" when you are only offline, and a lost token refresh can silently kill cloud chat?** Tell "no network" apart from "token revoked", and use one shared refresh. **Recommendation: yes** (session handling, so it needs you).
4. **P-060 (new): after a web search, should the AI ask "Save to memory?" before saving?** This closes the gap that #12 leaves across turns. **Recommendation: yes, a one-tap confirm.**
5. **P-017 (PIN lockout survives force-quit), P-039 (block screenshots on Android), P-024 (Android backup off), P-048 (shorter intro):** recommendations unchanged (yes / yes / off / yes).
6. **Still open:** P-020 / P-041 (what sign-out keeps), P-021 (AI auto mode), P-001 / P-002 / P-003 (Supabase chat), P-029, PR #2 (agent team) merge, PR #3 (web app) hold.

**Done (awaiting your merge, after #5)**
- P-042: build jobs can no longer publish or replace releases. Only a separate release job can write; actions are pinned by SHA, and each APK/IPA gets a SHA-256 file. [#11](https://github.com/ShaharYani137/Kesefly/pull/11). qa-tester and security-guardian PASS (static); GitHub checks green. Before merging, run Android build once with workflow_dispatch on the branch.
- P-043: the AI can no longer save a memory in a turn where it read the web, and the prompt forbids buy/sell notes. [#12](https://github.com/ShaharYani137/Kesefly/pull/12). qa-tester PASS (9 tests passed against the real SDK in a scratch harness), security-guardian PASS. GitHub checks green.
- From before: P-035 + P-036 [#10](https://github.com/ShaharYani137/Kesefly/pull/10), P-018 [#8](https://github.com/ShaharYani137/Kesefly/pull/8), P-022 [#9](https://github.com/ShaharYani137/Kesefly/pull/9), P-012 [#6](https://github.com/ShaharYani137/Kesefly/pull/6), P-004 [#7](https://github.com/ShaharYani137/Kesefly/pull/7), P-016 [#5](https://github.com/ShaharYani137/Kesefly/pull/5).

**Security**
- Medium, inherent: a poisoned npm or Gradle dependency can still ship a bad APK. #11 stops it from replacing releases, but the checksum only proves the file did not change between the build and release jobs.
- Low: P-060 (see above). Low: P-061, pin the PR-checks actions too.

**Approved since last update**
- P-050: AI replies time out after 45 s of silence and stop when you leave the chat.
- P-051: other AI providers retry busy errors; a clear "no credit left" message.
- P-052: the iOS widget no longer drops a holding from the total or writes too late.
- P-053: the Android widget "Updated" time no longer freezes because of one symbol.
- P-055: CSV import reads "182,50" correctly (today the cost comes out 100× too high), does not skip IBKR trades silently, and adds tests.
- P-056: US tax rule for a sale on the one-year anniversary across Feb 29 (today the tax shows as half).
- P-057: tests for positions, projection and portfolio totals.
- P-058: one market-holiday list, with Yom Ha'atzmaut checked at TASE and a reminder when the list runs out.
- P-059: EN/HE string parity test.
- P-061: pin the PR-checks actions.

**Next:** implement P-055 (CSV money bug) and P-056 (tax). Next audit: security-guardian + ios-specialist.
