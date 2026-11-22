# Plan: Kesefly on iPhone without Developer Mode (web app)

Status: planned, not started. Written 2026-11-21 as a hand-off. Anyone on the team can build it from this file alone.

## Start here

1. `git pull`, then `git checkout feature/user-chat`.
2. `cd mobile && npm install`.
3. `npx expo start --web` opens the app in the browser. Build the changes below, one section at a time.
4. Open decision: hosting on EAS Hosting needs a free Expo account (see section 5). Create it before the first deploy.

## Why

On iOS 16 and later, Apple requires **Developer Mode** for every app installed with Sideloadly or Xcode. Our current iPhone path (`docs/INSTALL_IPHONE.md`) is Sideloadly, so every iPhone user has to turn Developer Mode on. No code change can get around this.

Paths that do not need Developer Mode are TestFlight, the App Store (both need the paid Apple Developer Program, $99 a year) and a **web app**. We chose the web app because it is free.

How it works for the user: open a link in Safari, tap **Share > Add to Home Screen**. Kesefly then opens full screen from its own icon, like an app. No Developer Mode, no PC, no Apple account, and no 7-day expiry.

Already checked: `npx expo export -p web` builds with no errors (`app.json` has `web.output: "server"`). The problems are at run time, not at build time.

## 1. Prices, news and TASE data are blocked in the browser (CORS)

Browsers block calls to Yahoo Finance, TASE (Maya), the RSS feeds, Google Translate and Wikipedia. The phone app can make these calls because native apps have no CORS rule.

- Add the API route `mobile/src/app/api/proxy+api.ts` (Expo Router server route, GET and POST). It forwards requests only to hosts on an allowlist:
  - `query1.finance.yahoo.com`, `query2.finance.yahoo.com`
  - `maya.tase.co.il`
  - `www.cnbc.com`, `feeds.content.dowjones.io`, `www.globes.co.il`, `www.ynet.co.il`, `news.google.com`
  - `translate.googleapis.com`
  - `*.wikipedia.org`

  It allows HTTPS only. It sets `User-Agent` on the server, because browsers drop that header. It caches prices for a short time (30 s).
- Add `mobile/src/web/proxy-fetch.ts`, loaded only on web from `mobile/src/app/_layout.tsx`. It wraps `fetch`: a URL on the allowlist goes to `/api/proxy?url=...`. Other URLs (Supabase, AI companies) are not changed. Both files share one allowlist.
- Because the wrap is in one place, the existing fetch calls stay as they are: `engine/stocks.ts`, `engine/news.ts`, `engine/search.ts`, `engine/web.ts`, `lab/candles.ts`.
- Risk: Yahoo sometimes blocks cloud-server IPs. Test this right after the first deploy. If Yahoo blocks it, try the other Yahoo host (both are already in `lab/candles.ts`) or another data source.

## 2. Sign-in, PIN and AI key storage break on web

`expo-secure-store` has no web version (`ExpoSecureStore.web.js` is empty). `state/auth.tsx`, `state/ai-store.tsx` and `state/account-vault.ts` use it.

- Add `mobile/src/state/secure.ts` with the same three functions: `getItemAsync`, `setItemAsync`, `deleteItemAsync`. Native builds call SecureStore. Web uses `localStorage`.
- Change the 3 imports to `@/state/secure`. Update the mock in `lab/__tests__/account-vault.test.ts` to match.
- Trade-off: on web the PIN hash and the user's AI key are kept in browser storage, not in the iPhone Keychain. On web, show a one-line note about this in Settings > AI chat.

## 3. Native-only features: hide or skip them on web

- **Android widget:** `_layout.tsx` imports `@/widget/task`, and that file imports `react-native-android-widget`. Add a no-op `widget/task.web.tsx`, so web never loads the Android library. The iOS widget sync already runs on iOS only.
- **Background event checks:** `state/event-alerts.ts` calls `TaskManager.defineTask` when the file loads. Skip that on web. While the app is open, events are still checked every 10 min (already in `_layout.tsx`).
- **Notifications** (weekly tips, Lab alerts, event alerts): do not schedule them on web. On web, Settings shows "Notifications need the phone app" in place of the switches.
- **Face ID / fingerprint:** `expo-local-authentication` does not work on web. Hide the biometric row in Settings and the biometric offer in `PinSetup` (`ui/auth-screens.tsx`). The PIN still works.
- **Haptics:** `expo-haptics` does nothing on web. No change needed.
- **Icons:** `ui/components.tsx` uses `expo-symbols`. Check the icons in the browser. If an icon is blank, add a web fallback.

## 4. Make it install like an app (PWA)

- Add `mobile/src/app/+html.tsx` (the Expo Router web document) with:
  - `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title` = Kesefly
  - `theme-color` `#062A26`
  - `viewport-fit=cover`
  - links to `apple-touch-icon.png` (already in `mobile/public/`) and `manifest.webmanifest`
- Add `mobile/public/manifest.webmanifest` (name, `display: standalone`, colours, icons). Add 192 px and 512 px icons made from `assets/images/icon.png`.
- In full-screen mode on iPhone, check the safe areas (notch and home bar). `react-native-safe-area-context` reads `env(safe-area-inset-*)`.
- If the browser shows the name `Kesefly` in the wrong place inside a Hebrew sentence, fix it.

## 5. Hosting

Recommended: **EAS Hosting** (Expo's own hosting, free plan). It supports `web.output: "server"`, so the proxy route from section 1 works with no extra server.

- Add the script `npm run web:deploy` = `expo export -p web && eas deploy --prod`.
- Address: `https://kesefly.expo.app`, or the next free name.
- Once: create a free Expo account, then run `npx eas-cli login`.
- Optional, later: a GitHub workflow that deploys on every push to `main`. It needs an `EXPO_TOKEN` repository secret.

## 6. Docs

- Rewrite `docs/INSTALL_IPHONE.md`. Make the web app the main path (Safari > Share > Add to Home Screen). Keep Sideloadly as "advanced, needs Developer Mode". Add a table of what the web app does not have: home-screen widget, Face ID, notifications, background checks. Keep English and Hebrew, as now.
- Update the comment at the top of `.github/workflows/ios-build.yml` to point to the web path.

## Not changed

- The Android APK and the iOS `.ipa` builds stay as they are. Put every web change behind `Platform.OS === 'web'` or in a `.web.tsx` file.

## How to check it

1. `npm run typecheck`, `npm run lint`, `npm test`.
2. `npx expo start --web`, then in desktop Chrome at iPhone size, check each of these:
   - sign up, set a PIN, lock and unlock
   - Home prices load, and a stock page shows its chart
   - the Events feed loads, with Hebrew translation
   - Lab candles load
   - AI chat works with a key
   - sign out and sign back in, and each account keeps its own data
3. In the browser Network tab, market and news calls go to `/api/proxy`. AI calls go direct.
4. Deploy. On a real iPhone in Safari:
   - tap Add to Home Screen and open Kesefly from the icon: full screen, no Safari bar, notch area correct
   - repeat step 2 briefly
   - close it and open it again: still signed in, and the PIN is asked
5. Check the Android bundle still builds (`npx expo export -p android`), so the APK is not broken.
