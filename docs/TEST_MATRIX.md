# Test matrix

Every phase of the Day-Trading Lab plan, and every release, is checked on all 8 combinations:

| Phone | Language | Theme |
|---|---|---|
| Android (APK) | English | Light |
| Android (APK) | English | Dark |
| Android (APK) | Hebrew | Light |
| Android (APK) | Hebrew | Dark |
| iPhone (`Kesefly-no-widget.ipa`, free Apple ID) | English | Light |
| iPhone | English | Dark |
| iPhone | Hebrew | Light |
| iPhone | Hebrew | Dark |

`Kesefly.ipa` (with widget) gets one extra pass when a paid Apple account is available.

## Automatic (CI, both workflows)

- `npm test` (engine tests, offline data)
- `npx tsc --noEmit`
- `npm run lint`

## Phase 0: same app on both phones

- [ ] iPhone widget with no data, or data older than 3 days: shows "Open Kesefly to update" (Hebrew phone: "פתחו את כספלי כדי לעדכן"), also on the lock screen.
- [ ] No-widget build installs with a free Apple ID; no App Group error in Sideloadly.
- [ ] Turn weekly tips off and on: Lab time alerts stay scheduled.
- [ ] Lab time alerts (opening bell, flat by close) arrive with the app closed, on both phones.
- [ ] Lab price alerts fire while Kesefly is open; the alerts screen says they are checked only while the app is open on iPhone.

## Phases 1-3: Day-Trading Lab (each phone, both languages, both themes)

- [ ] Stocks tab > Day-trading lab: the risk gate opens first (lesson, 3 questions, acknowledgement); after it, the hub.
- [ ] Hub shows New York and Tel Aviv session state; Tel Aviv times follow the Israel clock (09:59 open, range to 10:10, entries to 16:55, flat by 17:20; Friday 13:20 / 13:45).
- [ ] Scanner in New York hours: "Breakouts today" on S&P 100 lists setups after 9:45; "Daily setups" lists tags. TA-35 works in Israeli hours.
- [ ] Setup page: candles with range lines, status line refreshes, news, "Moving ±3%" chip on a big mover.
- [ ] Plan: stop rules and 1R/1.5R/2R change stop and target; a too-tight stop shows the reason.
- [ ] Time Machine: progress bar moves, the phone does not freeze, odds + fan chart + history appear.
- [ ] Ticket: shares, which limit decided, PASS; after 15:30 New York it shows BLOCK (window).
- [ ] Place a practice order: Home card appears; widgets show the practice line; journal fills after stop, target or flat by.
- [ ] Alerts: stop / target notifications while the app is open; flat-by notification with the app closed.
- [ ] Learn tab: "Day-trading track" with 5 lessons; helper chat answers "what is the time machine" / "מה זה מכונת הזמן".
- [ ] Hebrew: text right to left, charts left to right.

## Phase 4: builds

- [ ] Android build: tests, typecheck and lint pass before Gradle; second run uses the Gradle cache.
- [ ] iOS build: both `.ipa` files; Settings > About shows the day-trader-skill credit; `NOTICES.md` in the repo.

## UI parity rule

Every screen uses the shared components in `mobile/src/ui/` (Apple HIG on iOS, Material 3 Expressive on Android). A platform-only touch needs an equivalent on the other platform, or a note in the code saying why not.
