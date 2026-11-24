# Session Log

One section per working session. Newest at bottom.

---

## Session 1 — 2026-11-07

**Goal:** Bootstrap project tooling before app work starts.

**Done:**
- Created `logs/ACTION_LOG.md` (per-action log) and `logs/SESSION_LOG.md` (this file).
- Installed project skills in `.claude/skills/`:
  - `caveman` (+ `ultracave`, `megacave` variants): terse communication style.
  - `apple-human-interface-guidelines`: full Apple HIG (172 pages) for iOS design.
  - `m3-expressive`: Material 3 Expressive guidance for Android design.
- Created `CLAUDE.md` with project rules (logging, skills, design systems).

**Decisions:**
- Skills installed project-scoped (not global) so they travel with the repo.
- Caveman installed as plain skills only; its plugin hooks (Node scripts) were not installed.
- M3 `visuals/` folder (496 MB of reference PNGs) skipped: too large, and Windows path-length errors. Text references are complete.

**Open items / next steps:**
- Define app scope: what investApp does, target platforms, tech stack (SwiftUI + Jetpack Compose, or cross-platform).
- Optional: `git init` the project.

---

## Session 2 — 2026-11-07

**Goal:** Define app scope. User wants a cross-platform (iOS + Android) app that guides and manages users in finance and stocks.

**Done:**
- Activated caveman communication mode.

**Decisions:**
- Management mode: recommend only. App suggests actions; user executes in own broker. No auto-trading.
- Income data: user types it in (v1). Bank/broker linking added later, opt-in.
- Launch markets: USA + Israel. Currencies: USD + ILS (NIS).
- App framework: React Native + Expo (TypeScript). Replaced Flutter at user request. iOS builds via EAS cloud, no Mac needed. Backend: Python FastAPI (confirmed).
- App languages: Hebrew + English (RTL required).
- Toolchain: Node upgraded 18.18.1 to 26.13.0 LTS (npm 11.20.0). Python 3.11.9 and git present.
- Created Expo project in `mobile/` (SDK 58, TypeScript). expo-doctor clean; 3 tsc errors in template web files.
- Created FastAPI backend in `backend/` (venv, `/health` endpoint, tested 200 OK).
- Android local builds: installed Zulu JDK 17 + Android Studio; set JAVA_HOME, ANDROID_HOME, platform-tools PATH.

**Open items / next steps:**
- User: run Android Studio setup wizard (downloads SDK), enable USB debugging, then `npx expo run:android`.
- Samsung phone: Auto Blocker blocks USB debugging. Turn off during dev, turn back on after.
- Android build hits Windows 260-char path limit. Applied: LongPathsEnabled=1, CMake 3.31.6 (ninja 1.12.1), arm64-only. Build 3 still failed; Windows restart needed for long-path setting.
- Connect mobile app to backend; pick market data provider (US + TASE).
- Replace template screens; set up i18n (Hebrew/English, RTL) and currency formatting (USD/ILS).
- Optional: `git init`.

---

## Session 3 — 2026-11-07

**Goal:** Build v1 of the app (replace Expo template with real screens).

**Done:**
- On-device engine (`mobile/src/engine/`): goal forecast with bad / likely / good ranges (10th / 50th / 90th percentile), chance to reach goal, monthly deposit needed; rule-based ideas (cash flow, high-interest debt, emergency fund, tax accounts US 401(k)/IRA and IL Keren Hishtalmut, goal gap, short horizon, stock/bond mix, fees).
- Hebrew + English strings, RTL via layout `direction` + explicit text alignment (no app restart needed to switch).
- USD / ILS formatting via `Intl.NumberFormat`.
- Screens: onboarding (6 steps, also used to edit), Home, Plan (chart + what-if steppers), Ideas, Learn (7 lessons), Settings (language, currency, edit, delete data).
- Native tab bar: SF Symbols on iOS, Material Symbols on Android.
- Data stored on device only (AsyncStorage).
- Checks: tsc 0 errors, eslint 0 problems, Android JS bundle exports, engine math verified.

