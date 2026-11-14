/**
 * "Ask Kesefly" v2: offline reasoning on live data. Runs on the phone, no AI server.
 *
 * On top of the rule-based answers in helper.ts it understands:
 *   - a stock (AAPL, "apple", "טבע"): live price, 1M / 1Y return, 52-week position, trend vs the
 *     50-day average, volatility, the user's own position, and latest headlines;
 *   - "AAPL vs MSFT": a side-by-side over one year;
 *   - "why is NVDA down": today's move plus the stories that may explain it;
 *   - the market today (S&P 500, Nasdaq, TA-125, VIX, USD/ILS, gold, bitcoin);
 *   - the dollar-shekel rate, with conversions;
 *   - world / economy news ranked for the user's stocks;
 *   - market hours in New York and Tel Aviv;
 *   - a live portfolio review (value in the user's currency, best / worst, concentration);
 *   - the user's learning path;
 *   - follow-ups: "and MSFT?", "what about it?" reuse the last stock.
 * Recommend only: no buy / sell instructions. Every stock answer ends with that reminder.
 */
import { buildPath } from '@/engine/academy';
import { upcoming } from '@/engine/calendar';
import { formatHebrewDate, hebrewFromGregorian, marketStatus, type MarketStatus, formatDuration } from '@/engine/clock';
import { getEvents, getSymbolNews } from '@/engine/news';
import { webAnswer } from '@/engine/web';
import {
  convert,
  formatPrice,
  formatSigned,
  getHistory,
  getQuote,
  getQuotes,
  getUsdIls,
  seriesStats,
} from '@/engine/stocks';
import { ACADEMY } from '@/i18n/academy';
import type { Strings } from '@/i18n/strings';

import type { AcademyProgress } from './academy';
import { type AnswerSource, getBrain, learnName, learnQuestion, loadBrain, normalize, rememberWeb } from './brain';
import { answer as ruleAnswer, findTicker, type HoldingLite } from './helper';
import type { Lang, Profile } from './types';

export type Action = { label: string; href: string };
export type AssistantReply = { text: string; actions?: Action[]; source?: AnswerSource; followUps?: string[] };
/**
 * Conversation context, kept for the whole chat session: the stock and subject being discussed,
 * the last kind of answer and the last question, so short follow-ups ("why?", "tell me more",
 * "and NVDA?", "is it risky?") are understood.
 */
export type Memory = { lastTicker?: string; lastIntent?: string; lastSubject?: string; lastQuestion?: string };

type Ctx = {
  s: Strings;
  lang: Lang;
  profile: Profile;
  watchlist: string[];
  holdings: HoldingLite[];
  academy: AcademyProgress;
  memory: Memory;
};

/** Company names users type, mapped to symbols. Lowercase English, Hebrew as written. */
const NAMES: Record<string, string> = {
  apple: 'AAPL',
  'אפל': 'AAPL',
  microsoft: 'MSFT',
  'מיקרוסופט': 'MSFT',
  nvidia: 'NVDA',
  'אנבידיה': 'NVDA',
  'אנווידיה': 'NVDA',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  'גוגל': 'GOOGL',
  amazon: 'AMZN',
  'אמזון': 'AMZN',
  tesla: 'TSLA',
  'טסלה': 'TSLA',
  meta: 'META',
  facebook: 'META',
  'מטא': 'META',
  netflix: 'NFLX',
  'נטפליקס': 'NFLX',
  teva: 'TEVA.TA',
  'טבע': 'TEVA.TA',
  'check point': 'CHKP',
  "צ'ק פוינט": 'CHKP',
  elbit: 'ESLT.TA',
  'אלביט': 'ESLT.TA',
  'לאומי': 'LUMI.TA',
  'הפועלים': 'POLI.TA',
  bitcoin: 'BTC-USD',
  'ביטקוין': 'BTC-USD',
  gold: 'GC=F',
  'זהב': 'GC=F',
  's&p 500': '^GSPC',
  'nasdaq': '^IXIC',
  'נאסד"ק': '^IXIC',
  'ת"א 125': '^TA125.TA',
  'ת״א 125': '^TA125.TA',
  'ta-125': '^TA125.TA',
};

