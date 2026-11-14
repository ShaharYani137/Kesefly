/**
 * Kesefly Academy content: a placement test and a 4-level learning path (16 lessons), in
 * English and Hebrew. Each lesson has short sections, one takeaway and a 2-question check.
 * Education only: no lesson tells the user to buy or sell a specific security.
 * `answer` is the index of the correct option.
 */
import type { Lang } from '@/engine/types';

export type Question = { q: string; options: string[]; answer: number; explain: string };
export type Lesson = { id: LessonId; minutes: number; title: string; sections: string[]; takeaway: string; quiz: Question[] };
export type Level = { id: 1 | 2 | 3 | 4; title: string; lessons: LessonId[] };

export type LessonId =
  | 'budget'
  | 'emergency'
  | 'debt'
  | 'compound'
  | 'stocksBonds'
  | 'indexFunds'
  | 'fees'
  | 'diversification'
  | 'stockPrice'
  | 'rates'
  | 'inflation'
  | 'currency'
  | 'risk'
  | 'dca'
  | 'tax'
  | 'news';

export const PATH: { id: 1 | 2 | 3 | 4; lessons: LessonId[] }[] = [
  { id: 1, lessons: ['budget', 'emergency', 'debt', 'compound'] },
  { id: 2, lessons: ['stocksBonds', 'indexFunds', 'fees', 'diversification'] },
  { id: 3, lessons: ['stockPrice', 'rates', 'inflation', 'currency'] },
  { id: 4, lessons: ['risk', 'dca', 'tax', 'news'] },
];

/** Placement question, tagged with the level it tests. */
export type PlacementQ = Question & { level: 1 | 2 | 3 | 4 };

type Academy = {
  levels: Record<1 | 2 | 3 | 4, string>;
  lessons: Record<LessonId, Omit<Lesson, 'id'>>;
  placement: PlacementQ[];
};

