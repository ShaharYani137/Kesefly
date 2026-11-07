/**
 * Offline helper chat ("Ask Kesefly"). Rule-based: matches the question to a topic with
 * English and Hebrew keywords, then answers from the user's own numbers.
 * Recommend only: it never tells the user to buy or sell a specific security.
 * Designed so a real AI model can replace `answer()` later behind the same interface.
 */
import type { Strings } from '@/i18n/strings';

import { formatMoney, formatPercent } from './format';
import { checkup } from './health';
import { forecast, RISK_ASSUMPTIONS } from './projection';
import { EMERGENCY_MONTHS } from './recommendations';
import { isTicker } from './stocks';
import type { Lang, Profile } from './types';

export type HelperReply = { text: string } | { quote: string };

type Topic =
  | 'quote'
  | 'noAdvice'
  | 'crypto'
  | 'summary'
  | 'howMuch'
  | 'emergency'
  | 'debt'
  | 'goal'
  | 'indexFunds'
  | 'stocksBonds'
  | 'risk'
  | 'inflation'
  | 'compound'
  | 'fees'
  | 'tax'
  | 'currency'
  | 'thanks'
  | 'greet';

/**
 * Keyword rules, checked in order (first match wins).
 * English uses word-boundary regexes. Hebrew glues prefixes (ה, ו, ב, ל, ש, מ, כ) onto words,
 * so Hebrew keywords are matched per word after stripping up to two prefix letters
 * (see `matchesHebrew`). Multi-word Hebrew keywords match as plain substrings.
 */