const INTENT = {
  compare: /\b(vs\.?|versus|compare|compared)\b|(לעומת|מול|השווה|השוואה)/i,
  why: /\b(why)\b.*\b(up|down|fall\w*|drop\w*|ris\w*|jump\w*|move\w*)\b|(למה|מדוע).*(יורד|עולה|ירד|עלה|נפל|זינק|זז)/i,
  market: /\b(market|markets|wall street|indices|indexes|today'?s market|how('?s| is) the market)\b|(שוק|שווקים|וול סטריט|בורסה|מדדים)/i,
  fx: /\b(usd\/?ils|exchange rate|dollar rate|shekel|how much is the dollar)\b|(שער הדולר|שער החליפין|כמה שווה הדולר|דולר שקל|דולר-שקל)/i,
  news: /\b(news|headlines?|events?|what happened)\b|(חדשות|כותרות|אירועים|מה קרה|דקה אחר דקה)/i,
  hours: /\b(open|closed|close|hours|trading hours|what time)\b|(פתוח|פתוחה|סגור|סגורה|שעות|נפתח|נסגר|מתי הבורסה)/i,
  date: /\b(date|today'?s date|hebrew date|what day)\b|(תאריך|איזה יום|התאריך העברי)/i,
  learn: /\b(learn\w*|lesson\w*|course|academy|study)\b|(ללמוד|למידה|שיעור|קורס|אקדמיה)/i,
  portfolio: /\b(portfolio|holdings|my stocks|my shares|positions)\b|(התיק|תיק ההשקעות|האחזקות|המניות שלי)/i,
  upcoming: /\b(upcoming|coming up|what'?s next|next (week|weeks|month)|calendar|future|predict\w*|expect\w*)\b|(מה צפוי|צפוי|בקרוב|השבוע הבא|החודש הבא|לוח אירועים|העתיד|תחזית לשוק|מה יקרה)/i,
  followUp: /^(and|what about|how about)\b|^(ו?מה עם|ו?מה לגבי)|\b(it|this one|that stock)\b|(היא|הזאת|הזו)\??$/i,
};

function fill(t: string, v: Record<string, string | number>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => (k in v ? String(v[k]) : `{${k}}`));
}

/** All tickers mentioned: capital tickers, watchlist symbols, or company names. */
function findTickers(text: string, watchlist: string[]): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase();
  for (const [name, sym] of Object.entries(NAMES)) {
    if (lower.includes(name) && !out.includes(sym)) out.push(sym);
  }
  for (const part of text.split(/\s+(?:vs\.?|versus|or|and|לעומת|מול|או|ו)\s+|[,;]/i)) {
    const t = findTicker(part, watchlist);
    // A ticker next to its company name (TEVA + "teva") maps to the same listing once.
    if (t && !out.includes(t) && !out.includes(`${t}.TA`)) out.push(t);
  }
  return out;
}

const pctFmt = (v: number, lang: Lang) => formatSigned(v, 'USD', lang, true);

function phaseText(st: MarketStatus, s: Strings, lang: Lang): string {
  return fill(s.assistant.phase[st.phase], { t: formatDuration(st.minutesToChange, lang) });
}

const hhmm = (st: MarketStatus) => `${String(st.time.hour).padStart(2, '0')}:${String(st.time.minute).padStart(2, '0')}`;