**Decisions:**
- Engine runs on-device in v1 (offline, private). Backend reserved for market data and AI later.
- Risk assumptions (nominal, before fees/inflation/tax): careful 4% / 6% vol, balanced 6% / 11%, growth 8% / 16%.
- Ideas name fund types, not tickers.
- Design decisions not from refs: Android green seed palette, iOS card radius 10pt, button heights 50pt / 56dp, chart time axis stays left-to-right in Hebrew.

**Open items / next steps:**
- Restart Windows (long paths), connect phone, run `npx expo run:android`.
- Market data provider (US + TASE) and backend endpoints; "market" view.
- Unit tests for engine (add jest).
- Set real Android package id / iOS bundle id before first store build.
- Native tab labels do not reorder for RTL (platform limitation of `direction` approach); full RTL mirroring would need `I18nManager.forceRTL` + reload.

---

## Session 4 — 2026-11-07

**Goal:** Run the app on the user's physical Android phone (Samsung Android phone), then: rename to Kesefly, new icon, RTL fixes for Hebrew, Stocks section, helper-style look, offline AI helper chat, standalone release APK (no Expo Go, no Metro).

**Done:**
- Fixed Android build: CMake 3.22.1's ninja 1.10.2 failed on >260-char paths; `android/local.properties` now sets `cmake.dir` to CMake 3.31.6 (ninja 1.12.1).
- Renamed app to Kesefly (Hebrew in-app: כספלי); package/bundle id `com.kesefly.app`; new icon set (gold coin + rising arrow + wing on green), generator in `mobile/scripts/make_icon.py`.
- 5 tabs: Home, Helper, Plan, Stocks, Learn. Ideas + Settings moved to stack screens with back buttons.
- Home redesigned as helper: greeting, "Kesefly suggests" card, 5-point money check-up, quick-action chips.
- Offline helper chat (`engine/helper.ts`): bilingual keyword routing, answers from user's numbers, live quotes for tickers, refuses buy/sell advice. Tested 24 en/he questions in Node.
- Stocks tab: Finnhub key entry, watchlist (default SPY, VT, AAPL, MSFT, NVDA, TEVA, CHKP), expandable details, pull-to-refresh.
- RTL: native RTL off (`supportsRTL: false`); tab order reversed in Hebrew; back + send icons mirror; progress bars + charts stay LTR (M3 layout.md).
- 2 new lessons (stock price, diversification). tsc 0 errors, eslint 0 problems.
- `expo prebuild --platform android --clean` done.

**Decisions:**
- User answers: name **Kesefly**; "no Expo build" = standalone release APK (Expo libraries stay); chat = offline rule-based helper for now; stock data = Finnhub free API, user supplies key.

**Open items / next steps:**
- Release APK build (`gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a`) was stopped for low system memory. Rerun with other apps closed, then `adb install` and verify on phone (en + he screenshots).
- Uninstall old `com.anonymous.mobile` debug app from phone.
- Release is signed with the debug keystore: make a real upload keystore before Play Store.
- `expo prebuild --clean` wipes `android/local.properties`: re-add `cmake.dir` after each prebuild.

**Later in session 4:**
- Pushed project to GitHub (`ShaharYani137/Kesefly`); private data redacted from logs; repo email set to GitHub noreply.
- `npm run apk` (`mobile/scripts/build-apk.js`): build release APK, install, open.
- Stock prices switched from Finnhub (key) to Yahoo Finance (free, no key, includes Tel Aviv `.TA`; unofficial endpoint).
- Stock charts (react-native-svg), portfolio holdings with value and gain/loss, weekly local tip notifications (expo-notifications).
- Animated splash (coin spin, glow, rings, sparkles), M3 Expressive spring motion across screens, chat typing indicator, 10 new chat topics.
- Hebrew fixes verified on the phone: RLM for Android bidi, chips wrap, compact money, RTL page slides.

