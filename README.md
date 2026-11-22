# Kesefly

Personal money helper app (Hebrew name: כספלי) for the USA and Israel. Kesefly takes a user's income, savings, and goal, shows a forecast range, teaches the basics, tracks stocks, and suggests next steps. It recommends only: it never trades for the user.

## Features

- **Home:** greeting, the most important next step, a 5-point money check-up, and goal progress.
- **Helper:** an offline chat in English and Hebrew that answers from the user's own numbers and quotes stock prices.
- **Plan:** goal forecast with bad / likely / good ranges, plus what-if controls.
- **Stocks:** a watchlist with live prices from Finnhub. The user supplies a free API key, which is stored only on the device.
- **Learn:** short lessons.
- **Languages and currencies:** English and Hebrew (right-to-left), USD and ILS.

## Project layout

| Path | What |
|---|---|
| `mobile/` | React Native + Expo app (TypeScript, expo-router) |
| `mobile/src/engine/` | Forecast, ideas, check-up, helper chat, Finnhub client |
| `mobile/src/i18n/strings.ts` | All English and Hebrew text |
| `mobile/scripts/make_icon.py` | Generates the app icon set (Pillow) |
| `mobile/plugins/` | Expo config plugins (iOS: local notifications only) |
| `.github/workflows/ios-build.yml` | Builds the iPhone app (.ipa) on GitHub |
| `backend/` | Python FastAPI service (reserved for market data and AI) |
| `logs/` | Action and session logs |
| `.claude/skills/` | Design and communication skills used while building |

## Agent team (Claude Code)

The repo defines a team of Claude Code agents in `.claude/agents/`. The **boss** is the main agent (set in `.claude/settings.json`), so running `claude` in the repo starts it. It is the only one that talks to you.

| Agent | Role |
| --- | --- |
| `boss` | Talks to you, plans, briefs the specialists, approves or rejects proposals, gates every change, and sends a progress update every morning and evening |
| `security-guardian` | Auth, Supabase RLS, secrets, storage, dependencies, privacy. Also reviews risky changes |
| `connectivity-engineer` | Chat realtime, market and news APIs, offline mode, retries, caching |
| `performance-engineer` | Startup, rendering, lists, charts, battery, bundle size |
| `ios-specialist` | iPhone (Apple HIG), iOS build and Sideloadly |
| `android-specialist` | Android (Material 3 Expressive), APK, widget |
| `product-ux` | Features, Hebrew and English copy, RTL, accessibility, finance accuracy |
| `qa-tester` | Type check, lint, tests, and a regression review of every change |

How it works (`.claude/TEAM_RULES.md`):

1. Specialists audit and send **proposals** to the boss, which records them in `logs/PROPOSALS.md`.
2. The boss **approves** low- and medium-risk proposals. Anything in the *human gate* (sign-in, live database, user data, new services or keys, major upgrades, merging) waits for your answer.
3. Approved work is built on an `agents/<date>-<topic>` branch, passes `qa-tester` (and `security-guardian` when relevant), and becomes a pull request. **You merge to `main`.**
4. Progress updates are appended to `logs/BOSS_UPDATES.md`.

To start a session without the boss, remove `"agent"` from `.claude/settings.json`, or start another agent with `claude --agent <name>`.

## Run on an Android phone (Windows)

```
cd mobile
npm install
npx expo prebuild --platform android
```

Windows only: add this line to `mobile/android/local.properties`. CMake 3.22's ninja fails on paths longer than 260 characters.

```
cmake.dir=C:/Users/<you>/AppData/Local/Android/Sdk/cmake/3.31.6
```

Then, with the phone connected over USB, build the standalone APK, install it, and open it (run from `mobile/`):

```
npm run apk
```

The installed app runs on its own: no PC, Metro, or Expo needed. Run `npm run apk` again after each code change.

The release build is signed with the debug key. Create a real upload key before publishing to Google Play.

## Run on an iPhone (Windows, no Mac)

The app runs on its own, like the Android APK: no Expo Go, no PC, no Metro. GitHub builds it on a Mac for free (`.github/workflows/ios-build.yml`), and Sideloadly installs it from Windows. Each iPhone user becomes a free Apple developer for their own phone (Apple ID + Developer Mode).

Full steps, in English and Hebrew: [docs/INSTALL_IPHONE.md](docs/INSTALL_IPHONE.md).

Each build makes two files:

- `Kesefly-no-widget.ipa`: free Apple ID (no App Group, so no home-screen widget). Built with `KESEFLY_IOS_WIDGET=0` (`mobile/app.config.js`).
- `Kesefly.ipa`: with the widget; needs a paid Apple Developer account.

Latest `main` build, no login needed: [Kesefly-no-widget.ipa](https://github.com/ShaharYani137/Kesefly/releases/latest/download/Kesefly-no-widget.ipa) · [Kesefly.ipa](https://github.com/ShaharYani137/Kesefly/releases/latest/download/Kesefly.ipa).

Notifications are local only (weekly tips, events, price moves, Lab alerts). Remote push is off, because a free Apple ID cannot sign it (`mobile/plugins/with-local-notifications-only.js`).

A paid Apple Developer account ($99/year) removes the 7-day limit and allows TestFlight. Then build with EAS (`eas build -p ios`) instead.

## Disclaimer

Kesefly is for education and planning only. It is not investment advice.