async function stockAnswer(sym: string, c: Ctx): Promise<AssistantReply> {
  const { s, lang } = c;
  const a = s.assistant;
  const q = await getQuote(sym);
  const [y1, news] = await Promise.all([getHistory(sym, '1Y').catch(() => null), getSymbolNews(sym, 3, c.lang)]);
  const st = y1 ? seriesStats(y1) : null;
  const m1 = y1 && y1.length > 22 ? y1[y1.length - 1].close / y1[y1.length - 22].close - 1 : null;
  const pos = q.yearHigh > q.yearLow ? Math.round(((q.price - q.yearLow) / (q.yearHigh - q.yearLow)) * 100) : 50;
  const volLabel = !st ? '' : st.volatility < 0.2 ? a.volLow : st.volatility < 0.4 ? a.volMid : a.volHigh;

  let text = fill(a.stock, {
    name: s.stocks.names[sym] ?? q.name,
    symbol: sym,
    price: formatPrice(q.price, q.currency, lang),
    pct: pctFmt(q.changePct, lang),
    m1: m1 === null ? '—' : pctFmt(m1, lang),
    y1: st ? pctFmt(st.change, lang) : '—',
    low: formatPrice(q.yearLow, q.currency, lang),
    high: formatPrice(q.yearHigh, q.currency, lang),
    pos,
  });
  if (st) {
    text += `\n${fill(a.trendLine, { trend: st.aboveAvg50 ? a.trendAbove : a.trendBelow })}`;
    text += `\n${fill(a.volLine, { vol: `${Math.round(st.volatility * 100)}%`, label: volLabel, dd: pctFmt(st.maxDrawdown, lang) })}`;
  }
  const mine = c.holdings.filter((h) => h.symbol === sym);
  if (mine.length) {
    const shares = mine.reduce((x, h) => x + h.shares, 0);
    const cost = mine.reduce((x, h) => x + h.shares * h.buyPrice, 0);
    const value = shares * q.price;
    text += `\n\n${fill(a.position, {
      shares,
      value: formatPrice(value, q.currency, lang),
      gain: formatSigned(value - cost, q.currency, lang),
      gainPct: pctFmt(cost ? value / cost - 1 : 0, lang),
    })}`;
  }
  if (news.length) text += `\n\n${a.newsHead}\n${news.map((n) => `• ${n.title}`).join('\n')}`;
  text += `\n\n${a.noSignal}`;
  return { text, actions: [{ label: fill(a.openStock, { symbol: sym }), href: `/stock/${encodeURIComponent(sym)}` }] };
}

async function compareAnswer(x: string, y: string, c: Ctx): Promise<AssistantReply> {
  const { s, lang } = c;
  const [hx, hy] = await Promise.all([getHistory(x, '1Y'), getHistory(y, '1Y')]);
  const sx = seriesStats(hx);
  const sy = seriesStats(hy);
  return {
    text: fill(s.assistant.compare, {
      a: x,
      b: y,
      ra: pctFmt(sx.change, lang),
      rb: pctFmt(sy.change, lang),
      va: `${Math.round(sx.volatility * 100)}%`,
      vb: `${Math.round(sy.volatility * 100)}%`,
      da: pctFmt(sx.maxDrawdown, lang),
      db: pctFmt(sy.maxDrawdown, lang),
      calmer: sx.volatility <= sy.volatility ? x : y,
    }),
    actions: [
      { label: fill(s.assistant.openStock, { symbol: x }), href: `/stock/${encodeURIComponent(x)}` },
      { label: fill(s.assistant.openStock, { symbol: y }), href: `/stock/${encodeURIComponent(y)}` },
    ],
  };
}

async function marketAnswer(c: Ctx): Promise<AssistantReply> {
  const { s, lang } = c;
  const syms = ['^GSPC', '^IXIC', '^TA125.TA', '^VIX', 'ILS=X', 'GC=F', 'BTC-USD'];
  const qs = await getQuotes(syms);
  const lines = syms
    .filter((x) => qs[x])
    .map((x) => fill(s.assistant.marketLine, { name: s.market.tiles[x as keyof typeof s.market.tiles] ?? x, price: formatPrice(qs[x].price, qs[x].currency, lang), pct: pctFmt(qs[x].changePct, lang) }));
  if (!lines.length) return { text: s.assistant.offline };
  const vix = qs['^VIX']?.price;
  const mood = vix === undefined ? '' : `\n\n${vix < 15 ? s.assistant.vixCalm : vix < 25 ? s.assistant.vixNormal : s.assistant.vixFear}`;
  return {
    text: `${fill(s.assistant.market, {
      lines: lines.join('\n'),
      ny: phaseText(marketStatus('NY'), s, lang),
      tlv: phaseText(marketStatus('TLV'), s, lang),
    })}${mood}`,
    actions: [{ label: s.events.title, href: '/events' }],
  };
}

