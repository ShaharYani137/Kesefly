# Web shims

Browser stand-ins for native-only modules, used **only** by the web build (`metro.config.js` swaps them in when `platform === 'web'`). iOS and Android use the real modules.

| Module | On the web |
| --- | --- |
| `expo-secure-store` | `localStorage` with a `kesefly.secure.` prefix. A browser has no keychain: anyone with this browser profile can read it, so the web app is for personal devices. |
| `expo-notifications` | No-op. Permission reads as denied, so the app skips alerts. |
| `expo-background-task`, `expo-task-manager` | No-op (a web page cannot run in the background). |
| `expo-local-authentication` | No Face ID or fingerprint, so the app lock falls back to the PIN. |
| `@bacons/apple-targets` | No-op (no iOS widget on the web). |
| `react-native-android-widget` | No-op (no Android widget on the web). |

Keep each shim to the API the app actually calls. If the app starts using a new function from one of these modules, add it here too, or the web build breaks.
