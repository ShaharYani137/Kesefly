/**
 * First-run guided tour (ui/app-tour.tsx), shown once. Merged into STRINGS as `tour`.
 * The Hebrew object must match the English shape.
 */
const en = {
  tour: {
    skip: 'Skip',
    next: 'Next',
    done: 'Let’s start',
    step: '{n} of {total}',
    slides: [
      { key: 'welcome', title: 'Welcome to Kesefly', body: 'Your money helper for the US and Israel: plan, invest wisely and learn as you go. Kesefly explains and suggests; you decide and act in your own bank or broker.' },
      { key: 'home', title: 'Home', body: 'Your savings and investments at a glance, Wall Street and Tel Aviv clocks, today’s market, a money check-up and ideas made for your plan.' },
      { key: 'plan', title: 'Plan', body: 'Set a goal and see a forecast as a range of outcomes, not a promise. Edit your income, savings, pension and study funds any time.' },
      { key: 'stocks', title: 'Stocks', body: 'Track your portfolio and watchlist with live prices, see the tax picture, compare yourself to an index and import trades from your broker.' },
      { key: 'lab', title: 'Day-trading lab', body: 'Inside Stocks: practice day trading with practice money and real prices. Scanner, entry timer, exit plan, Time Machine and a journal. Most day traders lose money, so practice first.' },
      { key: 'helper', title: 'Helper and AI chat', body: 'Ask anything about money and markets. Add your own AI key (OpenAI, Gemini, Claude and more) in Settings > AI chat for a full AI assistant that remembers your chats.' },
      { key: 'learn', title: 'Learn', body: 'Short lessons with quizzes, from budgeting to investing and day trading. A placement test finds your level.' },
      { key: 'privacy', title: 'Private by design', body: 'Your numbers stay on this phone, protected by your code and fingerprint or face. Alerts, theme, language and security are in Settings.' },
    ],
  },
};

export type TourStrings = typeof en;

const he: TourStrings = {
  tour: {
    skip: 'דילוג',
    next: 'הבא',
    done: 'בואו נתחיל',
    step: '{n} מתוך {total}',
    slides: [
      { key: 'welcome', title: 'ברוכים הבאים לכספלי', body: 'העוזר הכספי שלכם בארה״ב ובישראל: לתכנן, להשקיע בחוכמה וללמוד בדרך. כספלי מסבירה ומציעה; אתם מחליטים ופועלים בבנק או אצל הברוקר שלכם.' },
      { key: 'home', title: 'בית', body: 'החסכונות וההשקעות שלכם במבט אחד, שעוני וול סטריט ותל אביב, השוק היום, בדיקת מצב כספי ורעיונות שמותאמים לתוכנית שלכם.' },
      { key: 'plan', title: 'תוכנית', body: 'הציבו מטרה וראו תחזית כטווח של תוצאות, לא כהבטחה. אפשר לערוך הכנסה, חסכונות, פנסיה וקרן השתלמות בכל זמן.' },
      { key: 'stocks', title: 'מניות', body: 'מעקב אחרי התיק ורשימת המעקב במחירים חיים, תמונת המס, השוואה למדד וייבוא עסקאות מהברוקר.' },
      { key: 'lab', title: 'מעבדת מסחר יומי', body: 'בתוך לשונית המניות: תרגול מסחר יומי בכסף תרגול ומחירים אמיתיים. סורק, שעון כניסה, תוכנית יציאה, מכונת זמן ויומן. רוב הסוחרים היומיים מפסידים, אז מתרגלים קודם.' },
      { key: 'helper', title: 'עוזר וצ׳אט AI', body: 'שאלו כל דבר על כסף ושווקים. הוסיפו מפתח AI משלכם (OpenAI, Gemini, Claude ועוד) בהגדרות > צ׳אט AI לעוזר AI מלא שזוכר את השיחות.' },
      { key: 'learn', title: 'לימוד', body: 'שיעורים קצרים עם חידונים, מתקציב ועד השקעות ומסחר יומי. מבחן פתיחה מוצא את הרמה שלכם.' },
      { key: 'privacy', title: 'פרטיות מובנית', body: 'המספרים שלכם נשארים בטלפון, מוגנים בקוד ובטביעת אצבע או זיהוי פנים. התראות, ערכת צבעים, שפה ואבטחה נמצאות בהגדרות.' },
    ],
  },
};

export const TOUR = { en, he };