async function fxAnswer(c: Ctx): Promise<AssistantReply> {
  const { s, lang } = c;
  const q = await getQuote('ILS=X');
  return {
    text: fill(s.assistant.fx, {
      rate: q.price.toFixed(3),
      pct: pctFmt(q.changePct, lang),
      ils: formatPrice(1000 * q.price, 'ILS', lang),
      usd: formatPrice(1000 / q.price, 'USD', lang),
      low: q.yearLow.toFixed(2),
      high: q.yearHigh.toFixed(2),
    }),
  };
}

async function newsAnswer(c: Ctx): Promise<AssistantReply> {
  const { s, lang } = c;
  const symbols = [...new Set([...c.holdings.map((h) => h.symbol), ...c.watchlist])];
  const ev = await getEvents({ symbols, lang });
  if (!ev.length) return { text: s.assistant.offline };
  const top = [...ev].sort((x, y) => y.score - x.score).slice(0, 5);
  const lines = top.map((e) =>
    fill(s.assistant.eventLine, {
      cat: s.events.cat[e.category],
      title: e.title,
      affects: e.affects.length ? fill(s.assistant.eventAffects, { list: e.affects.slice(0, 3).join(', ') }) : '',
    }),
  );
  return { text: fill(s.assistant.events, { lines: lines.join('\n') }), actions: [{ label: s.events.title, href: '/events' }] };
}

async function whyAnswer(sym: string, c: Ctx): Promise<AssistantReply> {
  const { s, lang } = c;
  const [q, news] = await Promise.all([getQuote(sym), getSymbolNews(sym, 4, c.lang)]);
  const pct = pctFmt(q.changePct, lang);
  if (!news.length) return { text: fill(s.assistant.whyNone, { symbol: sym, pct }) };
  return {
    text: `${fill(s.assistant.why, { symbol: sym, pct, lines: news.map((n) => `• ${n.title}`).join('\n') })}\n\n${s.assistant.noSignal}`,
    actions: [{ label: fill(s.assistant.openStock, { symbol: sym }), href: `/stock/${encodeURIComponent(sym)}` }],
  };
}

async function portfolioAnswer(c: Ctx): Promise<AssistantReply> {
  const { s, lang, profile } = c;
  if (!c.holdings.length) return { text: s.helper.answers.portfolioNone, actions: [{ label: s.tabs.stocks, href: '/stocks' }] };
  const cur = profile.currency;
  const [qs, rate] = await Promise.all([getQuotes(c.holdings.map((h) => h.symbol)), getUsdIls()]);
  type Row = { sym: string; value: number; cost: number; day: number; cur: string };
  const rows: Row[] = [];
  for (const h of c.holdings) {
    const q = qs[h.symbol];
    if (!q) continue;
    rows.push({
      sym: h.symbol,
      value: convert(q.price * h.shares, q.currency, cur, rate),
      cost: convert(h.buyPrice * h.shares, q.currency, cur, rate),
      day: convert(q.change * h.shares, q.currency, cur, rate),
      cur: q.currency,
    });
  }
  if (!rows.length) return { text: s.assistant.offline };
  const total = rows.reduce((x, r) => x + r.value, 0);
  const cost = rows.reduce((x, r) => x + r.cost, 0);
  const day = rows.reduce((x, r) => x + r.day, 0);
  const bySym = new Map<string, Row>();
  for (const r of rows) {
    const p = bySym.get(r.sym);
    bySym.set(r.sym, p ? { ...p, value: p.value + r.value, cost: p.cost + r.cost, day: p.day + r.day } : r);
  }
  const list = [...bySym.values()].map((r) => ({ ...r, ret: r.cost ? r.value / r.cost - 1 : 0, w: total ? r.value / total : 0 }));
  const best = [...list].sort((x, y) => y.ret - x.ret)[0];
  const worst = [...list].sort((x, y) => x.ret - y.ret)[0];
  const top = [...list].sort((x, y) => y.w - x.w)[0];
  const mix = new Map<string, number>();
  for (const r of rows) mix.set(r.cur, (mix.get(r.cur) ?? 0) + r.value);
  const mixText = [...mix.entries()].map(([k, v]) => `${k} ${Math.round((v / total) * 100)}%`).join(' · ');
  return {
    text: fill(s.assistant.portfolio, {
      total: formatPrice(total, cur, lang),
      day: formatSigned(day, cur, lang),
      gain: formatSigned(total - cost, cur, lang),
      gainPct: pctFmt(cost ? total / cost - 1 : 0, lang),
      best: best.sym,
      bestPct: pctFmt(best.ret, lang),
      worst: worst.sym,
      worstPct: pctFmt(worst.ret, lang),
      top: top.sym,
      topW: `${Math.round(top.w * 100)}%`,
      conc: top.w > 0.3 && list.length > 1 ? s.assistant.concWarn : list.length === 1 ? s.assistant.singleWarn : '',
      mix: mixText,
      rate: rate ? rate.toFixed(3) : '—',
    }),
    actions: [{ label: s.tabs.stocks, href: '/stocks' }],
  };
}

