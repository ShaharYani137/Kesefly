/**
 * UI strings. Placeholders use {name}. Keep both languages in sync:
 * the `Strings` type is derived from English, so a missing Hebrew key fails typecheck.
 */
const en = {
  appName: 'Kesefly',
  common: {
    next: 'Next',
    back: 'Back',
    save: 'Save',
    done: 'Done',
    perMonth: '/mo',
    years: '{n} years',
    year: 'Year {n}',
  },
  disclaimer:
    'Education and planning only, not investment advice. Forecasts use simplified assumptions and are not guaranteed. You make and carry out every decision in your own bank or broker.',
  onboarding: {
    welcomeTitle: 'Hi, I’m Kesefly',
    welcomeBody:
      'Your personal money helper. Tell me your income and a goal. I show a forecast range, explain the basics, track stocks you care about, and suggest next steps. I never trade for you.',
    start: 'Get started',
    whereTitle: 'Where do you live?',
    country: 'Country',
    currency: 'Currency',
    incomeTitle: 'Your monthly money',
    incomeHint: 'After tax. Rough numbers are fine.',
    savingsTitle: 'What you have today',
    goalTitle: 'Your goal',
    riskTitle: 'How do you feel about risk?',
    riskHint: 'Higher risk means bigger ups and downs, and usually higher long-term growth.',
    finish: 'See my plan',
    step: 'Step {n} of {total}',
  },
  fields: {
    monthlyIncome: 'Monthly income',
    monthlyExpenses: 'Monthly expenses',
    monthlyInvest: 'Planned monthly investing',
    monthlyInvestHint: 'You have {free} left each month.',
    cashSavings: 'Cash savings',
    investments: 'Current investments',
    highInterestDebt: 'High-interest debt',
    highInterestDebtHint: 'Credit cards, overdraft, loans above ~8%.',
    goalName: 'Goal name',
    goalNamePlaceholder: 'Home down payment',
    goalAmount: 'Target amount',
    goalYears: 'Years to goal',
  },
  country: { US: 'United States', IL: 'Israel' },
  risk: {
    conservative: 'Careful',
    balanced: 'Balanced',
    growth: 'Growth',
    conservativeBody: 'About 30% stocks. Smaller swings, slower growth.',
    balancedBody: 'About 60% stocks. Medium swings.',
    growthBody: 'About 90% stocks. Big swings, best for 10+ years.',
  },
  tabs: { home: 'Home', helper: 'Helper', plan: 'Plan', stocks: 'Stocks', learn: 'Learn' },
  home: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    subtitle: 'Here is your money today.',
    helperSays: 'Kesefly suggests',
    askAbout: 'Ask me about this',
    freeCash: 'Left each month',
    netWorth: 'Savings + investments',
    savingsRate: 'Savings rate',
    goalProgress: 'Goal progress',
    chance: '{p} chance to reach it',
    checkupTitle: 'Money check-up',
    checkupScore: '{n} of {total} done',
    checks: {
      cashFlow: 'Spend less than you earn',
      noDebt: 'No high-interest debt',
      emergency: 'Emergency fund ready',
      investing: 'Investing every month',
      goal: 'Goal on track',
    },
    quick: 'Quick actions',
    quickHelper: 'Ask Kesefly',
    quickStocks: 'Stocks',
    quickPlan: 'Forecast',
    topIdeas: 'Next steps',
    seeAll: 'See all ideas',
    settings: 'Settings',
  },
  helper: {
    title: 'Ask Kesefly',
    subtitle: 'Your money helper. Works offline, knows your plan.',
    placeholder: 'Ask about saving, debt, funds, or a stock…',
    send: 'Send',
    clear: 'New chat',
    you: 'You',
    welcome:
      'Hi! I’m Kesefly. Ask me how you are doing, how much to invest, about debt, index funds, risk, tax accounts, or a stock price like AAPL.',
    suggestions: ['How am I doing?', 'How much should I invest?', 'What is an index fund?', 'Price of AAPL'],
    answers: {
      greet: 'Hi! What would you like to look at: your plan, saving, or stocks?',
      thanks: 'Happy to help. Ask me anything else about your money.',
      summary:
        'Here is your snapshot. You have {free} left each month, a savings rate of {rate}, and {worth} in savings and investments. Your money check-up is {checks} of 5. {goalLine}',
      summaryGoal: 'Your goal "{goal}" has about a {chance} chance in {years} years.',
      summaryNoGoal: 'Set a goal so I can forecast it.',
      emergencyMissing:
        'An emergency fund covers about 6 months of expenses: {target} for you. You have {cash}, so {missing} is missing. Keep it in a high-yield savings or money market account, not in stocks.',
      emergencyOk:
        'Your emergency fund is covered: {cash} against a target of {target} (6 months of expenses). Money above that can go toward your goal.',
      debtSome:
        'You have {debt} of high-interest debt. Paying it off is a guaranteed return of 15%+ a year, better than any fund. Pay the highest rate first, then invest.',
      debtNone: 'You have no high-interest debt. Great: that is one of the most important steps.',
      howMuch:
        'You have {free} left each month and plan to invest {invest}. For the likely case to reach your goal, about {needed} a month is needed. Keep your emergency fund and debts in order first.',
      howMuchNoFree:
        'Right now you spend more than you earn, by {gap} a month. Fix that first: cut a regular cost or raise income. Investing comes after.',
      goal:
        'Goal "{goal}": {amount} in {years} years. Bad case {low}, likely {mid}, good case {high}. Chance to reach it: about {chance}. Open the Plan tab to try changes.',
      goalNone: 'You have no goal yet. Edit your numbers in Settings to add one.',
      indexFunds:
        'An index fund buys every company in an index, like the S&P 500 or TA-125. One purchase gives you wide diversification and very low fees (often under 0.25% a year). They are a simple core for most long-term plans.',
      stocksBonds:
        'Stocks grow more but drop harder. Bonds are steadier and grow less. Your "{risk}" profile suggests about {stocks}% stocks and {bonds}% bonds.',
      risk:
        'Your risk profile is "{risk}". Higher risk means bigger swings and usually more long-term growth. For money needed in under 3 years, a careful mix is safer.',
      inflation:
        'Prices rise about 2–3% a year. Cash that earns less than that loses buying power. My forecasts are before inflation, so real buying power will be lower.',
      compound:
        'Compound growth means returns earn returns. 1,000 at 7% a year grows to about 2,000 in 10 years and 7,600 in 30. Starting early matters most.',
      fees: 'A 1% yearly fee can eat about a fifth of your result over 25 years. Prefer funds with fees under 0.25%.',
      taxUS:
        'In the US: take the full employer 401(k) match first (free money), then a Roth or traditional IRA, then a taxable account.',
      taxIL:
        'In Israel: a Keren Hishtalmut grows tax-free after 6 years, up to the legal ceiling. Also check your pension fund fees: they compound for decades.',
      currency:
        'If you live on shekels and own US funds, the USD/ILS rate moves your result. A stronger shekel lowers US gains in shekel terms. Many people hold a mix of both.',
      noAdvice:
        'I can’t tell you to buy or sell a specific stock: I’m an education tool, not a licensed adviser. A common approach is a diversified index fund core, with single stocks as a small part. Want the price of a stock? Type its symbol, like MSFT.',
      crypto:
        'Crypto can swing 50%+ in a year and has no earnings behind it. If you hold any, many planners suggest only a small share you can afford to lose.',
      quote: '{symbol} is at {price}, {change} today ({pct}). Day range {low} – {high}. Prices may be delayed. This is not a buy or sell signal.',
      quoteNoKey: 'To show live prices, add your free Finnhub key in the Stocks tab.',
      quoteFail: 'I couldn’t get a price for {symbol}. Check the symbol or try again later.',
      unknown:
        'I’m still learning that one. I can help with: your snapshot, how much to invest, emergency fund, debt, index funds, risk, tax accounts, inflation, fees, and stock prices.',
    },
  },
  plan: {
    title: 'Forecast',
    subtitle: '{goal} in {years} years',
    goalLine: 'Goal',
    badCase: 'Bad case',
    likely: 'Likely',
    goodCase: 'Good case',
    rangeNote: '8 in 10 outcomes land between bad and good case under these assumptions.',
    deposited: 'You deposit',
    needed: 'Monthly needed for likely case',
    assumptions: 'Assumptions',
    assumptionsBody: 'Average yearly return {mean}, yearly swings {vol}. Before inflation, fees, and tax.',
    adjust: 'Try changes',
  },
  stocks: {
    title: 'Stocks',
    subtitle: 'Track prices. Learn what moves them.',
    keyTitle: 'Connect live prices',
    keyBody:
      'Kesefly uses Finnhub for prices. Get a free key in 1 minute: open finnhub.io, sign up, and copy the API key from your dashboard.',
    keyOpen: 'Open finnhub.io',
    keyPlaceholder: 'Paste your API key',
    keySave: 'Save key',
    keyRemove: 'Remove key',
    keyStored: 'Your key is stored only on this device.',
    watchlist: 'Watchlist',
    addPlaceholder: 'Add symbol, e.g. AAPL',
    add: 'Add',
    remove: 'Remove {symbol}',
    refresh: 'Refresh',
    loading: 'Loading…',
    error: 'Couldn’t load prices. Check your key and connection.',
    notFound: 'No price for {symbol}. US symbols only on the free plan.',
    updated: 'Updated {time}',
    open: 'Open',
    prevClose: 'Prev. close',
    dayRange: 'Day range',
    israelNote:
      'Israeli companies traded in New York (TEVA, CHKP, NICE, ESLT) show here. Tel Aviv (TASE) prices need a paid data plan.',
    priceNote: 'Prices from Finnhub, may be delayed. Not a buy or sell signal.',
    names: {
      SPY: 'S&P 500 index fund',
      QQQ: 'Nasdaq-100 index fund',
      VT: 'Whole-world index fund',
      AAPL: 'Apple',
      MSFT: 'Microsoft',
      NVDA: 'Nvidia',
      TEVA: 'Teva (Israel)',
      CHKP: 'Check Point (Israel)',
      NICE: 'NICE (Israel)',
      ESLT: 'Elbit Systems (Israel)',
    } as Record<string, string>,
    learnTitle: 'Before you pick stocks',
    learnBody:
      'One company can fall 50% or more. An index fund spreads your money over hundreds of companies. Many planners keep single stocks under 5–10% of investments.',
  },
  ideas: {
    title: 'Ideas',
    subtitle: 'Ordered by priority. You decide what to do.',
    negativeCashFlow: {
      title: 'Spending is above income',
      body: 'You spend {gap} more than you earn each month. Fix this before investing: cut a regular cost or raise income.',
    },
    investOverBudget: {
      title: 'Plan exceeds free cash',
      body: 'You plan to invest {invest}, but only {free} is left each month. Lower the plan so you do not borrow.',
    },
    payDebt: {
      title: 'Pay off high-interest debt first',
      body: 'Paying {debt} of debt at 15%+ interest is a guaranteed return that no fund matches. Pay the highest rate first.',
    },
    emergencyFund: {
      title: 'Build an emergency fund',
      body: 'Keep {months} months of expenses ({target}) in cash. You need {missing} more. Use a high-yield savings or money market account.',
    },
    idleCash: {
      title: 'Cash may be sitting idle',
      body: 'You hold about {extra} above your emergency fund. Inflation shrinks idle cash. Consider investing part of it toward your goal.',
    },
    taxUS: {
      title: 'Use tax-advantaged accounts',
      body: 'Get the full employer 401(k) match first: it is free money. Then consider a Roth or traditional IRA before a taxable account.',
    },
    taxIL: {
      title: 'Use Keren Hishtalmut first',
      body: 'A Keren Hishtalmut (study fund) grows tax-free after 6 years, up to the legal ceiling. Check your pension fees too: they compound for decades.',
    },
    goalGap: {
      title: 'Goal is at risk',
      body: 'Chance to reach the goal is about {chance}%. To hit it in the likely case, invest about {needed} each month, or give it more years.',
    },
    goalOnTrack: {
      title: 'Goal looks on track',
      body: 'Chance to reach the goal is about {chance}%. Keep monthly deposits steady, even when markets fall.',
    },
    shortHorizon: {
      title: 'Short timeline, high risk',
      body: 'Your goal is {years} years away. Stocks can drop 30%+ in a year. For money needed soon, a careful mix is safer.',
    },
    allocationUS: {
      title: 'Suggested mix: {stocks}% stocks, {bonds}% bonds',
      body: 'One simple way: a broad US or world index fund for stocks and a Treasury or aggregate bond index fund for bonds. Rebalance once a year.',
    },
    allocationIL: {
      title: 'Suggested mix: {stocks}% stocks, {bonds}% bonds',
      body: 'One simple way: index funds tracking the S&P 500 or a world index, plus TA-125, for stocks; Israeli government bond funds for bonds. Rebalance once a year.',
    },
    lowFees: {
      title: 'Keep fees low',
      body: 'A 1% yearly fee can eat about a fifth of your result over 25 years. Prefer index funds with fees under 0.25%.',
    },
  },
  learn: {
    title: 'Learn',
    subtitle: 'Short lessons. Two minutes each.',
    lessons: [
      {
        title: 'Compound growth',
        body: 'Returns earn returns. 1,000 at 7% a year becomes about 2,000 in 10 years and 7,600 in 30. Time in the market matters more than timing it.',
      },
      {
        title: 'Stocks vs. bonds',
        body: 'A stock is a small piece of a company: higher growth, bigger drops. A bond is a loan to a government or company: steadier, lower growth. A mix of both smooths the ride.',
      },
      {
        title: 'Index funds',
        body: 'An index fund buys every company in an index, like the S&P 500 or TA-125. You get wide diversification and very low fees in one purchase.',
      },
      {
        title: 'What a stock price means',
        body: 'The price is what the last buyer paid for one share. It moves with news, earnings, and interest rates. A daily move of 1–2% is normal and says little about the long run.',
      },
      {
        title: 'Diversification',
        body: 'Do not put all your money in one company or one country. Spreading it out lowers the damage when one part falls.',
      },
      {
        title: 'Risk and time',
        body: 'Markets fall often in the short run and have risen over most long periods. The longer your goal, the more risk you can usually take.',
      },
      {
        title: 'Inflation',
        body: 'Prices rise about 2–3% a year. Cash that earns less than inflation loses buying power. Forecasts in this app are before inflation.',
      },
      {
        title: 'Why forecasts are ranges',
        body: 'Nobody knows next year’s return. We show a bad, likely, and good case so you plan for a range, not a promise.',
      },
      {
        title: 'Currency risk (USD / ILS)',
        body: 'If you live on shekels and own US funds, the exchange rate moves your result. A stronger shekel lowers US gains in ILS terms, and a weaker shekel raises them.',
      },
    ],
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    currency: 'Currency',
    editProfile: 'Edit my numbers',
    reset: 'Delete all data',
    resetConfirmTitle: 'Delete all data?',
    resetConfirmBody: 'Your numbers are stored only on this device. This cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    about: 'About',
    privacy:
      'Your numbers stay on this device and are never sent to a server. Only stock symbols go to Finnhub, to fetch prices.',
    version: 'Kesefly {v}',
  },
};