const en: Academy = {
  levels: { 1: 'Money basics', 2: 'Investing foundations', 3: 'Markets and the economy', 4: 'Advanced investor' },
  lessons: {
    budget: {
      minutes: 3,
      title: 'Know your free cash',
      sections: [
        'Free cash is what is left each month after all expenses: income minus spending. Every plan starts here, because you can only save or invest what is left.',
        'A common guide is 50/30/20: about 50% for needs (rent, food, transport), 30% for wants, and 20% for saving and investing. It is a starting point, not a rule.',
        'Track one month of spending. Most people find two or three small items they did not notice, like unused subscriptions.',
      ],
      takeaway: 'Free cash = income − expenses. Aim to save about 20% of income.',
      quiz: [
        {
          q: 'Income 10,000 a month, expenses 8,000. What is your free cash?',
          options: ['18,000', '2,000', '8,000'],
          answer: 1,
          explain: 'Free cash is income minus expenses: 10,000 − 8,000 = 2,000.',
        },
        {
          q: 'In the 50/30/20 guide, what is the 20% for?',
          options: ['Rent', 'Saving and investing', 'Holidays'],
          answer: 1,
          explain: '20% goes to saving and investing, 50% to needs, 30% to wants.',
        },
      ],
    },
    emergency: {
      minutes: 3,
      title: 'Your emergency fund',
      sections: [
        'An emergency fund is cash you can reach in a day, for job loss, a car repair or a medical bill. It keeps you from selling investments at a bad moment or taking an expensive loan.',
        'A common target is 3 to 6 months of expenses. Keep it in a savings account or deposit you can withdraw quickly, not in stocks.',
        'Build it first, before investing. Even one month of expenses already protects you from most surprises.',
      ],
      takeaway: 'Hold 3–6 months of expenses in easy-to-reach cash before investing.',
      quiz: [
        {
          q: 'Where should an emergency fund be kept?',
          options: ['In a single stock', 'In cash or a savings account you can reach fast', 'In a 10-year bond'],
          answer: 1,
          explain: 'It must be safe and quick to reach. Stocks can be down exactly when you need the money.',
        },
        {
          q: 'Expenses are 6,000 a month. A 3-month emergency fund is…',
          options: ['6,000', '18,000', '60,000'],
          answer: 1,
          explain: '3 × 6,000 = 18,000.',
        },
      ],
    },
    debt: {
      minutes: 3,
      title: 'Expensive debt first',
      sections: [
        'Credit card debt and overdrafts often cost 15–25% a year. The stock market has returned roughly 7–10% a year over long periods, with no guarantee.',
        'Paying off a 20% debt is like earning a sure 20% return. No investment reliably beats that.',
        'Pay the most expensive debt first, keep paying the minimum on the rest, and do not add new expensive debt.',
      ],
      takeaway: 'Paying off high-interest debt is a guaranteed return. Do it before investing.',
      quiz: [
        {
          q: 'You have credit card debt at 18% a year. What usually comes first?',
          options: ['Invest in stocks', 'Pay off the card', 'Buy crypto'],
          answer: 1,
          explain: 'Paying an 18% debt is a guaranteed 18% "return". Stocks give less on average, and with risk.',
        },
        {
          q: 'With several debts, which do you pay off first?',
          options: ['The one with the highest interest rate', 'The newest one', 'The smallest one, always'],
          answer: 0,
          explain: 'The highest rate costs you the most each month (the "avalanche" method).',
        },
      ],
    },
    compound: {
      minutes: 3,
      title: 'Compound growth',
      sections: [
        'Compound growth means your returns earn returns. 1,000 at 7% a year becomes about 1,970 in 10 years and about 7,600 in 30 years.',
        'The "rule of 72": divide 72 by the yearly return to see how many years it takes to double. At 8%, money doubles in about 9 years.',
        'Time matters more than timing. Starting 10 years earlier can matter more than investing twice as much later.',
      ],
      takeaway: 'Start early and stay invested: time is the engine of compounding.',
      quiz: [
        {
          q: 'By the rule of 72, at 6% a year money doubles in about…',
          options: ['6 years', '12 years', '72 years'],
          answer: 1,
          explain: '72 ÷ 6 = 12 years.',
        },
        {
          q: 'What makes compound growth stronger?',
          options: ['More time invested', 'Checking prices daily', 'Selling after every rise'],
          answer: 0,
          explain: 'The longer returns stay invested, the more they earn on top of each other.',
        },
      ],
    },
    stocksBonds: {
      minutes: 3,
      title: 'Stocks and bonds',
      sections: [
        'A stock is a small piece of a company. If the company grows, the share can grow too, but prices can fall a lot in a bad year.',
        'A bond is a loan to a government or company that pays interest. It is usually steadier, with lower long-run growth.',
        'Most plans mix the two. More stocks = more growth and bigger swings. More bonds = smoother ride and less growth.',
      ],
      takeaway: 'Stocks for growth, bonds for stability. The mix sets your risk.',
      quiz: [
        {
          q: 'What is a bond?',
          options: ['A piece of a company', 'A loan that pays interest', 'A type of bank account'],
          answer: 1,
          explain: 'A bond is a loan to a government or company; you receive interest.',
        },
        {
          q: 'Adding more bonds to a portfolio usually…',
          options: ['Raises risk', 'Lowers swings and expected growth', 'Guarantees profit'],
          answer: 1,
          explain: 'Bonds smooth the ride but grow slower than stocks over long periods.',
        },
      ],
    },
    indexFunds: {
      minutes: 3,
      title: 'Index funds and ETFs',
      sections: [
        'An index tracks a group of companies, like the S&P 500 (500 large US firms) or the TA-125 (125 large Israeli firms).',
        'An index fund or ETF buys all of them for you. In one purchase you spread money over hundreds of companies.',
        'Most professional fund managers do not beat their index over 10+ years after fees. That is why many long-term investors use low-cost index funds.',
      ],
      takeaway: 'One index fund = hundreds of companies, low fees, wide diversification.',
      quiz: [
        {
          q: 'What does an S&P 500 index fund hold?',
          options: ['One large company', 'About 500 large US companies', 'Only bonds'],
          answer: 1,
          explain: 'It holds the roughly 500 companies in the S&P 500 index.',
        },
        {
          q: 'A key advantage of index funds is…',
          options: ['Guaranteed returns', 'Low fees and wide diversification', 'No price swings'],
          answer: 1,
          explain: 'They are cheap and spread risk. They still go up and down with the market.',
        },
      ],
    },
    fees: {
      minutes: 2,
      title: 'Fees eat returns',
      sections: [
        'A fee of 1% a year sounds small. Over 30 years it can take about a quarter of your final amount.',
        'Look at the expense ratio (the fund\'s yearly fee), trading commissions, and management fees on pension or savings plans.',
        'Broad index ETFs often cost under 0.1% a year. In Israel, you can ask your pension or study fund for lower management fees.',
      ],
      takeaway: 'Every 1% in yearly fees is 1% less growth, every year.',
      quiz: [
        {
          q: 'Fund A charges 0.05% a year, fund B 1.2%. Same index. Which is cheaper over 20 years?',
          options: ['A', 'B', 'They are the same'],
          answer: 0,
          explain: 'Same holdings, lower fee: A leaves much more money for you.',
        },
        {
          q: 'What is an expense ratio?',
          options: ['The yearly fee of a fund', 'A tax on profits', 'The share price'],
          answer: 0,
          explain: 'It is the percentage the fund takes each year to run.',
        },
      ],
    },
    diversification: {
      minutes: 3,
      title: 'Diversification',
      sections: [
        'Diversification means not putting all your money in one company, one sector or one country.',
        'If one stock is 40% of your portfolio and it drops 50%, your whole portfolio drops 20%. Spread out, the same fall barely hurts.',
        'Check your Stocks tab: the allocation chart shows how much each holding weighs. Many guides keep any single stock under 5–10%.',
      ],
      takeaway: 'Spread money across many companies and countries to lower the damage from any one.',
      quiz: [
        {
          q: 'One stock is 50% of your portfolio and falls 20%. Your portfolio falls about…',
          options: ['20%', '10%', '50%'],
          answer: 1,
          explain: '50% weight × 20% fall = 10% of the whole portfolio.',
        },
        {
          q: 'Which portfolio is more diversified?',
          options: ['Three tech stocks', 'A global index fund', 'One Israeli bank'],
          answer: 1,
          explain: 'A global index fund holds thousands of companies across many countries.',
        },
      ],
    },
    stockPrice: {
      minutes: 3,
      title: 'What moves a stock price',
      sections: [
        'A price is what the last buyer paid for one share. It moves when buyers and sellers change their view of the company\'s future profits.',
        'Main drivers: earnings reports, guidance (the company\'s forecast), interest rates, and big news about the sector or economy.',
        'Daily moves of 1–2% are normal. The 52-week range on a stock page shows how far it has moved in a year.',
      ],
      takeaway: 'Prices follow expected future profits. Short-term moves are noisy.',
      quiz: [
        {
          q: 'A company reports profits far above expectations. The share price usually…',
          options: ['Rises', 'Falls', 'Never changes'],
          answer: 0,
          explain: 'Better profits raise expectations, so buyers pay more. Not always, but usually.',
        },
        {
          q: 'What does the 52-week range show?',
          options: ['The lowest and highest price in the last year', 'Next year\'s forecast', 'The dividend'],
          answer: 0,
          explain: 'It is the low and high of the past 52 weeks.',
        },
      ],
    },
    rates: {
      minutes: 3,
      title: 'Interest rates and markets',
      sections: [
        'Central banks (the Fed in the US, the Bank of Israel) set a base interest rate to control inflation.',
        'Higher rates make loans costlier and safe deposits more attractive, so stock prices, especially fast-growing tech, often fall. Lower rates usually do the opposite.',
        'Bond prices move opposite to rates: when rates rise, existing bond prices fall. That is why Kesefly alerts you about rate decisions.',
      ],
      takeaway: 'Rates up: borrowing costs up, stock and bond prices often down. And the reverse.',
      quiz: [
        {
          q: 'The central bank raises rates. Existing bond prices usually…',
          options: ['Rise', 'Fall', 'Stay the same'],
          answer: 1,
          explain: 'New bonds pay more, so older lower-paying bonds become worth less.',
        },
        {
          q: 'Which stocks often react most to rate changes?',
          options: ['Fast-growing tech companies', 'None', 'Only banks, always up'],
          answer: 0,
          explain: 'Their value depends on profits far in the future, which higher rates discount more.',
        },
      ],
    },
    inflation: {
      minutes: 2,
      title: 'Inflation',
      sections: [
        'Inflation is the rise in prices over time, often 2–3% a year. It is measured by the consumer price index (CPI).',
        'Cash that earns less than inflation loses buying power. 100 today buys only about 74 of today\'s goods after 10 years at 3% inflation.',
        'High inflation news often pushes central banks to raise rates, which moves markets. Kesefly forecasts are shown before inflation.',
      ],
      takeaway: 'Money must grow faster than inflation just to keep its value.',
      quiz: [
        {
          q: 'Your savings earn 1% while inflation is 3%. Your buying power…',
          options: ['Grows', 'Shrinks', 'Stays the same'],
          answer: 1,
          explain: 'Real return = 1% − 3% = about −2% a year.',
        },
        {
          q: 'Which report measures consumer inflation?',
          options: ['CPI', 'GDP', 'P/E'],
          answer: 0,
          explain: 'The CPI (consumer price index) tracks prices of everyday goods and services.',
        },
      ],
    },
    currency: {
      minutes: 3,
      title: 'Currency risk (USD / ILS)',
      sections: [
        'If you spend shekels and own US investments, the dollar-shekel rate changes your result in shekels.',
        'A stronger shekel (fewer shekels per dollar) lowers US gains in shekel terms. A weaker shekel raises them.',
        'Kesefly shows the live USD/ILS rate on Home and converts your portfolio total, so you see both effects.',
      ],
      takeaway: 'Foreign investments carry currency risk on top of market risk.',
      quiz: [
        {
          q: 'Your US fund is flat in dollars, and the shekel strengthens. In shekels you…',
          options: ['Gain', 'Lose', 'Break even'],
          answer: 1,
          explain: 'Each dollar is now worth fewer shekels, so the value in shekels falls.',
        },
        {
          q: 'USD/ILS goes from 3.6 to 3.2. The shekel has…',
          options: ['Strengthened', 'Weakened', 'Not changed'],
          answer: 0,
          explain: 'You need fewer shekels for one dollar: the shekel is stronger.',
        },
      ],
    },
    risk: {
      minutes: 3,
      title: 'Risk, volatility and drawdowns',
      sections: [
        'Volatility measures how much a price swings. A drawdown is the fall from a peak to a low. Stock markets have had drawdowns of 30–50%.',
        'Risk you can carry depends on time: money needed in 2 years should not be mostly in stocks; money for 20 years can be.',
        'Before a fall, decide what you will do. Selling in a panic turns a temporary drop into a permanent loss.',
      ],
      takeaway: 'Match risk to your time horizon, and plan for falls before they happen.',
      quiz: [
        {
          q: 'A stock goes from 100 to 60. Its drawdown is…',
          options: ['40%', '60%', '160%'],
          answer: 0,
          explain: '(60 − 100) ÷ 100 = −40%.',
        },
        {
          q: 'You need the money in 18 months for an apartment. Mostly stocks is…',
          options: ['Usually too risky', 'The safest choice', 'Required'],
          answer: 0,
          explain: 'A short horizon may not leave time to recover from a market fall.',
        },
      ],
    },
    dca: {
      minutes: 2,
      title: 'Monthly investing vs. timing',
      sections: [
        'Nobody reliably predicts the best day to buy. Investing a fixed amount each month (dollar-cost averaging) removes the guessing.',
        'When prices are low, the same amount buys more shares. When high, fewer. Over time it evens out.',
        'A standing order in your broker or bank makes it automatic, so emotions do not decide.',
      ],
      takeaway: 'A steady monthly amount beats trying to time the market for most people.',
      quiz: [
        {
          q: 'With a fixed monthly amount, when prices are low you buy…',
          options: ['More shares', 'Fewer shares', 'No shares'],
          answer: 0,
          explain: 'The same money buys more units at a lower price.',
        },
        {
          q: 'The main benefit of monthly investing is…',
          options: ['It removes the need to guess the right day', 'It guarantees profit', 'It avoids all fees'],
          answer: 0,
          explain: 'It builds a habit and avoids timing mistakes. It does not guarantee profit.',
        },
      ],
    },
    tax: {
      minutes: 3,
      title: 'Tax-advantaged accounts',
      sections: [
        'US: 401(k) and IRA accounts let investments grow with tax benefits. A Roth IRA grows tax-free if rules are followed. Employer matches are free money.',
        'Israel: pension and study fund (קרן השתלמות) have tax benefits; a study fund is tax-free after 6 years. An investment provident fund (קופת גמל להשקעה) adds flexibility.',
        'Fill tax-advantaged accounts before a regular brokerage account when it fits your plan. Ask a licensed advisor for your case.',
      ],
      takeaway: 'Use tax-advantaged accounts first: lower tax means more compounding.',
      quiz: [
        {
          q: 'In Israel, a study fund (קרן השתלמות) is tax-free after…',
          options: ['1 year', '6 years', '30 years'],
          answer: 1,
          explain: 'After 6 years the gains can be withdrawn tax-free (within the ceiling).',
        },
        {
          q: 'An employer 401(k) match is…',
          options: ['Extra money added by your employer', 'A fee', 'A loan'],
          answer: 0,
          explain: 'Your employer adds money when you contribute, an immediate return.',
        },
      ],
    },
    news: {
      minutes: 3,
      title: 'Reading market news calmly',
      sections: [
        'Kesefly\'s event alerts tag each story: category (rates, inflation, war, earnings…), impact, and which of your stocks it touches.',
        'Ask three questions: Does this change the company\'s profits for years, or just this week? Is it already in the price? Does it change my plan?',
        'Most news does not change a long-term plan. React to changes in your life and goals, not to headlines.',
      ],
      takeaway: 'Use news to understand, not to react. Your plan comes first.',
      quiz: [
        {
          q: 'A scary headline drops the market 2% today. For a 20-year plan this usually means…',
          options: ['Sell everything', 'Little; stick to the plan', 'Borrow to buy more'],
          answer: 1,
          explain: 'Daily moves are normal; long-term plans are built to ride them out.',
        },
        {
          q: 'A good first question about market news is…',
          options: ['Does it change long-term profits?', 'Is everyone selling?', 'Is the headline red?'],
          answer: 0,
          explain: 'Lasting effects on profits matter; short-term noise usually fades.',
        },
      ],
    },
  },
  placement: [
    { level: 1, q: 'Income 12,000, expenses 9,000 a month. Free cash?', options: ['3,000', '21,000', '9,000'], answer: 0, explain: '12,000 − 9,000 = 3,000.' },
    {
      level: 1,
      q: 'What usually comes first: investing, or paying off a 20% credit card debt?',
      options: ['Investing', 'Paying off the debt', 'It never matters'],
      answer: 1,
      explain: 'A 20% debt costs more than investments are likely to earn.',
    },
    { level: 1, q: 'An emergency fund should cover about…', options: ['1 week of expenses', '3–6 months of expenses', '5 years of income'], answer: 1, explain: '3–6 months is the common guide.' },
    { level: 2, q: 'An ETF that tracks the S&P 500 holds…', options: ['About 500 US companies', 'Only Apple', 'Gold'], answer: 0, explain: 'It holds the whole index.' },
    { level: 2, q: 'Over 30 years, a 1% yearly fee…', options: ['Barely matters', 'Can take about a quarter of the final amount', 'Doubles returns'], answer: 1, explain: 'Fees compound against you.' },
    { level: 2, q: 'More bonds in a portfolio usually means…', options: ['Smoother ride, less growth', 'More risk', 'Guaranteed profit'], answer: 0, explain: 'Bonds are steadier and grow less.' },
    { level: 3, q: 'Central bank raises rates. Bond prices usually…', options: ['Rise', 'Fall', 'Do not react'], answer: 1, explain: 'Bond prices move opposite to rates.' },
    { level: 3, q: 'Inflation 4%, savings earn 2%. Real return?', options: ['+6%', 'About −2%', '+2%'], answer: 1, explain: '2% − 4% ≈ −2%.' },
    { level: 3, q: 'USD/ILS falls from 3.7 to 3.3. For a shekel investor in US stocks this is…', options: ['Good', 'Bad', 'Neutral'], answer: 1, explain: 'Dollars convert to fewer shekels.' },
    { level: 4, q: 'A fund falls from 200 to 150. The drawdown is…', options: ['25%', '50%', '33%'], answer: 0, explain: '50 ÷ 200 = 25%.' },
    { level: 4, q: 'Annualized volatility measures…', options: ['How much prices swing', 'The dividend', 'The fee'], answer: 0, explain: 'It is the size of typical swings, scaled to a year.' },
    {
      level: 4,
      q: 'Investing a fixed sum monthly is called…',
      options: ['Dollar-cost averaging', 'Day trading', 'Leverage'],
      answer: 0,
      explain: 'Fixed amounts at regular times = dollar-cost averaging.',
    },
  ],
};