/** Scheduled market-moving events in the next weeks, each with scenarios, plus today's market mood. */
async function upcomingAnswer(c: Ctx): Promise<AssistantReply> {
  const { s, lang } = c;
  const cal = s.assistant.cal;
  const list = upcoming(35).slice(0, 7);
  if (!list.length) return { text: cal.none };
  const fmt = (d: Date) => d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const lines = list.map((e) => fill(cal.line, { date: fmt(e.date), approx: e.approx ? cal.approx : '', name: cal.names[e.kind], scen: cal.scen[e.kind], nl: '\n' }));
  let mood = '';
  try {
    const [vix, spx] = await Promise.all([getQuote('^VIX'), getHistory('^GSPC', '6M')]);
    const st = seriesStats(spx);
    mood = fill(cal.mood, {
      mood: fill(vix.price < 20 ? cal.moodCalm : cal.moodTense, { vix: vix.price.toFixed(1), trend: st.aboveAvg50 ? cal.above : cal.below }),
    });
  } catch {
    // Mood is optional.
  }
  return {
    text: [cal.intro, lines.join('\n'), mood, cal.outro].filter(Boolean).join('\n\n'),
    actions: [{ label: s.events.title, href: '/events' }],
  };
}

function hoursAnswer(c: Ctx): AssistantReply {
  const { s, lang } = c;
  const ny = marketStatus('NY');
  const tlv = marketStatus('TLV');
  return { text: fill(s.assistant.hours, { nyTime: hhmm(ny), tlvTime: hhmm(tlv), ny: phaseText(ny, s, lang), tlv: phaseText(tlv, s, lang) }) };
}

function dateAnswer(c: Ctx): AssistantReply {
  const { s, lang } = c;
  const d = new Date();
  const greg = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const heb = formatHebrewDate(hebrewFromGregorian(d.getFullYear(), d.getMonth() + 1, d.getDate()), lang);
  return { text: fill(s.assistant.date, { greg, heb }) };
}

function learnAnswer(c: Ctx): AssistantReply {
  const { s, lang } = c;
  const path = buildPath(c.academy, c.profile, c.holdings);
  const next = path.next ? ACADEMY[lang].lessons[path.next.id].title : '—';
  return {
    text: fill(s.assistant.learn, { done: path.doneCount, total: path.total, k: path.knowledge, next }),
    actions: path.next ? [{ label: s.academy.continue, href: `/lesson/${path.next.id}` }] : [{ label: s.tabs.learn, href: '/learn' }],
  };
}

/** Answers a question. `memory` is updated in place with the last stock discussed. */
/** Greetings and chit-chat. */
const SMALL_TALK = /^(hi|hey|hello|yo|sup|what'?s up|how are you|how'?s it going|good (morning|afternoon|evening))\b|^(מה קורה|מה נשמע|מה איתך|מה שלומך|מה העניינים|מה הולך|בוקר טוב|ערב טוב|צהריים טובים|לילה טוב)/i;

/** Follow-up phrasing that only makes sense with context. */
const MORE = /^(more|tell me more|go on|explain more|more details?|details)\b|^(עוד|תרחיב|הרחב|פרט|ספר( לי)? עוד|תסביר יותר|עוד פרטים)/i;
const WHY_ALONE = /^(why|how come)\s*\??$|^(למה|מדוע|למה זה)\s*\??$/i;
const PRONOUN_Q = /\b(is it|does it|will it|its|their)\b|^(זה|היא|הוא|האם זה|האם היא)\s/i;