export type Strings = typeof en;

const he: Strings = {
  appName: 'כספלי',
  common: {
    next: 'הבא',
    back: 'חזרה',
    save: 'שמירה',
    done: 'סיום',
    perMonth: '/חודש',
    years: '{n} שנים',
    year: 'שנה {n}',
  },
  disclaimer:
    'לימוד ותכנון בלבד, לא ייעוץ השקעות. התחזיות מבוססות על הנחות פשוטות ואינן מובטחות. כל החלטה מתקבלת ומבוצעת על ידך, בבנק או אצל הברוקר שלך.',
  onboarding: {
    welcomeTitle: 'היי, אני כספלי',
    welcomeBody:
      'העוזר האישי שלכם לכסף. ספרו לי על ההכנסה ועל יעד. אציג טווח תחזית, אסביר את הבסיס, אעקוב אחרי מניות שמעניינות אתכם ואציע צעדים הבאים. אני אף פעם לא מבצע עסקאות בשבילכם.',
    start: 'בואו נתחיל',
    whereTitle: 'איפה אתם גרים?',
    country: 'מדינה',
    currency: 'מטבע',
    incomeTitle: 'הכסף החודשי שלכם',
    incomeHint: 'נטו, אחרי מס. מספרים בערך זה בסדר.',
    savingsTitle: 'מה יש לכם היום',
    goalTitle: 'היעד שלכם',
    riskTitle: 'מה היחס שלכם לסיכון?',
    riskHint: 'סיכון גבוה יותר אומר עליות וירידות חדות יותר, ובדרך כלל צמיחה גבוהה יותר לטווח ארוך.',
    finish: 'הצג את התוכנית',
    step: 'שלב {n} מתוך {total}',
  },
  fields: {
    monthlyIncome: 'הכנסה חודשית',
    monthlyExpenses: 'הוצאות חודשיות',
    monthlyInvest: 'השקעה חודשית מתוכננת',
    monthlyInvestHint: 'נשארים לכם {free} בכל חודש.',
    cashSavings: 'חסכונות במזומן',
    investments: 'השקעות קיימות',
    highInterestDebt: 'חוב בריבית גבוהה',
    highInterestDebtHint: 'כרטיסי אשראי, מינוס, הלוואות מעל כ-8%.',
    goalName: 'שם היעד',
    goalNamePlaceholder: 'הון עצמי לדירה',
    goalAmount: 'סכום היעד',
    goalYears: 'שנים עד היעד',
  },
  country: { US: 'ארצות הברית', IL: 'ישראל' },
  risk: {
    conservative: 'זהיר',
    balanced: 'מאוזן',
    growth: 'צמיחה',
    conservativeBody: 'כ-30% מניות. תנודות קטנות, צמיחה איטית.',
    balancedBody: 'כ-60% מניות. תנודות בינוניות.',
    growthBody: 'כ-90% מניות. תנודות חדות, מתאים ל-10 שנים ומעלה.',
  },
  tabs: { home: 'בית', helper: 'עוזר', plan: 'תוכנית', stocks: 'מניות', learn: 'לימוד' },
  home: {
    morning: 'בוקר טוב',
    afternoon: 'צהריים טובים',
    evening: 'ערב טוב',
    subtitle: 'ככה נראה הכסף שלכם היום.',
    helperSays: 'כספלי מציע',
    askAbout: 'לשאול אותי על זה',
    freeCash: 'נשאר בכל חודש',
    netWorth: 'חסכונות + השקעות',
    savingsRate: 'שיעור חיסכון',
    goalProgress: 'התקדמות ליעד',
    chance: 'סיכוי של {p} להגיע ליעד',
    checkupTitle: 'בדיקת מצב כספי',
    checkupScore: '{n} מתוך {total} הושלמו',
    checks: {
      cashFlow: 'מוציאים פחות ממה שמרוויחים',
      noDebt: 'אין חוב בריבית גבוהה',
      emergency: 'קרן חירום מוכנה',
      investing: 'משקיעים כל חודש',
      goal: 'היעד במסלול',
    },
    quick: 'פעולות מהירות',
    quickHelper: 'לשאול את כספלי',
    quickStocks: 'מניות',
    quickPlan: 'תחזית',
    topIdeas: 'הצעדים הבאים',
    seeAll: 'לכל הרעיונות',
    settings: 'הגדרות',
  },
  helper: {
    title: 'לשאול את כספלי',
    subtitle: 'העוזר שלכם לכסף. עובד בלי אינטרנט ומכיר את התוכנית שלכם.',
    placeholder: 'שאלו על חיסכון, חובות, קרנות או מניה…',
    send: 'שליחה',
    clear: 'שיחה חדשה',
    you: 'אתם',
    welcome:
      'היי! אני כספלי. שאלו אותי מה המצב שלכם, כמה להשקיע, על חובות, קרנות מחקות, סיכון, קרן השתלמות, או מחיר של מניה כמו AAPL.',
    suggestions: ['מה המצב שלי?', 'כמה כדאי להשקיע?', 'מה זו קרן מחקה?', 'מחיר AAPL'],
    answers: {
      greet: 'היי! במה נתמקד: התוכנית, חיסכון או מניות?',
      thanks: 'בשמחה. אפשר לשאול אותי כל דבר נוסף על הכסף שלכם.',
      summary:
        'זו תמונת המצב שלכם. נשארים לכם {free} בכל חודש, שיעור החיסכון {rate}, ויש לכם {worth} בחסכונות ובהשקעות. בבדיקת המצב הכספי השלמתם {checks} מתוך 5. {goalLine}',
      summaryGoal: 'ליעד "{goal}" יש סיכוי של כ-{chance} בעוד {years} שנים.',
      summaryNoGoal: 'הגדירו יעד כדי שאוכל לחשב לו תחזית.',
      emergencyMissing:
        'קרן חירום מכסה כ-6 חודשי הוצאות: {target} אצלכם. יש לכם {cash}, כלומר חסרים {missing}. שמרו אותה בפיקדון נזיל או בקרן כספית, לא במניות.',
      emergencyOk:
        'קרן החירום מכוסה: {cash} מול יעד של {target} (6 חודשי הוצאות). כסף מעבר לזה יכול לעבוד לטובת היעד.',
      debtSome:
        'יש לכם {debt} חוב בריבית גבוהה. סגירתו היא תשואה מובטחת של 15% ומעלה בשנה, יותר מכל קרן. התחילו מהריבית הגבוהה ביותר, ואז השקיעו.',
      debtNone: 'אין לכם חוב בריבית גבוהה. מצוין: זה אחד הצעדים החשובים ביותר.',
      howMuch:
        'נשארים לכם {free} בכל חודש, ותכננתם להשקיע {invest}. כדי להגיע ליעד בתרחיש הסביר צריך כ-{needed} בחודש. קודם כדאי לסדר קרן חירום וחובות.',
      howMuchNoFree:
        'כרגע ההוצאות גבוהות מההכנסה ב-{gap} בחודש. קודם לתקן את זה: לקצץ הוצאה קבועה או להגדיל הכנסה. ההשקעה באה אחר כך.',
      goal:
        'היעד "{goal}": {amount} בעוד {years} שנים. תרחיש רע {low}, סביר {mid}, טוב {high}. סיכוי להגיע: כ-{chance}. בלשונית תוכנית אפשר לנסות שינויים.',
      goalNone: 'עדיין אין לכם יעד. אפשר להוסיף אחד בהגדרות, תחת עריכת המספרים.',
      indexFunds:
        'קרן מחקה קונה את כל החברות במדד, כמו S&P 500 או ת״א-125. ברכישה אחת מקבלים פיזור רחב ודמי ניהול נמוכים מאוד (לרוב מתחת ל-0.25% בשנה). זה בסיס פשוט לרוב התוכניות לטווח ארוך.',
      stocksBonds:
        'מניות צומחות יותר אבל יורדות חזק יותר. אג״ח יציבות יותר וצומחות פחות. לפי פרופיל "{risk}" מתאים בערך {stocks}% מניות ו-{bonds}% אג״ח.',
      risk:
        'פרופיל הסיכון שלכם הוא "{risk}". סיכון גבוה יותר אומר תנודות חדות יותר ובדרך כלל צמיחה גבוהה יותר לטווח ארוך. לכסף שצריך בפחות מ-3 שנים, תמהיל זהיר בטוח יותר.',
      inflation:
        'מחירים עולים בכ-2–3% בשנה. מזומן שמרוויח פחות מזה מאבד כוח קנייה. התחזיות שלי הן לפני אינפלציה, כך שכוח הקנייה בפועל יהיה נמוך יותר.',
      compound:
        'ריבית דריבית: התשואה מרוויחה תשואה. 1,000 ב-7% בשנה גדלים לכ-2,000 אחרי 10 שנים ולכ-7,600 אחרי 30. הכי חשוב להתחיל מוקדם.',
      fees: 'דמי ניהול של 1% בשנה יכולים לאכול כחמישית מהתוצאה לאורך 25 שנה. העדיפו קרנות עם דמי ניהול מתחת ל-0.25%.',
      taxUS:
        'בארה״ב: קודם לנצל את מלוא ההתאמה של המעסיק ב-401(k) (כסף חינם), אחר כך Roth IRA או IRA רגיל, ורק אז חשבון רגיל.',
      taxIL:
        'בישראל: קרן השתלמות פטורה ממס רווחי הון אחרי 6 שנים, עד התקרה בחוק. בדקו גם את דמי הניהול בקרן הפנסיה: הם מצטברים לאורך עשרות שנים.',
      currency:
        'אם אתם חיים בשקלים ומחזיקים קרנות אמריקאיות, שער הדולר משפיע על התוצאה. שקל חזק מקטין את הרווח בשקלים. הרבה אנשים מחזיקים שילוב של שניהם.',
      noAdvice:
        'אני לא יכול להמליץ לקנות או למכור מניה מסוימת: אני כלי לימוד, לא יועץ מורשה. גישה נפוצה היא בסיס של קרן מחקה מפוזרת, ומניות בודדות כחלק קטן. רוצים מחיר של מניה? הקלידו את הסימול שלה, כמו MSFT.',
      crypto:
        'קריפטו יכול לזוז ב-50% ויותר בשנה, ואין מאחוריו רווחים של חברה. אם אתם מחזיקים, מתכננים רבים ממליצים רק על חלק קטן שאפשר להרשות לעצמכם להפסיד.',
      quote: '{symbol} עומדת על {price}, שינוי של {change} היום ({pct}). טווח יומי {low} – {high}. המחירים עשויים להיות מעוכבים. זה לא איתות לקנייה או למכירה.',
      quoteNoKey: 'כדי להציג מחירים חיים, הוסיפו מפתח Finnhub חינמי בלשונית מניות.',
      quoteFail: 'לא הצלחתי לקבל מחיר עבור {symbol}. בדקו את הסימול או נסו שוב מאוחר יותר.',
      unknown:
        'את זה אני עוד לומד. אני יכול לעזור עם: תמונת מצב, כמה להשקיע, קרן חירום, חובות, קרנות מחקות, סיכון, קרן השתלמות ומס, אינפלציה, דמי ניהול ומחירי מניות.',
    },
  },
  plan: {
    title: 'תחזית',
    subtitle: '{goal} בעוד {years} שנים',
    goalLine: 'יעד',
    badCase: 'תרחיש רע',
    likely: 'סביר',
    goodCase: 'תרחיש טוב',
    rangeNote: 'לפי ההנחות האלה, 8 מתוך 10 תוצאות נופלות בין התרחיש הרע לטוב.',
    deposited: 'סך ההפקדות',
    needed: 'הפקדה חודשית נדרשת בתרחיש הסביר',
    assumptions: 'הנחות',
    assumptionsBody: 'תשואה שנתית ממוצעת {mean}, תנודתיות שנתית {vol}. לפני אינפלציה, דמי ניהול ומס.',
    adjust: 'לנסות שינויים',
  },
  stocks: {
    title: 'מניות',
    subtitle: 'לעקוב אחרי מחירים ולהבין מה מזיז אותם.',
    keyTitle: 'חיבור למחירים חיים',
    keyBody:
      'כספלי משתמש ב-Finnhub למחירים. מפתח חינמי לוקח דקה: היכנסו ל-finnhub.io, הירשמו והעתיקו את ה-API key מלוח הבקרה.',
    keyOpen: 'לפתוח את finnhub.io',
    keyPlaceholder: 'הדביקו את המפתח',
    keySave: 'שמירת מפתח',
    keyRemove: 'הסרת המפתח',
    keyStored: 'המפתח נשמר רק במכשיר הזה.',
    watchlist: 'רשימת מעקב',
    addPlaceholder: 'הוספת סימול, למשל AAPL',
    add: 'הוספה',
    remove: 'הסרת {symbol}',
    refresh: 'רענון',
    loading: 'טוען…',
    error: 'לא הצלחתי לטעון מחירים. בדקו את המפתח ואת החיבור.',
    notFound: 'אין מחיר עבור {symbol}. בתוכנית החינמית יש רק סימולים אמריקאיים.',
    updated: 'עודכן {time}',
    open: 'פתיחה',
    prevClose: 'סגירה קודמת',
    dayRange: 'טווח יומי',
    israelNote:
      'חברות ישראליות שנסחרות בניו יורק (TEVA, CHKP, NICE, ESLT) מופיעות כאן. מחירי הבורסה בתל אביב דורשים תוכנית נתונים בתשלום.',
    priceNote: 'המחירים מ-Finnhub ועשויים להיות מעוכבים. זה לא איתות לקנייה או למכירה.',
    names: {
      SPY: 'קרן מחקה S&P 500',
      QQQ: 'קרן מחקה נאסד״ק 100',
      VT: 'קרן מחקה עולמית',
      AAPL: 'אפל',
      MSFT: 'מיקרוסופט',
      NVDA: 'אנבידיה',
      TEVA: 'טבע (ישראל)',
      CHKP: 'צ׳ק פוינט (ישראל)',
      NICE: 'נייס (ישראל)',
      ESLT: 'אלביט מערכות (ישראל)',
    },
    learnTitle: 'לפני שבוחרים מניות',
    learnBody:
      'חברה אחת יכולה לרדת ב-50% ויותר. קרן מחקה מפזרת את הכסף על מאות חברות. מתכננים רבים שומרים מניות בודדות מתחת ל-5–10% מההשקעות.',
  },
  ideas: {
    title: 'רעיונות',
    subtitle: 'מסודר לפי עדיפות. ההחלטה שלכם.',
    negativeCashFlow: {
      title: 'ההוצאות גבוהות מההכנסה',
      body: 'אתם מוציאים {gap} יותר ממה שאתם מרוויחים בכל חודש. כדאי לתקן לפני השקעה: לקצץ הוצאה קבועה או להגדיל הכנסה.',
    },
    investOverBudget: {
      title: 'התוכנית גבוהה מהכסף הפנוי',
      body: 'תכננתם להשקיע {invest}, אבל נשארים רק {free} בחודש. כדאי להוריד את הסכום כדי לא להיכנס למינוס.',
    },
    payDebt: {
      title: 'קודם לסגור חוב בריבית גבוהה',
      body: 'סגירת חוב של {debt} בריבית של 15% ומעלה היא תשואה מובטחת שאף קרן לא משיגה. התחילו מהריבית הגבוהה ביותר.',
    },
    emergencyFund: {
      title: 'לבנות קרן חירום',
      body: 'שמרו {months} חודשי הוצאות ({target}) במזומן. חסרים {missing}. אפשר בפיקדון נזיל או בקרן כספית.',
    },
    idleCash: {
      title: 'ייתכן שמזומן שוכב בלי לעבוד',
      body: 'יש לכם כ-{extra} מעבר לקרן החירום. אינפלציה שוחקת מזומן. שקלו להשקיע חלק מזה לטובת היעד.',
    },
    taxUS: {
      title: 'להשתמש בחשבונות עם הטבת מס',
      body: 'קודם לנצל את מלוא ההתאמה של המעסיק ב-401(k): זה כסף חינם. אחר כך לשקול Roth IRA או IRA רגיל לפני חשבון רגיל.',
    },
    taxIL: {
      title: 'קודם קרן השתלמות',
      body: 'קרן השתלמות פטורה ממס רווחי הון אחרי 6 שנים, עד התקרה בחוק. בדקו גם את דמי הניהול בפנסיה: הם מצטברים לאורך עשרות שנים.',
    },
    goalGap: {
      title: 'היעד בסיכון',
      body: 'הסיכוי להגיע ליעד הוא בערך {chance}%. כדי להגיע אליו בתרחיש הסביר, השקיעו כ-{needed} בחודש, או תנו ליעד יותר שנים.',
    },
    goalOnTrack: {
      title: 'היעד נראה במסלול',
      body: 'הסיכוי להגיע ליעד הוא בערך {chance}%. המשיכו בהפקדות קבועות, גם כשהשוק יורד.',
    },
    shortHorizon: {
      title: 'טווח קצר, סיכון גבוה',
      body: 'היעד שלכם בעוד {years} שנים. מניות יכולות לרדת 30% ויותר בשנה. לכסף שצריך בקרוב, תמהיל זהיר בטוח יותר.',
    },
    allocationUS: {
      title: 'תמהיל מוצע: {stocks}% מניות, {bonds}% אג״ח',
      body: 'דרך פשוטה: קרן מחקה רחבה על שוק ארה״ב או העולם למניות, וקרן מחקה על אג״ח ממשלתי אמריקאי לאג״ח. לאזן פעם בשנה.',
    },
    allocationIL: {
      title: 'תמהיל מוצע: {stocks}% מניות, {bonds}% אג״ח',
      body: 'דרך פשוטה: קרנות מחקות על S&P 500 או מדד עולמי, וגם ת״א-125, למניות; קרנות אג״ח ממשלתי ישראלי לאג״ח. לאזן פעם בשנה.',
    },
    lowFees: {
      title: 'לשמור על דמי ניהול נמוכים',
      body: 'דמי ניהול של 1% בשנה יכולים לאכול כחמישית מהתוצאה לאורך 25 שנה. העדיפו קרנות מחקות עם דמי ניהול מתחת ל-0.25%.',
    },
  },
  learn: {
    title: 'לימוד',
    subtitle: 'שיעורים קצרים. שתי דקות כל אחד.',
    lessons: [
      {
        title: 'ריבית דריבית',
        body: 'תשואה מרוויחה תשואה. 1,000 בתשואה של 7% בשנה הופכים לכ-2,000 אחרי 10 שנים ולכ-7,600 אחרי 30. זמן בשוק חשוב יותר מתזמון השוק.',
      },
      {
        title: 'מניות מול אג״ח',
        body: 'מניה היא חלק קטן מחברה: צמיחה גבוהה יותר, ירידות חדות יותר. אג״ח היא הלוואה לממשלה או לחברה: יציבה יותר, צמיחה נמוכה יותר. שילוב של שתיהן מרכך את הדרך.',
      },
      {
        title: 'קרנות מחקות מדד',
        body: 'קרן מחקה קונה את כל החברות במדד, כמו S&P 500 או ת״א-125. מקבלים פיזור רחב ודמי ניהול נמוכים מאוד ברכישה אחת.',
      },
      {
        title: 'מה אומר מחיר של מניה',
        body: 'המחיר הוא מה שהקונה האחרון שילם על מניה אחת. הוא זז בגלל חדשות, דוחות וריבית. תנועה יומית של 1–2% היא רגילה ואומרת מעט על הטווח הארוך.',
      },
      {
        title: 'פיזור',
        body: 'לא לשים את כל הכסף בחברה אחת או במדינה אחת. פיזור מקטין את הנזק כשחלק אחד יורד.',
      },
      {
        title: 'סיכון וזמן',
        body: 'בטווח הקצר השוק יורד לעיתים קרובות, ולאורך רוב התקופות הארוכות הוא עלה. ככל שהיעד רחוק יותר, בדרך כלל אפשר לקחת יותר סיכון.',
      },
      {
        title: 'אינפלציה',
        body: 'מחירים עולים בכ-2–3% בשנה. מזומן שמרוויח פחות מהאינפלציה מאבד כוח קנייה. התחזיות באפליקציה הן לפני אינפלציה.',
      },
      {
        title: 'למה תחזית היא טווח',
        body: 'אף אחד לא יודע מה תהיה התשואה בשנה הבאה. אנחנו מציגים תרחיש רע, סביר וטוב, כדי שתתכננו לטווח ולא להבטחה.',
      },
      {
        title: 'סיכון מטבע (דולר / שקל)',
        body: 'אם אתם חיים בשקלים ומחזיקים קרנות אמריקאיות, שער החליפין משפיע על התוצאה. שקל חזק מקטין את הרווח בשקלים, ושקל חלש מגדיל אותו.',
      },
    ],
  },
  settings: {
    title: 'הגדרות',
    language: 'שפה',
    currency: 'מטבע',
    editProfile: 'לערוך את המספרים',
    reset: 'למחוק את כל הנתונים',
    resetConfirmTitle: 'למחוק את כל הנתונים?',
    resetConfirmBody: 'המספרים שלכם שמורים רק במכשיר הזה. אי אפשר לבטל את הפעולה.',
    cancel: 'ביטול',
    delete: 'מחיקה',
    about: 'אודות',
    privacy: 'המספרים שלכם נשארים במכשיר ולא נשלחים לשום שרת. רק סימולי מניות נשלחים ל-Finnhub, כדי לקבל מחירים.',
    version: 'כספלי {v}',
  },
};

export const STRINGS = { en, he };
