/**
 * UI strings. Placeholders use {name}. Keep both languages in sync:
 * the `Strings` type is derived from English, so a missing Hebrew key fails typecheck.
 */
const en = {
  appName: 'Kesefly',
  splashTagline: 'Your money helper',
  notif: {
    title: 'Kesefly tip',
    checkup: 'Your money check-up: {n} of 5 done. Open Kesefly to see the next step.',
    keepGoing: 'Markets move every week. Your plan works best when you keep monthly deposits steady.',
  },
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
  tabs: {
    home: 'Home',
    helper: 'Helper',
    plan: 'Plan',
    stocks: 'Stocks',
    learn: 'Learn',
  },
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
    suggestions: ['How am I doing?', 'How can I save more?', 'My portfolio', 'Price of AAPL', 'What can you do?'],
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
      goal: 'Goal "{goal}": {amount} in {years} years. Bad case {low}, likely {mid}, good case {high}. Chance to reach it: about {chance}. Open the Plan tab to try changes.',
      goalNone: 'You have no goal yet. Edit your numbers in Settings to add one.',
      indexFunds:
        'An index fund buys every company in an index, like the S&P 500 or TA-125. One purchase gives you wide diversification and very low fees (often under 0.25% a year). They are a simple core for most long-term plans.',
      stocksBonds:
        'Stocks grow more but drop harder. Bonds are steadier and grow less. Your "{risk}" profile suggests about {stocks}% stocks and {bonds}% bonds.',
      risk: 'Your risk profile is "{risk}". Higher risk means bigger swings and usually more long-term growth. For money needed in under 3 years, a careful mix is safer.',
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
      quote:
        '{symbol} is at {price}, {change} today ({pct}). Day range {low} – {high}. Prices may be delayed. This is not a buy or sell signal.',
      quoteFail: 'I couldn’t get a price for {symbol}. Check the symbol or try again later.',
      help:
        'I can help with: your money snapshot, how much to invest, saving tips, emergency fund, debt, your goal forecast, index funds, stocks vs. bonds, risk, market drops, tax accounts, home buying, interest rates, inflation, fees, your portfolio, and live stock prices (type a symbol like AAPL or TEVA.TA).',
      notify:
        'Turn on weekly tips in Settings, under Notifications. Once a week I send one short idea based on your plan. Your numbers never leave the phone.',
      portfolio: 'Your portfolio has {n} positions: {list}. Open the Stocks tab to see live value and gain or loss for each one.',
      portfolioNone: 'Your portfolio is empty. In the Stocks tab, tap "Add holding" to enter what you own: symbol, shares, and buy price.',
      saveTips:
        'A simple rule is 50/30/20: about {needs} for needs, {wants} for wants, and {save} for saving and investing. Automate the saving on payday, review subscriptions once a quarter, and compare insurance and phone plans every year.',
      dca: 'Investing the same amount every month (dollar-cost averaging) means you buy more when prices are low and less when high. It removes the stress of timing the market. Set up an automatic monthly transfer.',
      crash:
        'Markets fall 10% or more about once every year or two, and 20%+ every few years. Historically they recovered, though it can take years. If your goal is far away, keep investing monthly and avoid selling in panic. Money you need within 3 years should not be in stocks.',
      dividends:
        'A dividend is a share of company profits paid to owners, often every quarter. Index funds collect dividends from all their companies. Reinvesting them adds to compound growth.',
      homeIL:
        'Buying a home in Israel: a first home usually needs a down payment of at least 25% (the Bank of Israel caps financing at 75%). Keep the monthly mortgage payment under about a third of net income, and compare a few banks and track mixes (prime, fixed, CPI-linked).',
      homeUS:
        'Buying a home in the US: aim for a 20% down payment to avoid mortgage insurance, keep housing costs under about 28% of gross income, and compare rates from several lenders.',
      rates:
        'When central banks raise rates, savings and bonds pay more, loans and mortgages cost more, and stocks often swing. When rates fall, the opposite. A long-term plan does not need to react to every change.',
      gold: 'Gold can protect in crises and inflation, but it pays no interest or dividends and can stay flat for years. Many planners keep it at 0–10% of investments, if at all.',
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
    watchlist: 'Watchlist',
    portfolio: 'My portfolio',
    portfolioEmptyTitle: 'Track what you own',
    portfolioEmptyBody: 'Add your stocks and funds to see their value and your gain or loss, updated live.',
    addHolding: 'Add holding',
    symbolPlaceholder: 'Symbol: AAPL, TEVA.TA',
    shares: 'Shares',
    buyPrice: 'Buy price',
    buyPriceHint: 'Price per share, in the stock’s currency ($ for US, ₪ for Tel Aviv).',
    totalValue: 'Total value',
    holdingLine: '{shares} shares · bought at {price}',
    addPlaceholder: 'Add symbol: AAPL, TEVA.TA',
    add: 'Add',
    remove: 'Remove {symbol}',
    refresh: 'Refresh',
    loading: 'Loading…',
    error: 'Couldn’t load prices. Check your internet connection.',
    notFound: 'No price for {symbol}. Check the symbol. Tel Aviv stocks end in .TA (TEVA.TA).',
    updated: 'Updated {time}',
    open: 'Open',
    prevClose: 'Prev. close',
    dayRange: 'Day range',
    israelNote: 'Tel Aviv stocks: add .TA to the symbol, like TEVA.TA or LUMI.TA. The TA-125 index is ^TA125.TA.',
    priceNote: 'Free prices from Yahoo Finance, may be delayed. Not a buy or sell signal.',
    names: {
      SPY: 'S&P 500 index fund',
      '^TA125.TA': 'TA-125 index (Tel Aviv)',
      'TEVA.TA': 'Teva (Tel Aviv)',
      'LUMI.TA': 'Bank Leumi (Tel Aviv)',
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
    notifications: 'Notifications',
    notifyLabel: 'Weekly money tips',
    notifyBody: 'One short idea a week, based on your plan. Created on this device.',
    notifyDenied: 'Notifications are blocked. Allow them for Kesefly in your phone settings.',
    notifyTest: 'Send a test tip',
    notifyOn: 'On',
    notifyOff: 'Off',
    privacy:
      'Your numbers stay on this device and are never sent to a server. Only stock symbols go to Yahoo Finance, to fetch prices.',
    version: 'Kesefly {v}',
  },
};