**Open items (updated):**
- Notifications verified on device by user (2026-11-07).
- Real upload keystore before Play Store.
- After any `expo prebuild`, re-create `android/local.properties` with `cmake.dir` (prebuild deletes it).

## Session 4b — 2026-11-07 (branch `Shavit`)

**Goal:** run Kesefly on an iPhone and add a home-screen icon.

**Work done:**
- Ran the app on iPhone through Expo dev server (LAN, `http://10.0.0.4:8081`); web version opened in Safari.
- Added `mobile/public/apple-touch-icon.png` (180×180) so iOS "Add to Home Screen" shows the Kesefly logo.
- Branches `Shavit` and `Shahar` created from `main` to split work; icon change made on `Shavit`.

**Decisions:**
- Use the `public/` root fallback (`/apple-touch-icon.png`) instead of a custom `+html.tsx`.

**Next steps:**
- Merge `Shavit` into `main` (pull request) when ready.
- For a home-screen web app that works without the PC: set `web.output` to `single`, `npx expo export --platform web`, host `dist/`.

---

## Session 5 — 2026-11-14

**Goal:** Economy/world-event notifications tied to the user's stocks; rebrand (keep name); sign-in + app lock; smarter chat on real data; more impressive Stocks page. Added during the session: Rubik font + RTL/LTR polish, market clocks and phone date (Gregorian + Hebrew) on Home, live "דקה אחר דקה" feed, learning program with level test, chat keyboard fix, network handling.

**Done:**
- Saved the DONE wrap-up command to memory.
- Brand v2: gold "K" monogram with rising-arrow arm on teal-to-midnight; new icon set, splash colors; M3 scheme from seed #0F7B6C; iOS tint brand teal; Rubik everywhere (per-weight families).
- Auth: Supabase REST accounts when `EXPO_PUBLIC_SUPABASE_*` set, else on-phone account; 4-digit PIN (salted SHA-256 in secure store), fingerprint/Face ID, relock after 60 s, lockout after 5 wrong PINs.
- Events: `engine/news.ts` (CNBC, MarketWatch, Globes RSS + Yahoo per-ticker news), categories, impact, tone, affected symbols, "why it matters"; events screen; Home live feed; background alerts every ~30 min + foreground every 10 min, ±3% holding moves.
- Home: phone time, Gregorian + Hebrew date, Wall Street + Tel Aviv clocks with open/closed countdown (`engine/clock.ts`, verified vs ICU 2020-2031).
- Chat: `engine/assistant.ts` live analysis (stock, compare, why, market, FX, news, hours, date, portfolio review, learning, follow-ups); keyboard fixed for Android edge-to-edge.
- Stocks: market strip, portfolio hero (value in user currency via USD/ILS, chart, allocation donut), holdings weights, watchlist sparklines + sort, new stock page.
- Academy: 12-question level test, 4 levels x 4 lessons (en + he) with quizzes, personal "for you" picks, XP, streak, knowledge score.
- Offline banner; explicit Android permissions (INTERNET, ACCESS_NETWORK_STATE, biometrics, notifications, boot).
- tsc 0, eslint 0. Assistant tested live in Node (27 en/he questions).

**Decisions:**
- User answers: keep name, new look; auth = account + biometric/PIN; smarter offline chat (no paid AI); on-phone background news check (no server).
- Rubik chosen over Assistant: one family for Hebrew + Latin.
- No Supabase project yet, so accounts run in device mode until keys are added to `mobile/.env.local`.