const he: Academy = {
  levels: { 1: 'יסודות הכסף', 2: 'יסודות ההשקעה', 3: 'שווקים וכלכלה', 4: 'משקיע מתקדם' },
  lessons: {
    budget: {
      minutes: 3,
      title: 'להכיר את הכסף הפנוי',
      sections: [
        'כסף פנוי הוא מה שנשאר בכל חודש אחרי כל ההוצאות: הכנסה פחות הוצאות. כל תוכנית מתחילה כאן, כי אפשר לחסוך ולהשקיע רק את מה שנשאר.',
        'כלל אצבע נפוץ הוא 50/30/20: כ-50% לצרכים (שכירות, אוכל, תחבורה), 30% לרצונות, ו-20% לחיסכון והשקעה. זו נקודת פתיחה, לא חוק.',
        'עקבו אחרי ההוצאות חודש אחד. רוב האנשים מגלים שניים-שלושה דברים קטנים שלא שמו לב אליהם, כמו מינויים שלא בשימוש.',
      ],
      takeaway: 'כסף פנוי = הכנסה − הוצאות. כדאי לכוון לחיסכון של כ-20% מההכנסה.',
      quiz: [
        {
          q: 'הכנסה 10,000 בחודש, הוצאות 8,000. כמה כסף פנוי יש?',
          options: ['18,000', '2,000', '8,000'],
          answer: 1,
          explain: 'כסף פנוי הוא הכנסה פחות הוצאות: 10,000 − 8,000 = 2,000.',
        },
        {
          q: 'בכלל 50/30/20, למה מיועדים ה-20%?',
          options: ['לשכירות', 'לחיסכון והשקעה', 'לחופשות'],
          answer: 1,
          explain: '20% לחיסכון והשקעה, 50% לצרכים, 30% לרצונות.',
        },
      ],
    },
    emergency: {
      minutes: 3,
      title: 'קרן החירום שלכם',
      sections: [
        'קרן חירום היא מזומן שאפשר להגיע אליו תוך יום, למקרה של פיטורים, תיקון רכב או הוצאה רפואית. היא מונעת מכירת השקעות ברגע רע או הלוואה יקרה.',
        'יעד נפוץ הוא 3 עד 6 חודשי הוצאות. שמרו אותה בחשבון חיסכון או פיקדון נזיל, לא במניות.',
        'בנו אותה קודם, לפני שמשקיעים. גם חודש הוצאות אחד כבר מגן מרוב ההפתעות.',
      ],
      takeaway: 'החזיקו 3–6 חודשי הוצאות במזומן נזיל לפני שמשקיעים.',
      quiz: [
        {
          q: 'איפה כדאי להחזיק קרן חירום?',
          options: ['במניה אחת', 'במזומן או בחיסכון נזיל', 'באג״ח ל-10 שנים'],
          answer: 1,
          explain: 'היא צריכה להיות בטוחה ונגישה מהר. מניות יכולות להיות בירידה בדיוק כשצריך את הכסף.',
        },
        {
          q: 'ההוצאות 6,000 בחודש. קרן חירום של 3 חודשים היא…',
          options: ['6,000', '18,000', '60,000'],
          answer: 1,
          explain: '3 × 6,000 = 18,000.',
        },
      ],
    },
    debt: {
      minutes: 3,
      title: 'קודם החוב היקר',
      sections: [
        'חוב בכרטיס אשראי או מינוס בבנק עולים לרוב 15–25% בשנה. שוק המניות הניב בערך 7–10% בשנה לאורך תקופות ארוכות, בלי הבטחה.',
        'סגירת חוב של 20% שווה לתשואה בטוחה של 20%. אין השקעה שמנצחת את זה באופן אמין.',
        'החזירו קודם את החוב היקר ביותר, המשיכו בתשלום המינימום על השאר, ואל תיקחו חוב יקר חדש.',
      ],
      takeaway: 'החזר חוב בריבית גבוהה הוא תשואה בטוחה. עשו את זה לפני השקעה.',
      quiz: [
        {
          q: 'יש לכם חוב באשראי בריבית 18% בשנה. מה בדרך כלל קודם?',
          options: ['להשקיע במניות', 'להחזיר את החוב', 'לקנות קריפטו'],
          answer: 1,
          explain: 'החזר חוב של 18% הוא "תשואה" בטוחה של 18%. מניות נותנות פחות בממוצע, ועם סיכון.',
        },
        {
          q: 'כשיש כמה חובות, איזה מחזירים קודם?',
          options: ['את זה עם הריבית הגבוהה ביותר', 'את החדש ביותר', 'תמיד את הקטן ביותר'],
          answer: 0,
          explain: 'הריבית הגבוהה עולה לכם הכי הרבה כל חודש (שיטת "המפולת").',
        },
      ],
    },
    compound: {
      minutes: 3,
      title: 'ריבית דריבית',
      sections: [
        'ריבית דריבית פירושה שהתשואה מרוויחה תשואה. 1,000 ב-7% בשנה הופכים לכ-1,970 אחרי 10 שנים ולכ-7,600 אחרי 30 שנה.',
        '"כלל ה-72": מחלקים 72 בתשואה השנתית ומקבלים בכמה שנים הכסף מוכפל. ב-8% הכסף מוכפל בערך ב-9 שנים.',
        'הזמן חשוב יותר מהתזמון. להתחיל 10 שנים קודם יכול להשפיע יותר מלהשקיע פי שניים מאוחר יותר.',
      ],
      takeaway: 'התחילו מוקדם והישארו מושקעים: הזמן הוא המנוע של ריבית דריבית.',
      quiz: [
        {
          q: 'לפי כלל ה-72, ב-6% בשנה הכסף מוכפל בערך תוך…',
          options: ['6 שנים', '12 שנים', '72 שנים'],
          answer: 1,
          explain: '72 ÷ 6 = 12 שנים.',
        },
        {
          q: 'מה מחזק את אפקט ריבית דריבית?',
          options: ['יותר זמן בהשקעה', 'לבדוק מחירים כל יום', 'למכור אחרי כל עלייה'],
          answer: 0,
          explain: 'ככל שהתשואה נשארת מושקעת זמן רב יותר, היא מרוויחה עוד על עצמה.',
        },
      ],
    },
    stocksBonds: {
      minutes: 3,
      title: 'מניות ואג״ח',
      sections: [
        'מניה היא חלק קטן מחברה. אם החברה גדלה, גם המניה יכולה לעלות, אבל בשנה רעה המחיר יכול לרדת הרבה.',
        'אג״ח היא הלוואה לממשלה או לחברה שמשלמת ריבית. לרוב יציבה יותר, עם צמיחה נמוכה יותר לאורך זמן.',
        'רוב התוכניות משלבות את השתיים. יותר מניות = יותר צמיחה ותנודות גדולות. יותר אג״ח = נסיעה חלקה וצמיחה נמוכה.',
      ],
      takeaway: 'מניות לצמיחה, אג״ח ליציבות. התמהיל קובע את הסיכון.',
      quiz: [
        {
          q: 'מה זה אג״ח?',
          options: ['חלק מחברה', 'הלוואה שמשלמת ריבית', 'סוג של חשבון בנק'],
          answer: 1,
          explain: 'אג״ח היא הלוואה לממשלה או לחברה; מקבלים עליה ריבית.',
        },
        {
          q: 'הוספת אג״ח לתיק בדרך כלל…',
          options: ['מעלה את הסיכון', 'מקטינה תנודות ואת הצמיחה הצפויה', 'מבטיחה רווח'],
          answer: 1,
          explain: 'אג״ח מחליקות את הדרך אבל צומחות לאט יותר ממניות לאורך זמן.',
        },
      ],
    },
    indexFunds: {
      minutes: 3,
      title: 'קרנות מחקות ותעודות סל',
      sections: [
        'מדד עוקב אחרי קבוצת חברות, כמו S&P 500 (500 חברות אמריקאיות גדולות) או ת״א-125 (125 חברות ישראליות גדולות).',
        'קרן מחקה או תעודת סל קונה את כולן בשבילכם. בקנייה אחת מפזרים כסף על מאות חברות.',
        'רוב מנהלי הקרנות לא מנצחים את המדד לאורך 10+ שנים אחרי דמי ניהול. לכן משקיעים רבים לטווח ארוך בוחרים קרנות מחקות זולות.',
      ],
      takeaway: 'קרן מחקה אחת = מאות חברות, דמי ניהול נמוכים ופיזור רחב.',
      quiz: [
        {
          q: 'מה מחזיקה קרן שעוקבת אחרי S&P 500?',
          options: ['חברה גדולה אחת', 'כ-500 חברות אמריקאיות גדולות', 'רק אג״ח'],
          answer: 1,
          explain: 'היא מחזיקה את כ-500 החברות שבמדד.',
        },
        {
          q: 'יתרון מרכזי של קרנות מחקות הוא…',
          options: ['תשואה מובטחת', 'דמי ניהול נמוכים ופיזור רחב', 'אין תנודות מחיר'],
          answer: 1,
          explain: 'הן זולות ומפזרות סיכון. הן עדיין עולות ויורדות עם השוק.',
        },
      ],
    },
    fees: {
      minutes: 2,
      title: 'דמי ניהול אוכלים תשואה',
      sections: [
        'דמי ניהול של 1% בשנה נשמעים מעט. לאורך 30 שנה הם יכולים לקחת כרבע מהסכום הסופי.',
        'בדקו את דמי הניהול של הקרן (expense ratio), עמלות קנייה ומכירה, ודמי ניהול בפנסיה ובקופות.',
        'תעודות סל רחבות עולות לרוב פחות מ-0.1% בשנה. בפנסיה ובקרן ההשתלמות אפשר לבקש הורדת דמי ניהול.',
      ],
      takeaway: 'כל 1% דמי ניהול בשנה הוא 1% פחות צמיחה, בכל שנה.',
      quiz: [
        {
          q: 'קרן א׳ גובה 0.05% בשנה, קרן ב׳ 1.2%. אותו מדד. מי זולה יותר לאורך 20 שנה?',
          options: ['א׳', 'ב׳', 'אותו דבר'],
          answer: 0,
          explain: 'אותן אחזקות, עמלה נמוכה יותר: א׳ משאירה לכם הרבה יותר כסף.',
        },
        {
          q: 'מה זה expense ratio?',
          options: ['דמי הניהול השנתיים של קרן', 'מס על רווחים', 'מחיר המניה'],
          answer: 0,
          explain: 'זה האחוז שהקרן לוקחת בכל שנה כדי לפעול.',
        },
      ],
    },
    diversification: {
      minutes: 3,
      title: 'פיזור',
      sections: [
        'פיזור פירושו לא לשים את כל הכסף בחברה אחת, בענף אחד או במדינה אחת.',
        'אם מניה אחת היא 40% מהתיק והיא יורדת 50%, כל התיק יורד 20%. בתיק מפוזר, אותה ירידה כמעט לא מורגשת.',
        'בדקו בלשונית המניות: תרשים החלוקה מראה כמה כל אחזקה שוקלת. מדריכים רבים שומרים כל מניה בודדת מתחת ל-5–10%.',
      ],
      takeaway: 'פזרו כסף על הרבה חברות ומדינות כדי להקטין את הנזק מכל אחת.',
      quiz: [
        {
          q: 'מניה אחת היא 50% מהתיק ויורדת 20%. התיק יורד בערך…',
          options: ['20%', '10%', '50%'],
          answer: 1,
          explain: 'משקל 50% × ירידה 20% = 10% מכל התיק.',
        },
        {
          q: 'איזה תיק מפוזר יותר?',
          options: ['שלוש מניות טכנולוגיה', 'קרן מחקה גלובלית', 'בנק ישראלי אחד'],
          answer: 1,
          explain: 'קרן גלובלית מחזיקה אלפי חברות בהרבה מדינות.',
        },
      ],
    },
    stockPrice: {
      minutes: 3,
      title: 'מה מזיז את מחיר המניה',
      sections: [
        'המחיר הוא מה שהקונה האחרון שילם על מניה אחת. הוא זז כשקונים ומוכרים משנים את דעתם על הרווחים העתידיים של החברה.',
        'הגורמים העיקריים: דוחות רווח, תחזית החברה, הריבית, וחדשות גדולות על הענף או הכלכלה.',
        'תנודה יומית של 1–2% היא רגילה. טווח 52 השבועות בעמוד המניה מראה כמה היא זזה בשנה.',
      ],
      takeaway: 'מחירים הולכים אחרי הרווחים הצפויים. תנודות קצרות הן רעש.',
      quiz: [
        {
          q: 'חברה מדווחת על רווחים הרבה מעל הציפיות. המניה בדרך כלל…',
          options: ['עולה', 'יורדת', 'לא זזה אף פעם'],
          answer: 0,
          explain: 'רווחים טובים מעלים ציפיות, וקונים מוכנים לשלם יותר. לא תמיד, אבל לרוב.',
        },
        {
          q: 'מה מראה טווח 52 השבועות?',
          options: ['המחיר הנמוך והגבוה בשנה האחרונה', 'תחזית לשנה הבאה', 'הדיבידנד'],
          answer: 0,
          explain: 'זה השפל והשיא של 52 השבועות האחרונים.',
        },
      ],
    },
    rates: {
      minutes: 3,
      title: 'ריבית ושווקים',
      sections: [
        'בנקים מרכזיים (הפד בארה״ב, בנק ישראל) קובעים ריבית בסיס כדי לשלוט באינפלציה.',
        'ריבית גבוהה מייקרת הלוואות ומושכת כסף לפיקדונות בטוחים, ולכן מניות, בעיקר טכנולוגיה צומחת, נוטות לרדת. ריבית נמוכה לרוב עושה את ההפך.',
        'מחירי אג״ח זזים הפוך לריבית: כשהריבית עולה, מחירי אג״ח קיימות יורדים. לכן כספלי מתריעה על החלטות ריבית.',
      ],
      takeaway: 'ריבית עולה: אשראי מתייקר, מניות ואג״ח נוטות לרדת. ולהפך.',
      quiz: [
        {
          q: 'הבנק המרכזי מעלה ריבית. מחירי אג״ח קיימות בדרך כלל…',
          options: ['עולים', 'יורדים', 'לא משתנים'],
          answer: 1,
          explain: 'אג״ח חדשות משלמות יותר, ולכן הישנות שמשלמות פחות שוות פחות.',
        },
        {
          q: 'אילו מניות מגיבות לרוב הכי חזק לשינויי ריבית?',
          options: ['חברות טכנולוגיה צומחות', 'אף אחת', 'רק בנקים, תמיד למעלה'],
          answer: 0,
          explain: 'השווי שלהן תלוי ברווחים רחוקים בעתיד, שריבית גבוהה מהוונת יותר.',
        },
      ],
    },
    inflation: {
      minutes: 2,
      title: 'אינפלציה',
      sections: [
        'אינפלציה היא עליית מחירים לאורך זמן, לרוב 2–3% בשנה. מודדים אותה במדד המחירים לצרכן.',
        'מזומן שמרוויח פחות מהאינפלציה מאבד כוח קנייה. 100 היום יקנו רק כ-74 ממוצרי היום אחרי 10 שנים באינפלציה של 3%.',
        'חדשות על אינפלציה גבוהה דוחפות לרוב בנקים מרכזיים להעלות ריבית, וזה מזיז שווקים. התחזיות בכספלי מוצגות לפני אינפלציה.',
      ],
      takeaway: 'הכסף צריך לצמוח מהר יותר מהאינפלציה רק כדי לשמור על ערכו.',
      quiz: [
        {
          q: 'החיסכון מרוויח 1% והאינפלציה 3%. כוח הקנייה שלכם…',
          options: ['גדל', 'קטן', 'נשאר אותו דבר'],
          answer: 1,
          explain: 'תשואה ריאלית = 1% − 3% = בערך −2% בשנה.',
        },
        {
          q: 'איזה מדד מודד אינפלציה לצרכן?',
          options: ['מדד המחירים לצרכן (CPI)', 'תוצר (GDP)', 'מכפיל רווח (P/E)'],
          answer: 0,
          explain: 'מדד המחירים לצרכן עוקב אחרי מחירי מוצרים ושירותים יומיומיים.',
        },
      ],
    },
    currency: {
      minutes: 3,
      title: 'סיכון מטבע (דולר / שקל)',
      sections: [
        'אם אתם מוציאים שקלים ומחזיקים השקעות בארה״ב, שער הדולר-שקל משנה את התוצאה בשקלים.',
        'שקל חזק (פחות שקלים לדולר) מקטין רווחים אמריקאיים במונחי שקל. שקל חלש מגדיל אותם.',
        'כספלי מציגה את שער הדולר-שקל החי במסך הבית וממירה את שווי התיק, כך שרואים את שני האפקטים.',
      ],
      takeaway: 'השקעה במט״ח נושאת סיכון מטבע בנוסף לסיכון השוק.',
      quiz: [
        {
          q: 'הקרן האמריקאית שלכם לא זזה בדולרים, והשקל מתחזק. בשקלים אתם…',
          options: ['מרוויחים', 'מפסידים', 'באיזון'],
          answer: 1,
          explain: 'כל דולר שווה עכשיו פחות שקלים, ולכן השווי בשקלים יורד.',
        },
        {
          q: 'שער הדולר יורד מ-3.6 ל-3.2. השקל…',
          options: ['התחזק', 'נחלש', 'לא השתנה'],
          answer: 0,
          explain: 'צריך פחות שקלים לדולר אחד: השקל חזק יותר.',
        },
      ],
    },
    risk: {
      minutes: 3,
      title: 'סיכון, תנודתיות וירידות',
      sections: [
        'תנודתיות מודדת כמה המחיר קופץ. ירידה מהשיא (drawdown) היא הנפילה משיא לשפל. בשוקי מניות היו ירידות של 30–50%.',
        'הסיכון שאפשר לשאת תלוי בזמן: כסף שצריך בעוד שנתיים לא אמור להיות בעיקר במניות; כסף ל-20 שנה יכול.',
        'לפני ירידה, החליטו מה תעשו. מכירה בבהלה הופכת ירידה זמנית להפסד קבוע.',
      ],
      takeaway: 'התאימו את הסיכון לטווח הזמן, ותכננו ירידות לפני שהן קורות.',
      quiz: [
        {
          q: 'מניה יורדת מ-100 ל-60. הירידה מהשיא היא…',
          options: ['40%', '60%', '160%'],
          answer: 0,
          explain: '(60 − 100) ÷ 100 = −40%.',
        },
        {
          q: 'אתם צריכים את הכסף בעוד 18 חודשים לדירה. רוב הכסף במניות זה…',
          options: ['לרוב מסוכן מדי', 'הבחירה הבטוחה ביותר', 'חובה'],
          answer: 0,
          explain: 'בטווח קצר אולי לא יהיה זמן להתאושש מירידה בשוק.',
        },
      ],
    },
    dca: {
      minutes: 2,
      title: 'השקעה חודשית מול תזמון',
      sections: [
        'אף אחד לא חוזה באופן אמין את היום הטוב לקנות. השקעת סכום קבוע כל חודש מורידה את הניחושים.',
        'כשהמחירים נמוכים, אותו סכום קונה יותר יחידות. כשגבוהים, פחות. לאורך זמן זה מתאזן.',
        'הוראת קבע אצל הברוקר או בבנק הופכת את זה לאוטומטי, כך שהרגש לא מחליט.',
      ],
      takeaway: 'סכום חודשי קבוע עדיף לרוב האנשים על ניסיון לתזמן את השוק.',
      quiz: [
        {
          q: 'בסכום חודשי קבוע, כשהמחירים נמוכים קונים…',
          options: ['יותר יחידות', 'פחות יחידות', 'כלום'],
          answer: 0,
          explain: 'אותו כסף קונה יותר יחידות במחיר נמוך.',
        },
        {
          q: 'היתרון העיקרי של השקעה חודשית הוא…',
          options: ['לא צריך לנחש את היום הנכון', 'רווח מובטח', 'אין עמלות בכלל'],
          answer: 0,
          explain: 'זה בונה הרגל ומונע טעויות תזמון. זה לא מבטיח רווח.',
        },
      ],
    },
    tax: {
      minutes: 3,
      title: 'חשבונות עם הטבות מס',
      sections: [
        'ארה״ב: חשבונות 401(k) ו-IRA מאפשרים צמיחה עם הטבות מס. Roth IRA צומח פטור ממס בתנאים. הפקדת מעסיק (match) היא כסף חינם.',
        'ישראל: לפנסיה ולקרן ההשתלמות יש הטבות מס; קרן השתלמות פטורה ממס אחרי 6 שנים. קופת גמל להשקעה מוסיפה גמישות.',
        'כשזה מתאים לתוכנית, מלאו קודם חשבונות עם הטבות מס ורק אחר כך חשבון מסחר רגיל. להתאמה אישית פנו ליועץ מורשה.',
      ],
      takeaway: 'השתמשו קודם בחשבונות עם הטבות מס: פחות מס = יותר ריבית דריבית.',
      quiz: [
        {
          q: 'קרן השתלמות בישראל פטורה ממס אחרי…',
          options: ['שנה', '6 שנים', '30 שנה'],
          answer: 1,
          explain: 'אחרי 6 שנים אפשר למשוך את הרווחים בפטור ממס (עד התקרה).',
        },
        {
          q: 'הפקדת מעסיק ל-401(k) היא…',
          options: ['כסף נוסף שהמעסיק מוסיף', 'עמלה', 'הלוואה'],
          answer: 0,
          explain: 'המעסיק מוסיף כסף כשאתם מפקידים, תשואה מיידית.',
        },
      ],
    },
    news: {
      minutes: 3,
      title: 'לקרוא חדשות שוק ברוגע',
      sections: [
        'התראות האירועים של כספלי מתייגות כל ידיעה: נושא (ריבית, אינפלציה, מלחמה, דוחות…), השפעה, ואילו מהמניות שלכם היא נוגעת.',
        'שאלו שלוש שאלות: האם זה משנה את רווחי החברה לשנים, או רק לשבוע? האם זה כבר במחיר? האם זה משנה את התוכנית שלי?',
        'רוב החדשות לא משנות תוכנית ארוכת טווח. הגיבו לשינויים בחיים ובמטרות שלכם, לא לכותרות.',
      ],
      takeaway: 'השתמשו בחדשות כדי להבין, לא כדי להגיב. התוכנית קודמת.',
      quiz: [
        {
          q: 'כותרת מפחידה מורידה את השוק ב-2% היום. לתוכנית של 20 שנה זה בדרך כלל…',
          options: ['למכור הכל', 'משמעות קטנה; להישאר בתוכנית', 'ללוות כדי לקנות עוד'],
          answer: 1,
          explain: 'תנודות יומיות הן רגילות; תוכניות ארוכות בנויות לעבור אותן.',
        },
        {
          q: 'שאלה ראשונה טובה על חדשות שוק היא…',
          options: ['האם זה משנה רווחים לטווח ארוך?', 'האם כולם מוכרים?', 'האם הכותרת אדומה?'],
          answer: 0,
          explain: 'השפעה מתמשכת על רווחים חשובה; רעש קצר טווח לרוב נעלם.',
        },
      ],
    },
  },
  placement: [
    { level: 1, q: 'הכנסה 12,000, הוצאות 9,000 בחודש. כמה כסף פנוי?', options: ['3,000', '21,000', '9,000'], answer: 0, explain: '12,000 − 9,000 = 3,000.' },
    {
      level: 1,
      q: 'מה בדרך כלל קודם: להשקיע, או להחזיר חוב אשראי בריבית 20%?',
      options: ['להשקיע', 'להחזיר את החוב', 'זה אף פעם לא משנה'],
      answer: 1,
      explain: 'חוב של 20% עולה יותר ממה שהשקעות צפויות להרוויח.',
    },
    { level: 1, q: 'קרן חירום צריכה לכסות בערך…', options: ['שבוע הוצאות', '3–6 חודשי הוצאות', '5 שנות הכנסה'], answer: 1, explain: '3–6 חודשים הוא כלל האצבע.' },
    { level: 2, q: 'תעודת סל על S&P 500 מחזיקה…', options: ['כ-500 חברות אמריקאיות', 'רק את אפל', 'זהב'], answer: 0, explain: 'היא מחזיקה את כל המדד.' },
    { level: 2, q: 'לאורך 30 שנה, דמי ניהול של 1% בשנה…', options: ['כמעט לא משנים', 'יכולים לקחת כרבע מהסכום הסופי', 'מכפילים את התשואה'], answer: 1, explain: 'דמי ניהול מצטברים נגדכם.' },
    { level: 2, q: 'יותר אג״ח בתיק בדרך כלל אומר…', options: ['נסיעה חלקה, פחות צמיחה', 'יותר סיכון', 'רווח מובטח'], answer: 0, explain: 'אג״ח יציבות יותר וצומחות פחות.' },
    { level: 3, q: 'הבנק המרכזי מעלה ריבית. מחירי אג״ח בדרך כלל…', options: ['עולים', 'יורדים', 'לא מגיבים'], answer: 1, explain: 'מחירי אג״ח זזים הפוך לריבית.' },
    { level: 3, q: 'אינפלציה 4%, החיסכון מרוויח 2%. מה התשואה הריאלית?', options: ['+6%', 'בערך −2%', '+2%'], answer: 1, explain: '2% − 4% ≈ −2%.' },
    { level: 3, q: 'הדולר יורד מ-3.7 ל-3.3 שקלים. למשקיע בשקלים במניות בארה״ב זה…', options: ['טוב', 'רע', 'ניטרלי'], answer: 1, explain: 'דולרים מומרים לפחות שקלים.' },
    { level: 4, q: 'קרן יורדת מ-200 ל-150. הירידה מהשיא היא…', options: ['25%', '50%', '33%'], answer: 0, explain: '50 ÷ 200 = 25%.' },
    { level: 4, q: 'תנודתיות שנתית מודדת…', options: ['כמה המחירים קופצים', 'את הדיבידנד', 'את דמי הניהול'], answer: 0, explain: 'זה גודל התנודות הטיפוסיות, בקנה מידה שנתי.' },
    {
      level: 4,
      q: 'השקעת סכום קבוע כל חודש נקראת…',
      options: ['ממוצע עלות (DCA)', 'מסחר יומי', 'מינוף'],
      answer: 0,
      explain: 'סכומים קבועים בזמנים קבועים = ממוצע עלות דולרי.',
    },
  ],
};

export const ACADEMY: Record<Lang, Academy> = { en, he };