const RULES: { topic: Topic; en: RegExp; he: string[] }[] = [
  { topic: 'noAdvice', en: /\b(should i (buy|sell)|buy|sell|best stock|which stock|recommend)\b/i, he: ['לקנות', 'למכור', 'כדאי לי לקנות', 'איזו מניה', 'המלצה'] },
  { topic: 'crypto', en: /\b(crypto|bitcoin|btc|ethereum|eth)\b/i, he: ['קריפטו', 'ביטקוין', 'אתריום'] },
  { topic: 'summary', en: /\b(how am i|how'?s my|status|snapshot|overview|summary|doing)\b/i, he: ['מה המצב', 'מצב שלי', 'איך אני', 'תמונת מצב', 'סיכום'] },
  {
    topic: 'howMuch',
    en: /\bhow much\b.*\b(invest|save|put)\b|\b(invest|save) (how much|monthly)\b|\b(spend\w*|income|budget|free cash)\b/i,
    he: ['כמה להשקיע', 'כמה כדאי להשקיע', 'כמה לחסוך', 'כמה לשים', 'הוצאות', 'הכנסה', 'תקציב', 'כסף הפנוי'],
  },
  { topic: 'emergency', en: /\b(emergency|rainy day|safety net|idle cash|cash)\b/i, he: ['חירום', 'כרית ביטחון', 'מזומן'] },
  { topic: 'debt', en: /\b(debt|loan|credit card|overdraft|owe)\b/i, he: ['חוב', 'הלוואה', 'מינוס', 'אשראי'] },
  { topic: 'goal', en: /\b(goal|forecast|plan|target|reach)\b/i, he: ['יעד', 'תחזית', 'תוכנית', 'להגיע'] },
  { topic: 'tax', en: /\b(tax|401k|401\(k\)|ira|roth|pension|retire\w*)\b/i, he: ['מס', 'מסים', 'מיסים', 'מיסוי', 'השתלמות', 'פנסיה', 'גמל', 'פרישה'] },
  { topic: 'indexFunds', en: /\b(index|etf|fund|s&p|sp500|tracker)\b/i, he: ['מחקה', 'תעודת סל', 'קרן', 'מדד'] },
  { topic: 'stocksBonds', en: /\b(bond|bonds|stocks vs|allocation|mix)\b/i, he: ['אג"ח', 'אג״ח', 'אגח', 'תמהיל'] },
  { topic: 'risk', en: /\b(risk|risky|safe|volatil\w*)\b/i, he: ['סיכון', 'בטוח', 'תנודתיות'] },
  { topic: 'inflation', en: /\binflation\b/i, he: ['אינפלציה', 'יוקר'] },
  { topic: 'compound', en: /\b(compound\w*|interest on interest)\b/i, he: ['ריבית דריבית', 'דריבית'] },
  { topic: 'fees', en: /\b(fee|fees|expense ratio|commission)\b/i, he: ['דמי ניהול', 'עמלה', 'עמלות'] },
  { topic: 'currency', en: /\b(currency|dollar|shekel|usd|ils|nis|exchange rate)\b/i, he: ['מטבע', 'דולר', 'שקל', 'שער'] },
  { topic: 'thanks', en: /\b(thanks|thank you|thx)\b/i, he: ['תודה'] },
  { topic: 'greet', en: /\b(hi|hello|hey|yo)\b/i, he: ['שלום', 'היי', 'אהלן', 'מה נשמע'] },
];

/** Words that look like tickers but are not. */
const NOT_TICKERS = new Set(['I', 'A', 'AN', 'ETF', 'IRA', 'USD', 'ILS', 'NIS', 'OK', 'TA', 'S', 'P', 'US', 'IL', 'AI', 'TASE', 'ROTH', 'BTC', 'ETH']);

/** Finds a ticker the user typed in capitals (AAPL, $MSFT) or a watchlist symbol in any case. */
export function findTicker(text: string, watchlist: string[]): string | null {
  for (const raw of text.split(/[\s,?!.:;()"']+/)) {
    const tok = raw.replace(/^\$/, '');
    if (!tok) continue;
    if (watchlist.includes(tok.toUpperCase())) return tok.toUpperCase();
    if (tok === tok.toUpperCase() && isTicker(tok) && !NOT_TICKERS.has(tok)) return tok;
  }
  return null;
}

const HE_PREFIX = /^[והבלשמכ]/;

/** Hebrew keyword match. Short words (2 letters or fewer) need an exact word; longer ones also match inflections. */
function matchesHebrew(text: string, words: string[]): boolean {
  const tokens = text.split(/[\s,.?!:;()"'״׳-]+/).filter(Boolean);
  return words.some((w) => {
    if (w.includes(' ')) return text.includes(w);
    return tokens.some((t) => {
      const forms = [t];
      if (HE_PREFIX.test(t)) forms.push(t.slice(1));
      if (HE_PREFIX.test(t.slice(1))) forms.push(t.slice(2));
      return forms.some((f) => (w.length <= 2 ? f === w : f.startsWith(w)));
    });
  });
}

function topicOf(text: string): Topic | null {
  for (const r of RULES) {
    if (r.en.test(text) || matchesHebrew(text, r.he)) return r.topic;
  }
  return null;
}

function fill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function answer(text: string, ctx: { s: Strings; profile: Profile; lang: Lang; watchlist: string[] }): HelperReply {
  const { s, profile: p, lang } = ctx;
  const a = s.helper.answers;
  const money = (v: number) => formatMoney(v, p.currency, lang);
  const pct = (v: number) => formatPercent(v, lang);
  const free = p.monthlyIncome - p.monthlyExpenses;

  const ticker = findTicker(text, ctx.watchlist);
  let topic = topicOf(text);
  // "Price of AAPL" / "AAPL" → quote. "Should I buy AAPL" stays noAdvice.
  if (ticker && topic !== 'noAdvice') topic = 'quote';
  if (topic === 'quote' && ticker) return { quote: ticker };

  const f = forecast(p);
  const riskLabel = s.risk[p.risk];
  const { stocks } = RISK_ASSUMPTIONS[p.risk];

  switch (topic) {
    case 'greet':
      return { text: a.greet };
    case 'thanks':
      return { text: a.thanks };
    case 'noAdvice':
      return { text: a.noAdvice };
    case 'crypto':
      return { text: a.crypto };
    case 'summary': {
      const goalLine =
        p.goalAmount > 0
          ? fill(a.summaryGoal, { goal: p.goalName || money(p.goalAmount), chance: pct(f.goalChance), years: p.goalYears })
          : a.summaryNoGoal;
      return {
        text: fill(a.summary, {
          free: money(free),
          rate: pct(p.monthlyIncome > 0 ? free / p.monthlyIncome : 0),
          worth: money(p.cashSavings + p.investments),
          checks: checkup(p).filter((c) => c.ok).length,
          goalLine,
        }),
      };
    }
    case 'howMuch':
      if (free <= 0) return { text: fill(a.howMuchNoFree, { gap: money(-free) }) };
      return { text: fill(a.howMuch, { free: money(free), invest: money(p.monthlyInvest), needed: money(f.monthlyNeeded) }) };
    case 'emergency': {
      const target = p.monthlyExpenses * EMERGENCY_MONTHS;
      if (p.cashSavings >= target) return { text: fill(a.emergencyOk, { cash: money(p.cashSavings), target: money(target) }) };
      return {
        text: fill(a.emergencyMissing, { target: money(target), cash: money(p.cashSavings), missing: money(target - p.cashSavings) }),
      };
    }
    case 'debt':
      return { text: p.highInterestDebt > 0 ? fill(a.debtSome, { debt: money(p.highInterestDebt) }) : a.debtNone };
    case 'goal':
      if (p.goalAmount <= 0) return { text: a.goalNone };
      return {
        text: fill(a.goal, {
          goal: p.goalName || money(p.goalAmount),
          amount: money(p.goalAmount),
          years: p.goalYears,
          low: money(f.final.low),
          mid: money(f.final.mid),
          high: money(f.final.high),
          chance: pct(f.goalChance),
        }),
      };
    case 'indexFunds':
      return { text: a.indexFunds };
    case 'stocksBonds':
      return { text: fill(a.stocksBonds, { risk: riskLabel, stocks: Math.round(stocks * 100), bonds: Math.round((1 - stocks) * 100) }) };
    case 'risk':
      return { text: fill(a.risk, { risk: riskLabel }) };
    case 'inflation':
      return { text: a.inflation };
    case 'compound':
      return { text: a.compound };
    case 'fees':
      return { text: a.fees };
    case 'tax':
      // A US account named explicitly gets the US answer, whatever the profile country.
      if (/\b(401\(?k\)?|ira|roth)\b/i.test(text)) return { text: a.taxUS };
      return { text: p.country === 'IL' ? a.taxIL : a.taxUS };
    case 'currency':
      return { text: a.currency };
    default:
      return { text: a.unknown };
  }
}