**Later in session 5 (after phone testing):**
- Fixed launch crash (R8 stripped WorkManager Room constructor) via expo-build-properties keep rules.
- Hebrew on English-language phones: per-paragraph RLM/LRM, RTL alert dialogs, notifications and biometric prompt; textAlign swap fix (RN Android swaps left/right in RTL layout); tab labels always shown; horizontal rows start at item 1 in Hebrew.
- Notifications follow app language (titles, foreign-story intro, channel names); live feed in Hebrew (Hebrew sources + machine-translated English headlines).
- Goal editor, portfolio lot editor, more Settings (theme, auto-lock, change PIN, alert scope/threshold/quiet hours, sounds per type, export data, reset learning).
- Chat: longer thinking animation with steps, typewriter, auto-scroll, composer with chips + send in one bar, web answers (Wikipedia), learning memory (name, favorites, thumbs feedback), conversation context and follow-up chips, small talk, "What is coming up?" calendar with scenarios.
- Home: portfolio card, markets at a glance, top movers, SVG US/Israel flags after exchange names.

- Android home-screen widget (portfolio value, Wall Street / Tel Aviv clocks with flags), verified on the phone after a React Compiler opt-out fix.
- Wrapped up with DONE: logs redacted, changes scanned, committed and pushed to origin/Shahar.
- Widget space use: full-width clock tiles, movers column beside the value (row count follows widget height), USD/ILS rate in header; with 1-2 holdings the movers card shows price + today's sparkline. Built, installed and checked on the phone.
- Widget keeps its numbers when the phone is locked or offline (last good quotes cached). Add holding by ticker, company name (English/Hebrew) or TASE security number. Built and installed; user to test search and locked-phone widget.
- Search covers every Tel Aviv security (2,239 from the TASE public list, by number / Hebrew / English) plus Yahoo for global stocks; mutual funds not included (no price source). Widget stocks card widened to half width.
- Branch `feature/funds-dividends` (for user review, not merged): mutual funds via Maya, currency/agorot price check, dividends + fees, sales with dates and realized profit (average cost). Built and installed.

**Open items / next steps:**
- Verify on phone: sound picker previews, "What is coming up?" chip.
- Widget refreshes about every 30 min (Android limit): clock times can lag; option to drop exact times or show market tiles when there are no holdings.
- iOS widget would need a native WidgetKit target.
- Bank of Israel decision dates and 2027 FOMC dates are not in the calendar yet.
- Create Supabase project for cloud accounts (optional).
- Background task timing is set by Android; alerts are not instant.
- TASE Friday close time approximate; holiday list covers 2026-2027 only.

## Session 6 — 2026-11-14

**Goal:** Build the "Top value (Israel + US investor)" features: tax view, pension + Keren Hishtalmut, broker CSV import, benchmark compare.

**Work done (branch `feature/top-value`):**
- Tax view (`app/tax.tsx`, `engine/tax.ts`): tax residence switch (Israel / US). Israel: 25% on gains with same-year loss offset, average cost. US: short/long-term by lot age (FIFO), user-picked rates, short/long netting, "turns long-term in N days" hint. Tax this year so far, tax if each holding or everything were sold today, losses that would cut this year's tax (with wash-sale / Form 1301 notes), dividend tax still due, W-8BEN check.
- Pension and savings (`app/savings.tsx`, `engine/savings.ts`): pension fund, study fund, provident fund, 401(k), IRA. Fee check (good / above good / legal max), fee cost until retirement, projection at 5%, study fund tax-free date, Har HaKesef / Mislaka tip. Linked from the Plan tab.
- Import from broker (`app/import.tsx`, `engine/csv-import.ts`): paste CSV; IBKR activity statement and generic tables with English or Hebrew headers; TASE security numbers and Hebrew names to symbols; agorot handling; preview, unreadable lines, duplicates skipped; one-tap import.
- Compare to an index (`app/compare.tsx`, `engine/benchmark.ts`): S&P 500, TA-125, Nasdaq-100, World (VT); same cash flows on the same days with historical USD/ILS; end value and XIRR for both.
- Stocks tab: "Portfolio tools" card (Tax view, Compare, Import).
- Checks: tsc 0, eslint 0, Node tests for all four engines pass, Yahoo daily history verified live for every benchmark.

