# Install Kesefly on an iPhone

Kesefly is not in the App Store. An iPhone runs it only after you become an Apple developer for your own phone. This is free. You need a Windows PC (or a Mac), a USB cable and an Apple ID.

Hebrew version below.

## Which file

| File | For | Widget |
|---|---|---|
| `Kesefly-no-widget.ipa` | Free Apple ID (most people) | No |
| `Kesefly.ipa` | Paid Apple Developer Program ($99 a year) | Yes |

A free Apple ID cannot sign the App Group that the widget needs, so with a free Apple ID use `Kesefly-no-widget.ipa`. Everything else is the same.

Download (latest `main` build, no login needed):

- https://github.com/ShaharYani137/Kesefly/releases/latest/download/Kesefly-no-widget.ipa
- https://github.com/ShaharYani137/Kesefly/releases/latest/download/Kesefly.ipa

Builds from other branches: repo > **Actions** > **iOS build** > the green run > **Artifacts** (GitHub login needed). Unzip to get the `.ipa`.

## Steps (first time)

1. **Install the tools on the PC.** Install [Sideloadly](https://sideloadly.io). On Windows also install Apple's **Apple Devices** app from the Microsoft Store (it has the iPhone USB driver).
2. **Connect the iPhone.** Use a cable. Unlock the phone and tap **Trust**, then enter the phone passcode.
3. **Install the app.** In Sideloadly, drag in the `.ipa`, type your Apple ID email and click **Start**. Enter the Apple ID password when asked. If the Apple ID has two-factor authentication, enter the code that appears on your devices.
   - This step makes your Apple ID a free developer account for this phone. Apple sends no bill.
   - Use an app-specific password if Sideloadly refuses the normal one: appleid.apple.com > **Sign-In and Security** > **App-Specific Passwords**.
4. **Turn on Developer Mode** (iOS 16 and later). On the iPhone: **Settings > Privacy & Security > Developer Mode** > on > **Restart**. After the restart, tap **Turn On** and enter the passcode.
   - The Developer Mode switch appears only after step 3 put a developer app on the phone. Not there? Do step 3 first, then look again.
5. **Trust the developer.** **Settings > General > VPN & Device Management** > your Apple ID under **Developer App** > **Trust**.
6. **Open Kesefly.**

## Limits with a free Apple ID

- The app stops opening after **7 days**. Connect the phone and click **Start** in Sideloadly again with the same file. Your data stays.
- At most **3** sideloaded apps at once, and 10 new apps per week.
- No home-screen widget (use `Kesefly-no-widget.ipa`).
- Notifications are local: weekly tips, event alerts and Day-trading Lab time alerts arrive even when the app is closed. Lab price alerts are checked only while Kesefly is open.

The paid Apple Developer Program removes the 7-day limit, allows the widget and allows TestFlight.

## Problems

| Message | Fix |
|---|---|
| "Untrusted Developer" | Do step 5. |
| "Developer Mode Required" | Do step 4. |
| "Unable to Verify App" | The phone needs internet once to check the developer. Connect to Wi-Fi and open the app again. |
| Sideloadly: "Your maximum App ID limit has been reached" | Free Apple IDs get 10 new app IDs per week. Wait, or use the same Apple ID and file as before. |
| Sideloadly: App Group / entitlement error | You used `Kesefly.ipa` with a free Apple ID. Use `Kesefly-no-widget.ipa`. |
| App closes right away after 7 days | Reinstall with Sideloadly (see Limits). |

---

<div dir="rtl">

# התקנת כספלי באייפון

כספלי לא נמצאת ב-App Store. אייפון מריץ אותה רק אחרי שהופכים למפתחים של Apple עבור הטלפון שלכם. זה בחינם. צריך מחשב Windows (או Mac), כבל USB ו-Apple ID.

## איזה קובץ

- `Kesefly-no-widget.ipa`: ל-Apple ID חינמי (רוב האנשים). בלי וידג׳ט.
- `Kesefly.ipa`: לחשבון Apple Developer בתשלום (99$ לשנה). עם וידג׳ט.

## שלבים (פעם ראשונה)

1. **התקינו את הכלים במחשב.** התקינו את [Sideloadly](https://sideloadly.io). ב-Windows התקינו גם את האפליקציה **Apple Devices** מ-Microsoft Store.
2. **חברו את האייפון בכבל.** פתחו את הנעילה, הקישו **סמוך** (Trust) והזינו את קוד הטלפון.
3. **התקינו את האפליקציה.** ב-Sideloadly גררו את קובץ ה-`.ipa`, הקלידו את ה-Apple ID ולחצו **Start**. הזינו סיסמה וקוד אימות אם מתבקש.
   - השלב הזה הופך את ה-Apple ID שלכם לחשבון מפתח חינמי עבור הטלפון. אין חיוב.
4. **הפעילו מצב מפתח** (iOS 16 ומעלה): **הגדרות > פרטיות ואבטחה > מצב מפתח** > הפעלה > **הפעל מחדש**. אחרי ההפעלה מחדש הקישו **הפעל** והזינו את הקוד.
   - המתג מופיע רק אחרי שלב 3. לא רואים אותו? בצעו קודם את שלב 3.
5. **סמכו על המפתח:** **הגדרות > כללי > VPN וניהול מכשירים** > ה-Apple ID שלכם > **סמוך**.
6. **פתחו את כספלי.**

## מגבלות עם Apple ID חינמי

- האפליקציה מפסיקה להיפתח אחרי **7 ימים**. חברו שוב ולחצו **Start** ב-Sideloadly. הנתונים נשמרים.
- עד **3** אפליקציות כאלה בו-זמנית.
- אין וידג׳ט.
- התראות זמן של מעבדת המסחר מגיעות גם כשהאפליקציה סגורה. התראות מחיר נבדקות רק כשכספלי פתוחה.

</div>
