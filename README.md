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

The app runs on its own, like the Android APK: no Expo Go, no PC, no Metro. GitHub builds it on a Mac for free (`.github/workflows/ios-build.yml`), and Sideloadly installs it from Windows with a free Apple ID.

1. **Get the build.** Every push to `main`, `Shavit` or `Shahar` that changes `mobile/` starts a build (about 20–30 minutes). To start one by hand: repo > **Actions** > **iOS build** > **Run workflow**.
   - Latest `main` build, no login needed: [Kesefly.ipa](https://github.com/ShaharYani137/Kesefly/releases/latest/download/Kesefly.ipa) (also on the repo's **Releases** page).
   - Other branches: open the green run and download **Kesefly-ios** under **Artifacts** (GitHub login needed), then unzip it to get `Kesefly.ipa`.
2. **Install the tools on Windows.** Install [Sideloadly](https://sideloadly.io) and Apple's **Apple Devices** app (Microsoft Store), which has the iPhone USB driver.
3. **Install the app.** Connect the iPhone with a cable and tap **Trust**. In Sideloadly, drag in `Kesefly.ipa`, enter your Apple ID, and click **Start**.
4. **Trust it on the iPhone (first time only).** Settings > General > **VPN & Device Management** > your Apple ID > **Trust**. iOS 16 and later also needs Settings > Privacy & Security > **Developer Mode** on (the phone restarts).

Free Apple ID limits:

- The app stops opening after **7 days**. Connect the phone and click **Start** in Sideloadly again; your data stays.
- At most 3 sideloaded apps at once.
- Notifications are local only (weekly tips, events, price moves): they work. Remote push is off, because a free Apple ID cannot sign it (`mobile/plugins/with-local-notifications-only.js`).
- The home-screen widget is Android only.

A paid Apple Developer account ($99/year) removes the 7-day limit and allows TestFlight. Then build with EAS (`eas build -p ios`) instead.

## Disclaimer

Kesefly is for education and planning only. It is not investment advice.