/**
 * Next questions that fit what was just discussed, shown as chips under the answer.
 * They are phrased so the assistant routes them correctly.
 */
function followUpsFor(intent: string, ticker: string | undefined, c: Ctx): string[] {
  const f = c.s.assistant.fu;
  const t = ticker ?? '';
  switch (intent) {
    case 'stock':
    case 'why':
      return t ? [fill(f.why, { s: t }), fill(f.vs, { s: t }), f.more] : [f.market];
    case 'compare':
      return [f.more, f.portfolio, f.market];
    case 'portfolio':
      return [f.fx, f.news, f.learn];
    case 'fx':
      return [f.portfolio, f.market];
    case 'market':
    case 'hours':
      return [f.upcoming, f.news, f.portfolio];
    case 'upcoming':
      return [f.market, f.news, f.portfolio];
    case 'news':
      return [f.upcoming, f.market, f.portfolio];
    case 'web':
      return [f.more, f.learn];
    default:
      return [f.market, f.portfolio];
  }
}

/** Questions that ask for general knowledge ("what is", "מה זה"). */
const KNOWLEDGE_Q = /^(what|who|explain|define|tell me about|meaning of)\b|^(מה זה|מה זו|מהו|מהי|מי זה|מיהו|מיהי|הסבר|תסביר|ספר לי|מה המשמעות)/i;

export type ThinkStep = 'think' | 'memory' | 'prices' | 'history' | 'news' | 'web' | 'portfolio' | 'analyze';

/** What the assistant will do for a question, shown as the "thinking" status while it works. */
export function thinkingSteps(text: string, watchlist: string[]): ThinkStep[] {
  const t = text.trim();
  const tickers = findTickers(t, watchlist);
  const steps: ThinkStep[] = ['think', 'memory'];
  if (tickers.length) steps.push('prices', 'history', 'news');
  else if (INTENT.portfolio.test(t)) steps.push('portfolio', 'prices');
  else if (INTENT.news.test(t)) steps.push('news');
  else if (INTENT.market.test(t) || INTENT.fx.test(t)) steps.push('prices');
  else if (KNOWLEDGE_Q.test(t)) steps.push('web');
  steps.push('analyze');
  return steps;
}

function topicKey(t: string, tickers: string[]): string | null {
  if (tickers.length) return 'stock';
  for (const k of ['portfolio', 'fx', 'news', 'market', 'hours', 'date', 'learn'] as const) if (INTENT[k].test(t)) return k;
  return null;
}

async function webReply(q: string, c: Ctx, prefix = '', sentences = 3): Promise<AssistantReply | null> {
  const known = sentences === 3 ? getBrain().web[normalize(q)] : undefined;
  const w = known ?? (await webAnswer(q, c.lang, sentences));
  if (!w) return null;
  if (!known) rememberWeb(q, w);
  return {
    text: `${prefix}${fill(c.s.assistant.webFrom, { title: w.title })}
${w.text}`,
    actions: [{ label: c.s.assistant.webRead, href: w.url }],
    source: 'web',
  };
}

