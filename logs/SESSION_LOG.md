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

**Open items / next steps:**
- Verify on phone: sound picker previews, "What is coming up?" chip.
- Widget refreshes about every 30 min (Android limit): clock times can lag; option to drop exact times or show market tiles when there are no holdings.
- iOS widget would need a native WidgetKit target.
- Bank of Israel decision dates and 2027 FOMC dates are not in the calendar yet.
- Create Supabase project for cloud accounts (optional).
- Background task timing is set by Android; alerts are not instant.
- TASE Friday close time approximate; holiday list covers 2026-2027 only.
