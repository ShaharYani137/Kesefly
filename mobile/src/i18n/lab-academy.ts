/**
 * Kesefly Academy "Day trading" track: 5 lessons with quizzes, English and Hebrew.
 * Shown as its own track on the Learn tab (not part of the 4-level path). Education only:
 * no lesson tells the user to buy or sell anything; the Lab is practice money only.
 */
import type { Lesson } from './academy';

export type LabLessonId = 'dtWhat' | 'dtOrb' | 'dtStops' | 'dtSizing' | 'dtTimeMachine';
export const DAY_TRADING_TRACK: LabLessonId[] = ['dtWhat', 'dtOrb', 'dtStops', 'dtSizing', 'dtTimeMachine'];

type L = Record<LabLessonId, Omit<Lesson, 'id'>>;

const en: L = {
  dtWhat: {
    minutes: 3,
    title: 'What day trading really is',
    sections: [
      'A day trader buys and sells within the same session and is out before the close. Profits come from small moves, so every trade carries real risk for a short time.',
      'Most people who day trade lose money. Studies of brokerage accounts find that only a small minority make money year after year, after costs. Spreads, fees and taxes eat into small gains.',
      'The Kesefly Lab is practice only: practice money, real prices. Use it to learn the methods and see your own results before you ever think about risking money.',
    ],
    takeaway: 'Day trading is high risk. Most day traders lose money. Practice first, with no money at risk.',
    quiz: [
      { q: 'What do most people who day trade end up with?', options: ['Steady profits', 'Losses', 'About what an index fund earns'], answer: 1, explain: 'Most day traders lose money once costs are counted.' },
      { q: 'What does the Kesefly Lab use?', options: ['Your real money', 'Practice money and real prices', 'Made-up prices'], answer: 1, explain: 'The Lab never places real orders.' },
    ],
  },
  dtOrb: {
    minutes: 3,
    title: 'The opening-range breakout',
    sections: [
      'The opening range is the high and the low of the first 15 minutes of the session (9:30 to 9:45 in New York).',
      'A breakout is the first completed bar after the range that CLOSES above the range high. A wick that pokes above and falls back is not a breakout.',
      'The entry timer waits for that close. The trigger price is the close of the trigger bar, and its time is when that bar ends: the 10:10 bar closes at 10:15.',
    ],
    takeaway: 'Setup found means a completed bar closed above the 15-minute range high. It is a setup, not a promise.',
    quiz: [
      { q: 'When does a breakout trigger?', options: ['When the price touches the range high', 'When a completed bar closes above the range high', 'At 9:30'], answer: 1, explain: 'Only a close above the high counts.' },
      { q: 'In New York, the opening range covers…', options: ['9:30 to 9:45', 'The whole morning', 'The last hour'], answer: 0, explain: 'The first 15 minutes.' },
    ],
  },
  dtStops: {
    minutes: 3,
    title: 'Stops, targets and R',
    sections: [
      'Plan the exit before the entry. The stop is the price where you admit the idea was wrong. The target is where you take the profit.',
      'Risk a share is entry minus stop. That amount is 1R. A 2R target is twice the risk above the entry. Example: entry 364.18, stop 358.32, risk 5.86, so 1R target is 370.04.',
      'Flat by close: a day trade ends the same day, win or lose (15:55 in New York). A stop is a plan, not a guarantee: a gap or a fast market can fill past it.',
    ],
    takeaway: 'Set the stop and target first. 1R = entry − stop. Be out by the close.',
    quiz: [
      { q: 'Entry 50, stop 48. What is a 2R target?', options: ['52', '54', '56'], answer: 1, explain: 'Risk is 2, so 2R is 4 above the entry: 54.' },
      { q: 'Does a stop guarantee the exit price?', options: ['Yes, always', 'No, a gap can fill past it'], answer: 1, explain: 'In a fast market the fill can be worse.' },
    ],
  },
  dtSizing: {
    minutes: 3,
    title: 'Size from the max loss',
    sections: [
      'Decide the most you accept to lose on one trade, for example 50. Shares = max loss ÷ risk a share, rounded down. With 5.86 risk a share, that is 8 shares, at most 46.88 lost.',
      'Other limits can cap it further: a share of the budget per position, a maximum order, and the cash left after a buffer. The smallest wins, and Kesefly shows which one decided.',
      'Daily limits stop a bad day from becoming a bad month: a maximum loss a day and a maximum number of trades a day. The risk check blocks an order that breaks any of them.',
    ],
    takeaway: 'Shares = max loss ÷ (entry − stop). Daily limits protect you from yourself.',
    quiz: [
      { q: 'Max loss 60, risk a share 4. How many shares?', options: ['4', '15', '60'], answer: 1, explain: '60 ÷ 4 = 15.' },
      { q: 'Why have a daily loss limit?', options: ['To trade more', 'To stop a bad day from growing', 'Brokers require it'], answer: 1, explain: 'It ends the day before losses pile up.' },
    ],
  },
  dtTimeMachine: {
    minutes: 4,
    title: 'Reading the Time Machine',
    sections: [
      'The Time Machine replays the rest of the session 10,000 times, built from the stock’s own last 60 days of 5-minute bars, and counts how often the target or the stop came first.',
      'Compare the target’s share with break-even: at 1R the target has to come first half the time; at 2R, a third of the time. Close to break-even means close to a coin flip.',
      'It also re-runs the same rule on every past day it fired. A simulation is not a prediction: earnings, news and halts can do what the last 60 days never did.',
    ],
    takeaway: 'Odds near break-even mean no edge. A simulation is not a prediction.',
    quiz: [
      { q: 'At a 1R target, break-even means the target comes first in…', options: ['33% of the replays that hit a side', '50%', '75%'], answer: 1, explain: 'At 1R, wins and losses are the same size.' },
      { q: 'Target first 29%, stop first 26%, the rest neither. This is…', options: ['A strong edge', 'Close to a coin flip'], answer: 1, explain: 'The shares are almost equal.' },
    ],
  },
};