export async function ask(text: string, c: Ctx): Promise<AssistantReply> {
  const t = text.trim();
  await loadBrain();
  let tickers = findTickers(t, c.watchlist);
  const mem = c.memory;
  // Context: a question that only says "why?", "is it risky?" or "and the news?" is about the
  // stock we were just talking about.
  const contextual = INTENT.followUp.test(t) || WHY_ALONE.test(t) || PRONOUN_Q.test(t);
  if (!tickers.length && contextual && mem.lastTicker) tickers = [mem.lastTicker];
  // "and NVDA?" right after a comparison compares the previous stock with the new one.
  if (tickers.length === 1 && mem.lastIntent === 'compare' && INTENT.followUp.test(t) && mem.lastTicker && mem.lastTicker !== tickers[0]) {
    tickers = [mem.lastTicker, tickers[0]];
  }
  if (tickers.length) {
    c.memory.lastTicker = tickers[tickers.length - 1];
    c.memory.lastSubject = undefined;
  }
  learnQuestion({ tickers, topic: topicKey(t, tickers) });

  const name = learnName(t);
  if (name) return { text: fill(c.s.assistant.nameLearned, { name }), source: 'rules' };
  const prefer = getBrain().prefer[normalize(t)];

  try {
    // Buy / sell questions keep the no-advice answer, but still show the facts.
    const rule = ruleAnswer(t, { s: c.s, profile: c.profile, lang: c.lang, watchlist: c.watchlist, holdings: c.holdings });
    const noAdvice = 'text' in rule && rule.text === c.s.helper.answers.noAdvice;
    const live = (r: AssistantReply): AssistantReply => ({ ...r, source: 'live' });

    const done = (r: AssistantReply, intent: string): AssistantReply => {
      mem.lastIntent = intent;
      mem.lastQuestion = t;
      return { ...r, followUps: followUpsFor(intent, tickers[0] ?? mem.lastTicker, c) };
    };

    // "Tell me more": go deeper on whatever we were just discussing.
    if (MORE.test(t)) {
      if (mem.lastSubject) {
        const w = await webReply(mem.lastSubject, c, '', 8);
        if (w) return done(w, 'web');
      }
      if (mem.lastTicker) return done(live(await stockAnswer(mem.lastTicker, c)), 'stock');
      if (mem.lastQuestion && mem.lastQuestion !== t) return ask(mem.lastQuestion, c);
    }

    if (tickers.length >= 2 && (INTENT.compare.test(t) || mem.lastIntent === 'compare')) return done(live(await compareAnswer(tickers[0], tickers[1], c)), 'compare');
    if (tickers.length && (INTENT.why.test(t) || WHY_ALONE.test(t))) return done(live(await whyAnswer(tickers[0], c)), 'why');
    if (tickers.length) {
      const r = await stockAnswer(tickers[0], c);
      return done(live(noAdvice ? { ...r, text: `${c.s.helper.answers.noAdvice}

${r.text}` } : r), 'stock');
    }
    if (INTENT.upcoming.test(t)) return done(live(await upcomingAnswer(c)), 'upcoming');
    if (INTENT.portfolio.test(t)) return done(live(await portfolioAnswer(c)), 'portfolio');
    if (INTENT.fx.test(t)) return done(live(await fxAnswer(c)), 'fx');
    if (INTENT.news.test(t)) return done(live(await newsAnswer(c)), 'news');
    if (INTENT.date.test(t)) return done(live(dateAnswer(c)), 'date');
    if (INTENT.hours.test(t)) return done(live(hoursAnswer(c)), 'hours');
    if (INTENT.market.test(t)) return done(live(await marketAnswer(c)), 'market');
    if (INTENT.learn.test(t)) return done(live(learnAnswer(c)), 'learn');

    if ('quote' in rule) return done(live(await stockAnswer(rule.quote, c)), 'stock');

    const unknown = rule.text === c.s.helper.answers.unknown;
    // Small talk ("מה קורה", "how are you") gets a friendly reply, never a web search.
    if (SMALL_TALK.test(t)) return done({ text: c.s.assistant.smallTalk, source: 'rules' }, 'rules');
    // The web is only for real knowledge questions ("what is…", "מה זה…", "who is…"), and
    // feedback can steer those only: topics the app knows (summary, debt…) stay on the rules.
    const knowledge = KNOWLEDGE_Q.test(t);
    if (knowledge && (prefer === 'web' || (unknown && prefer !== 'rules'))) {
      const w = await webReply(t, c);
      if (w) {
        mem.lastSubject = t;
        return done(w, 'web');
      }
    }
    const greet = rule.text === c.s.helper.answers.greet && getBrain().name ? fill(c.s.assistant.greetName, { name: getBrain().name ?? '' }) : rule.text;
    // A knowledge question ("מה זה מדד המחירים לצרכן") is answered from the web first: keyword
    // rules can match a loose word ("מדד") and explain the wrong thing. Rules are the fallback.
    if (knowledge && prefer !== 'rules' && !unknown) {
      const w = await webReply(t, c);
      if (w) {
        mem.lastSubject = t;
        return done(w, 'web');
      }
    }
    return done({ text: greet, source: 'rules' }, 'rules');
  } catch {
    return { text: c.s.assistant.offline };
  }
}