**Decisions:**
- Israeli tax uses average cost (same as the ledger); US uses FIFO (IRS default). Gains are nominal at today's FX; screen explains the real-gain difference.
- US dividend withholding for Israeli residents: 25% with W-8BEN (treaty), 30% without.
- "Good fee" reference rates are a Kesefly design decision, labelled as such in code and UI.
- Import by pasted text in v1: no new native dependency.

**Next steps:**
- Build the APK and test the four screens on the phone (Hebrew and English).
- Optional: file picker for CSV (expo-document-picker, needs rebuild); test with real IBI / Meitav / Excellence exports and add header words they use.
- Optional: inflation-adjusted (real) gain for Israeli shekel assets using CPI.

**Later in session 6: iOS widget + APK**
- iOS WidgetKit widget via `@bacons/apple-targets` (`mobile/targets/widget/`): small, medium, large, lock screen. App writes data to App Group `group.com.kesefly.app` (`src/widget/ios.ts`); the widget fetches prices itself and falls back to the app's last numbers offline.
- Widgets (Android + iOS) now also refresh after sales, dividends and CSV imports.
- Release APK built from `feature/top-value`; phone was not connected, so not installed.
- iOS next steps: add `ios.appleTeamId` to `app.json`, run `eas build -p ios`; first Swift compile happens there. Register the App Group in the Apple developer account if EAS does not do it automatically.
## Session 6 — 2026-11-14 (branch `Shavit`)

**Goal:** run Kesefly on an iPhone as a standalone app (no Expo Go), from Windows.

**Work done:**
- Merged `main` (Kesefly v2) into `Shavit`.
- iOS adaptations: Android widget registration gated to Android; iOS `app.json` settings; config plugin removing the push entitlement.
- GitHub Actions workflow `iOS build` producing an unsigned `Kesefly.ipa` with the JS bundled in.
- README section for installing on iPhone with Sideloadly.

**Decisions:**
- Free route: GitHub-hosted Mac build + Sideloadly with a free Apple ID (7-day reinstall). Paid account / EAS left as an upgrade path.
- Local notifications only on iOS, so `aps-environment` is removed.

**Next steps:**
- Watch the first `iOS build` run; fix anything it reports.
- Install on the iPhone with Sideloadly and test Face ID, notifications and Hebrew layout.

**End of session 6: merge, Android CI, Compare fix**
- Merged `feature/top-value` (money tools + iOS widget) into main at 6ebba0d, together with the teammate's iPhone build (PR #1).
- Local APK builds failed on Windows paths (worktree folder name with `+`, then ninja mkdir errors in copied folders). Added GitHub Actions "Android build" (Linux): APK published as a pre-release (`android-build-N`). Build 1 and 2 installed on the phone, no crashes.
- Checked Compare on the phone: index chips were cut off and undated holdings got the wrong message. Fixed (wrapping chips, "N purchases need a date"); verified by screenshot. Comparison result not seen on device (no purchase dates in user data).

