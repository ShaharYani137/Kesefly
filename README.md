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

Then build the standalone APK and install it:

```
cd android
.\gradlew.bat app:assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app\build\outputs\apk\release\app-release.apk
```

The release build is signed with the debug key. Create a real upload key before publishing to Google Play.

## Disclaimer

Kesefly is for education and planning only. It is not investment advice.