const he: L = {
  dtWhat: {
    minutes: 3,
    title: 'מה זה באמת מסחר יומי',
    sections: [
      'סוחר יומי קונה ומוכר באותו יום מסחר ויוצא לפני הסגירה. הרווחים באים מתנועות קטנות, ולכן כל עסקה נושאת סיכון אמיתי לזמן קצר.',
      'רוב האנשים שסוחרים יומית מפסידים כסף. מחקרים על חשבונות מסחר מוצאים שרק מיעוט קטן מרוויח שנה אחרי שנה, אחרי עלויות. מרווחים, עמלות ומסים אוכלים רווחים קטנים.',
      'מעבדת כספלי היא לתרגול בלבד: כסף תרגול, מחירים אמיתיים. השתמשו בה כדי ללמוד את השיטות ולראות את התוצאות שלכם, לפני שאתם בכלל חושבים לסכן כסף.',
    ],
    takeaway: 'מסחר יומי מסוכן מאוד. רוב הסוחרים היומיים מפסידים. מתרגלים קודם, בלי כסף בסיכון.',
    quiz: [
      { q: 'עם מה רוב הסוחרים היומיים מסיימים?', options: ['רווח קבוע', 'הפסד', 'בערך כמו קרן מדד'], answer: 1, explain: 'רוב הסוחרים היומיים מפסידים אחרי עלויות.' },
      { q: 'במה משתמשת המעבדה של כספלי?', options: ['בכסף האמיתי שלכם', 'בכסף תרגול ומחירים אמיתיים', 'במחירים מומצאים'], answer: 1, explain: 'המעבדה אף פעם לא שולחת פקודות אמיתיות.' },
    ],
  },
  dtOrb: {
    minutes: 3,
    title: 'פריצת טווח הפתיחה',
    sections: [
      'טווח הפתיחה הוא הגבוה והנמוך של 15 הדקות הראשונות של המסחר (9:30 עד 9:45 בניו יורק).',
      'פריצה היא הנר השלם הראשון אחרי הטווח שנסגר מעל הגבוה של הטווח. זנב שעולה מעל וחוזר למטה אינו פריצה.',
      'שעון הכניסה מחכה לסגירה הזאת. מחיר הטריגר הוא סגירת הנר, והזמן הוא סוף הנר: נר 10:10 נסגר ב-10:15.',
    ],
    takeaway: '"נמצא סטאפ" אומר שנר שלם נסגר מעל הגבוה של טווח 15 הדקות. זה סטאפ, לא הבטחה.',
    quiz: [
      { q: 'מתי פריצה מופעלת?', options: ['כשהמחיר נוגע בגבוה של הטווח', 'כשנר שלם נסגר מעל הגבוה של הטווח', 'ב-9:30'], answer: 1, explain: 'רק סגירה מעל הגבוה נחשבת.' },
      { q: 'בניו יורק טווח הפתיחה הוא…', options: ['9:30 עד 9:45', 'כל הבוקר', 'השעה האחרונה'], answer: 0, explain: '15 הדקות הראשונות.' },
    ],
  },
  dtStops: {
    minutes: 3,
    title: 'סטופ, יעד ו-R',
    sections: [
      'מתכננים את היציאה לפני הכניסה. הסטופ הוא המחיר שבו מודים שהרעיון היה שגוי. היעד הוא המקום לממש רווח.',
      'הסיכון למניה הוא כניסה פחות סטופ. הסכום הזה הוא 1R. יעד 2R הוא פעמיים הסיכון מעל הכניסה. דוגמה: כניסה 364.18, סטופ 358.32, סיכון 5.86, אז יעד 1R הוא 370.04.',
      'יוצאים עד הסגירה: עסקה יומית נגמרת באותו יום, ברווח או בהפסד (15:55 בניו יורק). סטופ הוא תוכנית, לא הבטחה: פער או שוק מהיר יכולים לבצע מעבר לו.',
    ],
    takeaway: 'קובעים סטופ ויעד קודם. 1R = כניסה − סטופ. יוצאים עד הסגירה.',
    quiz: [
      { q: 'כניסה 50, סטופ 48. מה יעד 2R?', options: ['52', '54', '56'], answer: 1, explain: 'הסיכון 2, אז 2R הוא 4 מעל הכניסה: 54.' },
      { q: 'האם סטופ מבטיח את מחיר היציאה?', options: ['כן, תמיד', 'לא, פער יכול לבצע מעבר לו'], answer: 1, explain: 'בשוק מהיר הביצוע יכול להיות גרוע יותר.' },
    ],
  },
  dtSizing: {
    minutes: 3,
    title: 'גודל פוזיציה מההפסד המרבי',
    sections: [
      'מחליטים מה ההפסד הכי גדול שמקבלים בעסקה אחת, למשל 50. מניות = הפסד מרבי ÷ סיכון למניה, מעוגל למטה. עם סיכון 5.86 למניה זה 8 מניות, הפסד של 46.88 לכל היותר.',
      'מגבלות אחרות יכולות להקטין עוד: חלק מהתקציב לפוזיציה, פקודה מרבית, והמזומן שנשאר אחרי כרית. הקטנה מכולן קובעת, וכספלי מראה איזו.',
      'מגבלות יומיות עוצרות יום רע לפני שהוא הופך לחודש רע: הפסד מרבי ליום ומספר עסקאות מרבי ליום. בדיקת הסיכון חוסמת פקודה ששוברת אחת מהן.',
    ],
    takeaway: 'מניות = הפסד מרבי ÷ (כניסה − סטופ). מגבלות יומיות מגינות עליכם מעצמכם.',
    quiz: [
      { q: 'הפסד מרבי 60, סיכון למניה 4. כמה מניות?', options: ['4', '15', '60'], answer: 1, explain: '60 ÷ 4 = 15.' },
      { q: 'למה צריך מגבלת הפסד יומית?', options: ['כדי לסחור יותר', 'כדי לעצור יום רע לפני שהוא גדל', 'הברוקר מחייב'], answer: 1, explain: 'היא מסיימת את היום לפני שההפסדים מצטברים.' },
    ],
  },
  dtTimeMachine: {
    minutes: 4,
    title: 'איך קוראים את מכונת הזמן',
    sections: [
      'מכונת הזמן מריצה את שארית יום המסחר 10,000 פעמים, מתוך נרות 5 דקות של המניה עצמה ב-60 הימים האחרונים, וסופרת כמה פעמים היעד או הסטופ הגיעו קודם.',
      'משווים את חלק היעד לנקודת האיזון: ביעד 1R היעד צריך להגיע קודם בחצי מהפעמים; ב-2R, בשליש. קרוב לאיזון פירושו קרוב להטלת מטבע.',
      'היא גם מריצה את אותו כלל על כל יום עבר שבו הוא הופעל. סימולציה אינה תחזית: דוחות, חדשות והפסקות מסחר יכולים לעשות מה ש-60 הימים האחרונים לא עשו.',
    ],
    takeaway: 'סיכויים קרובים לאיזון = אין יתרון. סימולציה אינה תחזית.',
    quiz: [
      { q: 'ביעד 1R, נקודת האיזון היא שהיעד מגיע קודם ב…', options: ['33% מההרצות שפגעו בצד', '50%', '75%'], answer: 1, explain: 'ב-1R הרווח וההפסד באותו גודל.' },
      { q: 'יעד קודם 29%, סטופ קודם 26%, השאר אף אחד. זה…', options: ['יתרון חזק', 'קרוב להטלת מטבע'], answer: 1, explain: 'החלקים כמעט שווים.' },
    ],
  },
};

export const LAB_LESSONS = { en, he };