export type Strings = typeof en;

const he: Strings = {
  appName: 'כספלי',
  splashTagline: 'העוזר שלכם לכסף',
  notif: {
    title: 'טיפ מכספלי',
    checkup: 'בדיקת המצב הכספי שלכם: {n} מתוך 5 הושלמו. פתחו את כספלי לצעד הבא.',
    keepGoing: 'השוק זז כל שבוע. התוכנית עובדת הכי טוב כשממשיכים בהפקדות חודשיות קבועות.',
  },
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
  tabs: {
    home: 'בית',
    helper: 'עוזר',
    plan: 'תוכנית',
    stocks: 'מניות',
    learn: 'לימוד',
  },
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
      'היי! אני כספלי. שאלו אותי מה המצב שלכם, כמה להשקיע, על חובות, קרנות מחקות, סיכון, קרן השתלמות, או מחיר של מניה כמו AAPL או TEVA.TA.',
    suggestions: ['מה המצב שלי?', 'איך לחסוך יותר?', 'התיק שלי', 'מחיר TEVA.TA', 'מה אתה יודע?'],
    answers: {
      greet: 'היי! במה נתמקד: התוכנית, חיסכון או מניות?',
      thanks: 'בשמחה. אפשר לשאול אותי כל דבר נוסף על הכסף שלכם.',
      summary:
        'זו תמונת המצב שלכם. נשארים לכם {free} בכל חודש, שיעור החיסכון {rate}, ויש לכם {worth} בחסכונות ובהשקעות. בבדיקת המצב הכספי השלמתם {checks} מתוך 5. {goalLine}',
      summaryGoal: 'ליעד "{goal}" יש סיכוי של כ-{chance} בעוד {years} שנים.',
      summaryNoGoal: 'הגדירו יעד כדי שאוכל לחשב לו תחזית.',
      emergencyMissing:
        'קרן חירום מכסה כ-6 חודשי הוצאות: {target} אצלכם. יש לכם {cash}, כלומר חסרים {missing}. שמרו אותה בפיקדון נזיל או בקרן כספית, לא במניות.',
      emergencyOk: 'קרן החירום מכוסה: {cash} מול יעד של {target} (6 חודשי הוצאות). כסף מעבר לזה יכול לעבוד לטובת היעד.',
      debtSome:
        'יש לכם {debt} חוב בריבית גבוהה. סגירתו היא תשואה מובטחת של 15% ומעלה בשנה, יותר מכל קרן. התחילו מהריבית הגבוהה ביותר, ואז השקיעו.',
      debtNone: 'אין לכם חוב בריבית גבוהה. מצוין: זה אחד הצעדים החשובים ביותר.',
      howMuch:
        'נשארים לכם {free} בכל חודש, ותכננתם להשקיע {invest}. כדי להגיע ליעד בתרחיש הסביר צריך כ-{needed} בחודש. קודם כדאי לסדר קרן חירום וחובות.',
      howMuchNoFree:
        'כרגע ההוצאות גבוהות מההכנסה ב-{gap} בחודש. קודם לתקן את זה: לקצץ הוצאה קבועה או להגדיל הכנסה. ההשקעה באה אחר כך.',
      goal: 'היעד "{goal}": {amount} בעוד {years} שנים. תרחיש רע {low}, סביר {mid}, טוב {high}. סיכוי להגיע: כ-{chance}. בלשונית תוכנית אפשר לנסות שינויים.',
      goalNone: 'עדיין אין לכם יעד. אפשר להוסיף אחד בהגדרות, תחת עריכת המספרים.',
      indexFunds:
        'קרן מחקה קונה את כל החברות במדד, כמו S&P 500 או ת״א-125. ברכישה אחת מקבלים פיזור רחב ודמי ניהול נמוכים מאוד (לרוב מתחת ל-0.25% בשנה). זה בסיס פשוט לרוב התוכניות לטווח ארוך.',
      stocksBonds:
        'מניות צומחות יותר אבל יורדות חזק יותר. אג״ח יציבות יותר וצומחות פחות. לפי פרופיל "{risk}" מתאים בערך {stocks}% מניות ו-{bonds}% אג״ח.',
      risk: 'פרופיל הסיכון שלכם הוא "{risk}". סיכון גבוה יותר אומר תנודות חדות יותר ובדרך כלל צמיחה גבוהה יותר לטווח ארוך. לכסף שצריך בפחות מ-3 שנים, תמהיל זהיר בטוח יותר.',
      inflation:
        'מחירים עולים בכ-2–3% בשנה. מזומן שמרוויח פחות מזה מאבד כוח קנייה. התחזיות שלי הן לפני אינפלציה, כך שכוח הקנייה בפועל יהיה נמוך יותר.',
      compound:
        'ריבית דריבית: התשואה מרוויחה תשואה. 1,000 ב-7% בשנה גדלים לכ-2,000 אחרי 10 שנים ולכ-7,600 אחרי 30. הכי חשוב להתחיל מוקדם.',
      fees: 'דמי ניהול של 1% בשנה יכולים לאכול כחמישית מהתוצאה לאורך 25 שנה. העדיפו קרנות עם דמי ניהול מתחת ל-0.25%.',
      taxUS: 'בארה״ב: קודם לנצל את מלוא ההתאמה של המעסיק ב-401(k) (כסף חינם), אחר כך Roth IRA או IRA רגיל, ורק אז חשבון רגיל.',
      taxIL:
        'בישראל: קרן השתלמות פטורה ממס רווחי הון אחרי 6 שנים, עד התקרה בחוק. בדקו גם את דמי הניהול בקרן הפנסיה: הם מצטברים לאורך עשרות שנים.',
      currency:
        'אם אתם חיים בשקלים ומחזיקים קרנות אמריקאיות, שער הדולר משפיע על התוצאה. שקל חזק מקטין את הרווח בשקלים. הרבה אנשים מחזיקים שילוב של שניהם.',
      noAdvice:
        'אני לא יכול להמליץ לקנות או למכור מניה מסוימת: אני כלי לימוד, לא יועץ מורשה. גישה נפוצה היא בסיס של קרן מחקה מפוזרת, ומניות בודדות כחלק קטן. רוצים מחיר של מניה? הקלידו את הסימול שלה, כמו MSFT.',
      crypto:
        'קריפטו יכול לזוז ב-50% ויותר בשנה, ואין מאחוריו רווחים של חברה. אם אתם מחזיקים, מתכננים רבים ממליצים רק על חלק קטן שאפשר להרשות לעצמכם להפסיד.',
      quote:
        '{symbol} עומדת על {price}, שינוי של {change} היום ({pct}). טווח יומי {low} – {high}. המחירים עשויים להיות מעוכבים. זה לא איתות לקנייה או למכירה.',
      quoteFail: 'לא הצלחתי לקבל מחיר עבור {symbol}. בדקו את הסימול או נסו שוב מאוחר יותר.',
      help:
        'אני יכול לעזור עם: תמונת מצב, כמה להשקיע, טיפים לחיסכון, קרן חירום, חובות, תחזית ליעד, קרנות מחקות, מניות מול אג״ח, סיכון, ירידות בשוק, קרן השתלמות ומס, קניית דירה, ריבית, אינפלציה, דמי ניהול, תיק ההשקעות שלכם ומחירי מניות (הקלידו סימול כמו AAPL או TEVA.TA).',
      notify: 'אפשר להפעיל טיפים שבועיים בהגדרות, תחת התראות. פעם בשבוע אשלח רעיון קצר לפי התוכנית שלכם. המספרים לא יוצאים מהטלפון.',
      portfolio: 'בתיק שלכם יש {n} אחזקות: {list}. בלשונית מניות רואים את השווי ואת הרווח או ההפסד של כל אחת.',
      portfolioNone: 'התיק שלכם ריק. בלשונית מניות הקישו "הוספת אחזקה" והזינו מה יש לכם: סימול, כמות ומחיר קנייה.',
      saveTips:
        'כלל פשוט הוא 50/30/20: בערך {needs} לצרכים, {wants} לרצונות ו-{save} לחיסכון ולהשקעה. הגדירו העברה אוטומטית ביום המשכורת, עברו על המנויים פעם ברבעון, והשוו ביטוחים וחבילות סלולר פעם בשנה.',
      dca: 'השקעה של אותו סכום בכל חודש (הוראת קבע) אומרת שקונים יותר כשהמחיר נמוך ופחות כשהוא גבוה. זה חוסך את הלחץ של תזמון השוק. הגדירו העברה חודשית אוטומטית.',
      crash:
        'השוק יורד ב-10% ויותר בערך פעם בשנה-שנתיים, וב-20% ויותר כל כמה שנים. היסטורית הוא התאושש, לפעמים אחרי כמה שנים. אם היעד רחוק, המשיכו להשקיע כל חודש ואל תמכרו בבהלה. כסף שצריך בתוך 3 שנים לא צריך להיות במניות.',
      dividends:
        'דיבידנד הוא חלק מהרווח של החברה שמשולם לבעלי המניות, לרוב פעם ברבעון. קרן מחקה אוספת דיבידנדים מכל החברות שבה. השקעה מחדש שלהם מגדילה את הריבית דריבית.',
      homeIL:
        'קניית דירה בישראל: לדירה ראשונה צריך בדרך כלל הון עצמי של 25% לפחות (בנק ישראל מגביל מימון ל-75%). כדאי שהחזר המשכנתא יהיה עד כשליש מההכנסה נטו, ולהשוות כמה בנקים ותמהילי מסלולים (פריים, קבועה, צמודה).',
      homeUS:
        'קניית בית בארה״ב: כדאי לכוון ל-20% מקדמה כדי להימנע מביטוח משכנתא, לשמור את עלות הדיור מתחת לכ-28% מההכנסה ברוטו, ולהשוות ריביות מכמה מלווים.',
      rates:
        'כשהבנק המרכזי מעלה ריבית, פיקדונות ואג״ח מניבים יותר, הלוואות ומשכנתאות מתייקרות, והמניות לרוב תנודתיות. כשהריבית יורדת, ההפך. תוכנית לטווח ארוך לא צריכה להגיב לכל שינוי.',
      gold: 'זהב יכול להגן בזמן משברים ואינפלציה, אבל הוא לא משלם ריבית או דיבידנד ויכול לעמוד במקום שנים. מתכננים רבים מחזיקים 0–10% ממנו בתיק, אם בכלל.',
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
    watchlist: 'רשימת מעקב',
    portfolio: 'תיק ההשקעות שלי',
    portfolioEmptyTitle: 'לעקוב אחרי מה שיש לכם',
    portfolioEmptyBody: 'הוסיפו את המניות והקרנות שלכם כדי לראות את השווי ואת הרווח או ההפסד, בעדכון חי.',
    addHolding: 'הוספת אחזקה',
    symbolPlaceholder: 'סימול: AAPL, TEVA.TA',
    shares: 'כמות',
    buyPrice: 'מחיר קנייה',
    buyPriceHint: 'מחיר למניה, במטבע של המניה ($ לארה״ב, ₪ לתל אביב).',
    totalValue: 'שווי כולל',
    holdingLine: '{shares} יחידות · נקנו ב-{price}',
    addPlaceholder: 'הוספת סימול: AAPL, TEVA.TA',
    add: 'הוספה',
    remove: 'הסרת {symbol}',
    refresh: 'רענון',
    loading: 'טוען…',
    error: 'לא הצלחתי לטעון מחירים. בדקו את החיבור לאינטרנט.',
    notFound: 'אין מחיר עבור {symbol}. בדקו את הסימול. מניות בתל אביב מסתיימות ב-TA. (למשל TEVA.TA).',
    updated: 'עודכן {time}',
    open: 'פתיחה',
    prevClose: 'סגירה קודמת',
    dayRange: 'טווח יומי',
    israelNote: 'מניות בבורסת תל אביב: הוסיפו TA. לסימול, למשל TEVA.TA או LUMI.TA. מדד ת״א-125 הוא ^TA125.TA.',
    priceNote: 'מחירים חינמיים מ-Yahoo Finance, ועשויים להיות מעוכבים. זה לא איתות לקנייה או למכירה.',
    names: {
      SPY: 'קרן מחקה S&P 500',
      '^TA125.TA': 'מדד ת״א-125',
      'TEVA.TA': 'טבע (תל אביב)',
      'LUMI.TA': 'בנק לאומי (תל אביב)',
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
    notifications: 'התראות',
    notifyLabel: 'טיפים שבועיים לכסף',
    notifyBody: 'רעיון קצר אחד בשבוע, לפי התוכנית שלכם. נוצר במכשיר הזה.',
    notifyDenied: 'ההתראות חסומות. אפשרו אותן לכספלי בהגדרות הטלפון.',
    notifyTest: 'שליחת טיפ לדוגמה',
    notifyOn: 'פועל',
    notifyOff: 'כבוי',
    privacy: 'המספרים שלכם נשארים במכשיר ולא נשלחים לשום שרת. רק סימולי מניות נשלחים ל-Yahoo Finance, כדי לקבל מחירים.',
    version: 'כספלי {v}',
  },
};

export const STRINGS = { en, he };