**Next steps:**
- Merge `feature/top-value` into main again (Compare fix + Android workflow are only on the branch).
- Update the main checkout (`git pull`) so local incremental builds (minutes) work again; optional: add Gradle + ccache caching to the Android workflow (~8-10 min runs).
- iOS: add `ios.appleTeamId`; check the iOS build workflow run for main 6ebba0d (widget's first compile); App Group may not sign with a free Apple ID (Sideloadly).
- Add purchase dates on the phone and check the Compare result screen.
## Session 7 — 2026-11-14 (branch `feature/edit-savings-chat-keyboard`)

**Goal:** let the user edit savings and investments data; fix the assistant chat keyboard (cannot type: input hidden, keyboard not adjusted).

**Work done:**
- New "Savings and investments" screen (`app/finances.tsx`): cash savings, current investments, high-interest debt, monthly income, expenses and planned investing on one page. Opened from the Home net-worth card (Edit) and the Plan tab tools card.
- Chat keyboard (iPhone): composer was under the native iOS tab bar. Bottom safe-area edge added to the helper screen; keyboard inset hook animates with the keyboard and re-measures on keyboard frame changes.
- Home "Savings + investments" card edits cash savings and investments in place (Edit, Save / Cancel), with a link to all numbers.
- Keyboard on every page: shared `KeyboardScrollView` keeps the focused field above the keyboard and content above the iOS tab bar (Screen, Stocks, Events); onboarding uses the measured inset; tap anywhere on the chat bar opens the keyboard.

**Decisions:**
- JS-only keyboard fix (no new native dependency), so the GitHub iOS build only rebuilds the bundle.
- Pension accounts and holdings already had editors; the missing piece was the onboarding money numbers.

- iOS build workflow also runs on pushes to `feature/edit-savings-chat-keyboard` (no gh CLI here to start it by hand). Run 43639850473 succeeded; artifact Kesefly-ios link given to the user.
- Wrapped up with DONE: logs and changes scanned (no keys, emails, device serial, local paths), committed and pushed (not merged).

**Next steps:**
- Install the new `Kesefly.ipa` and test on iPhone: tap the chat input, type, keyboard opens with the composer right above it; edit savings from Home and Plan.
- Check Android chat composer has no extra bottom gap.
- Optional: remove the branch from the iOS build push trigger after merge.
## Session 8 — 2026-11-20 (branch `feature/day-trading-lab`)

**Goal:** implement the "Kesefly Day-Trading Lab Plan" phase by phase (0 to 4); let iPhone users install the app by becoming a free Apple developer. Afterwards (queued by the user): own AI API key in Settings and professional chat options.

**Work done:**
- Phase 0 (same app on both phones): per-feature notification cancel; iOS build with and without widget; localized widget fallback; iPhone install guide (EN/HE); test matrix; vitest.
- Phase 1 (market data): NY/TLV sessions, `getCandles` / `getSpark`, CPython-exact seeded random numbers.
- Phase 2 (engines): scanner, entry, exit, Time Machine, sizing, risk, paper account, alerts; tests reproduce the skill's numbers exactly (364.18 at 10:15, 358.32 / 370.04, 8 shares / 46.88, Time Machine 29.38 / 25.48 / 45.14 %).
- Phase 3 (screens): risk gate, hub, scanner, setup, plan, Time Machine, ticket, journal, Lab settings; Stocks row, Home card, Learn track (5 lessons), helper chat topics, widget line; English + Hebrew.
- Phase 4 (release prep): CI gates on both workflows, Gradle cache, NOTICES + About credit, Metro bundle check. 34 tests, tsc 0, lint 0.

**Decisions:**
- Engines are pure TypeScript in `mobile/src/lab/`; the Time Machine uses CPython's Mersenne Twister so results match the skill bit for bit.
- Tel Aviv range, cutoff and flat-by times, shekel limits (x3.6), paper fill rules and index snapshots are Kesefly design decisions (marked in code).
- Lab state has its own storage key; Lab notifications are tagged `lab-time` / `lab-price`.
- Free Apple ID users install `Kesefly-no-widget.ipa` (no App Group) after turning on Developer Mode.

- AI chat with the user's own Anthropic API key: Settings > AI chat (key saved encrypted and checked), Claude chat on the Helper tab (streaming, saved chats with full context, compaction, memory notes + `save_memory`, web search, model and effort choice, share-numbers opt-in). Offline helper kept as fallback.

- AI key from ANY company in Settings > AI chat (OpenAI, Gemini, Claude, Grok, Mistral, DeepSeek, Groq, OpenRouter, or any OpenAI-compatible address); company detected from the key and confirmed; model list from the provider.
- Installed and checked on the Android phone several times (release APK, `npm run apk`); fixes from phone feedback: Security chips cut off, segmented buttons sized to their text (scroll when too wide, dividers correct in Hebrew), Rubik Bold for every title, themed alert dialog (RTL, app icon on a green tile), Israel/USA flags in the Lab, resizable candles (pinch, drag, buttons), more scanner lists (TA-125, TA-90, Tel Aviv sectors, Dow 30, ETFs, Israeli stocks in New York, US sectors), chat no longer jumps while the AI types, AI chat header layout, one-time welcome guide (8 cards).

**Decisions (later):**
- Non-Claude providers through their OpenAI-compatible APIs; Claude keeps the SDK and its extras (compaction, web search, memory tool).
- TA-125 and the Tel Aviv sector lists are approximate snapshots (verified symbols, not official member files); TA-125 has 109 shares.
- Alerts use an in-app themed dialog instead of the system Alert.

**Next steps:**
- CI on push builds the iPhone files (branch is in the iOS trigger); the Android workflow builds on `main` only (or run it by hand). Install both iPhone files and run `docs/TEST_MATRIX.md`.
- Check on the phone: guide (fresh install), dialogs with the green icon, chat scrolling during a long reply, Hebrew alignment in dialogs.
- Optional: official TA-125 member list; "Show guide again" in Settings.


## Session 9 — 2026-11-20 (branch `feature/account-data`, first named `feature/email-verification`)

**Goal:** email verification on sign-up (code typed in the app); then fixes from phone testing.

**Work done:**
- Built an email code step (Supabase verify + resend), then removed it at the user's request: it will be done in a later session. Its first commit is on the branch; the removal is in the working tree.
- Account data separation (`mobile/src/state/account-vault.ts`): sign-out puts the account's data aside and clears it; sign-in loads that account's data, or starts empty. Covers app, Lab, AI chats and key, helper brain, tour, event alerts. Test added.
- Device mode: several accounts can share the phone (password hash and record per email).
- Home title: time-of-day greeting with the account's first name ("ערב טוב, יוסי"); added night; updates every minute and on return to the app.
- Release APK installed on the Android phone. tsc 0, eslint 0, vitest 48 passed.

**Decisions:**
- Data saved before the separation belongs to the first account that opens it.
- Day parts (design decision): morning 5-12, afternoon 12-17, evening 17-21, night 21-5.

**Next steps:**
- Email verification: Supabase "Confirm email" on, "Confirm signup" template with `{{ .Token }}`, then rebuild the code step.
- Keep the Supabase URL in `mobile/.env.local`, not in `.env.example`.

## Session 10 — 2026-11-21 (branch `feature/user-chat`)

**Goal:** chats between users for advising each other, like WhatsApp. Build the system now; the user connects Supabase later.

**Work done:**
- Supabase migration: profiles with unique @username, 1:1 and group chats, members, messages, Row Level Security, server functions, Realtime.
- App client without an SDK: REST (`chat/api.ts`) and Realtime WebSocket (`chat/realtime.ts`).
- Screens: Chats list, New chat (person or group), Chat room. Home header chat button. English + Hebrew.
- Setup guide: `docs/CHAT_SETUP.md`. tsc, eslint, vitest (52), Metro bundle pass.

**Decisions:**
- Supabase backend (already the app's cloud sign-in), 1:1 + groups, find people by @username (emails stay private).
- Chat works only with cloud accounts; device-only accounts see a notice.
- Live updates plus a catch-up poll (15 s in a chat, 30 s on the list) so a missed event only delays a message.
- Every chat shows that other users are not licensed investment advisors.

**Next steps:**
- Connect Supabase (`docs/CHAT_SETUP.md`), run the migration, rebuild, test with two accounts.
- Later: push notifications for new messages, block/report, email verification.

## Session 11 — 2026-11-21 (branch `feature/user-chat`)

**Goal:** pick up after Session 10 and list what is left.

**Work done:**
- Checked the branch: Session 10 is committed (`f33421c`), pushed, and the APK is on the phone.
- Started a plan for Google sign-in (Supabase Google OAuth with PKCE, no new packages). Paused at the user's request; no code changed.
- Wrote the list of open work below.
- iPhone without Developer Mode: chose a free web app (PWA). Wrote the hand-off plan `docs/IPHONE_WEB_APP_PLAN.md` for the co-founder; no app code changed.
- Supabase connected (`mobile/.env.local`). Fixed: URL with `/rest/v1/` path (app now keeps only the project address); send failures shown as "Check your email" (new `mail` error); chat tables had no grants for signed-in users (added to the migration). Chat works on the phone.
- Chat notifications with no server: background check about every 15 min, one notification per chat with new messages, unread badge on the app icon, "Chat messages" sound in Settings.
- Verified badge for @shasha in the chat screens (app-side list).
- DONE: committed, pushed, merged `feature/user-chat` into `main`, deleted the branch.
- Email verification on sign-up: first restored the code step, then switched to the default confirmation link at the user's request (link opens the app, which signs in). Added the Supabase auth setup steps to `docs/CHAT_SETUP.md`.

**Decisions:**
- Email confirmation uses Supabase's default link template, not a typed code.
- iPhone users without Developer Mode get a web app (Safari > Add to Home Screen), hosted on EAS Hosting. The co-founder builds it.

**Next steps:**
- Co-founder: build `docs/IPHONE_WEB_APP_PLAN.md`.
- Confirmation email: Supabase failed to send it (SMTP). Fix the SMTP settings or the template, then test sign-up again.
- Test chat notifications on the phone (battery set to Unrestricted).
- User: create the Supabase project, run the chat migration, put the URL and anon key in `mobile/.env.local`, rebuild, test chat with two accounts.
- Revert `mobile/.env.example`: it holds an email address as `EXPO_PUBLIC_SUPABASE_URL`. Never commit it.
- Pick one: email code verification (restore from `3e20212`) or Google sign-in; chat push notifications; block and report users.

## Session 13 — 2026-11-23 (branch `agents/boss-log`, scheduled Boss morning cycle)

- **Goal:** one Boss cycle: check changes, audit (security-guardian + performance-engineer), decide, implement up to 2, log.
- **Work done:** audits returned 8 proposals (P-001…P-008), including a FAIL security review of PR #3 (web app). Decisions recorded in `logs/PROPOSALS.md`; morning update in `logs/BOSS_UPDATES.md`.
- **Decisions:** P-004–P-007 approved; P-001–P-003 (Supabase) and P-008 (web data storage) need the humans. No implementation: the npm registry was unreachable, so QA could not run.
- **Next steps:** implement P-004 and P-006 when `npm ci` works; next audit connectivity-engineer + ios-specialist. Note: `logs/PROPOSALS.md` and `logs/BOSS_UPDATES.md` also exist on `Shavit` (PR #2); merge #2 first, then this branch (append-only, easy conflict).

## Session 14 — 2026-11-23 (branch `agents/boss-log`, scheduled Boss evening cycle)

- **Goal:** one Boss cycle: check changes, audit (connectivity-engineer + ios-specialist), decide, implement up to 2, log.
- **Work done:** 7 new proposals (P-009…P-015), all approved. Added P-016, a PR check workflow, implemented in PR #5 with QA and security PASS (static).
- **Decisions:** no app code this cycle, because the npm registry is still unreachable. CI on PRs is the workaround.
- **Next steps:** once #5 is merged (or npm is reachable): P-012 first, then P-004 and P-006. Next audit: security-guardian + android-specialist.

## Session 15 — 2026-11-24 (branch `agents/boss-log`, scheduled Boss morning cycle)

- **Goal:** one Boss cycle: check changes, audit (security-guardian + android-specialist), decide, implement up to 2 approved items, log.
- **Work done:** no human replies or merges since last evening. Audits gave P-017…P-026; P-027 from review follow-ups. Implemented P-012 (PR #6) and P-004 (PR #7), both stacked on PR #5 so GitHub PR checks run (npm is still unreachable from the cloud run). QA static PASS on both, security PASS on P-004.
- **Decisions:** approved P-018, P-022, P-023, P-026, P-027. Needs-human P-017, P-019, P-020, P-021, P-024, P-025.
- **Next:** watch #6/#7 checks; then P-018 and P-022; audit connectivity-engineer + product-ux.
