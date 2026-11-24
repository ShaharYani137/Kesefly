/**
 * Strings for the notification permission flow (explanation before the OS prompt, and
 * "Turn on in Settings" when the OS will not ask again). Merged into STRINGS as `notifPerm`.
 * The Hebrew object must match the English shape.
 */
const en = {
  notifPerm: {
    title: 'Allow notifications?',
    why: {
      chat: 'Kesefly can tell you when a new chat message arrives, even when the app is closed.',
      tips: 'Kesefly can send you one short money idea a week, based on your plan.',
      events: 'Kesefly can tell you about big market news and big moves in your stocks.',
    },
    next: 'Next, your phone will ask you to allow notifications.',
    blockedTitle: 'Notifications are off',
    blockedBody: 'To turn them on, open Kesefly in your phone settings and allow notifications.',
    continue: 'Continue',
    notNow: 'Not now',
    allow: 'Turn on alerts',
    openSettings: 'Turn on in Settings',
    cardTitle: 'Message alerts are off',
  },
};

export type NotifPermStrings = typeof en;

const he: NotifPermStrings = {
  notifPerm: {
    title: 'לאפשר התראות?',
    why: {
      chat: "נודיע לכם כשמגיעה הודעה חדשה בצ'אט, גם כשהאפליקציה סגורה.",
      tips: 'נשלח לכם רעיון קצר אחד לכסף בכל שבוע, לפי התוכנית שלכם.',
      events: 'נודיע לכם על חדשות גדולות בשוק ועל תנועות חזקות במניות שלכם.',
    },
    next: 'מיד הטלפון יבקש מכם לאשר התראות.',
    blockedTitle: 'ההתראות כבויות',
    blockedBody: 'כדי להפעיל אותן, פתחו את כספלי בהגדרות הטלפון ואפשרו התראות.',
    continue: 'המשך',
    notNow: 'לא עכשיו',
    allow: 'הפעלת התראות',
    openSettings: 'הפעלה בהגדרות',
    cardTitle: 'התראות על הודעות כבויות',
  },
};

export const NOTIF_PERM = { en, he };
