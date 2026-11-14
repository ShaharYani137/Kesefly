/**
 * World and economy events that move markets, ranked by how much they matter to this user.
 *
 * Free sources, no API key (tested 2026-11-14):
 *   - CNBC RSS: top news and economy.
 *   - MarketWatch RSS: top stories.
 *   - Globes RSS (Hebrew): capital market, Tel Aviv + Wall Street.
 *   - Yahoo Finance search API: latest stories per ticker, with related tickers.
 * Endpoints are unofficial or best-effort; any failing source is skipped.
 *
 * Classification is keyword based (English + Hebrew): a category (rates, inflation, energy...),
 * an impact level, a direction hint from the headline wording, and the user's symbols it touches,
 * either directly (the story names the company) or through the category (rates move all stocks,
 * shekel news moves Tel Aviv holdings...). Educational only: no buy or sell signal.
 * No React imports: the background alert task uses this file too.
 */

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  /** Publish time, ms since epoch. */
  time: number;
  lang: 'en' | 'he';
  /** Tickers the source tagged (Yahoo only). */
  tickers: string[];
  /** Set when `title` was machine-translated into the app language; holds the source title. */
  original?: string;
};

export type EventCategory =
  | 'rates'
  | 'inflation'
  | 'jobs'
  | 'growth'
  | 'energy'
  | 'geopolitics'
  | 'trade'
  | 'earnings'
  | 'tech'
  | 'crypto'
  | 'currency'
  | 'israel'
  | 'markets'
  | 'company';

export type Impact = 'high' | 'medium' | 'low';

export type MarketEvent = NewsItem & {
  category: EventCategory;
  impact: Impact;
  direction: 'up' | 'down' | null;
  /** User symbols this story touches. */
  affects: string[];
  /** True when the story names one of the user's companies. */
  direct: boolean;
  score: number;
};

const UA = { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' };

const FEEDS: { url: string; source: string; lang: 'en' | 'he' }[] = [
  { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', source: 'CNBC', lang: 'en' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC', lang: 'en' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', source: 'MarketWatch', lang: 'en' },
  // Hebrew sources, used when the app is in Hebrew (tested 2026-11-14).
  { url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=585', source: 'גלובס', lang: 'he' },
  { url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=1225', source: 'גלובס', lang: 'he' },
  { url: 'https://www.ynet.co.il/Integration/StoryRss6.xml', source: 'ynet', lang: 'he' },
  {
    url: 'https://news.google.com/rss/search?q=%D7%91%D7%95%D7%A8%D7%A1%D7%94%20OR%20%D7%9E%D7%A0%D7%99%D7%95%D7%AA%20OR%20%D7%A8%D7%99%D7%91%D7%99%D7%AA&hl=he&gl=IL&ceid=IL:he',
    source: 'Google News',
    lang: 'he',
  },
];

/* ---------- Translation ---------- */

/**
 * English headlines shown in Hebrew mode are machine-translated with Google's free web
 * translate endpoint (translate.googleapis.com, client=gtx, no key; unofficial, best-effort).
 * Only public headline text is sent. On any failure the original English stays.
 */
const translated = new Map<string, string>();
const SEP = '\n';

async function translateTitles(titles: string[], to: 'he'): Promise<void> {
  const todo = [...new Set(titles.filter((t) => !translated.has(t)))].slice(0, 120);
  // Batches of 30 keep each request URL short; they run in parallel.
  const batches: string[][] = [];
  for (let i = 0; i < todo.length; i += 30) batches.push(todo.slice(i, i + 30));
  await Promise.all(batches.map((b) => translateBatch(b, to)));
}

async function translateBatch(todo: string[], to: 'he'): Promise<void> {
  if (!todo.length) return;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${to === 'he' ? 'iw' : to}&dt=t&q=${encodeURIComponent(todo.join(SEP))}`;
    const res = await withTimeout(fetch(url, { headers: UA }), 12_000);
    if (!res.ok) return;
    const body = (await res.json()) as [[string, string][]];
    const out = body[0].map((seg) => seg[0]).join('').split(SEP);
    if (out.length !== todo.length) return;
    todo.forEach((t, i) => {
      const h = out[i]?.trim();
      if (h) translated.set(t, h);
    });
  } catch {
    // Keep English titles.
  }
}

/** Google News titles end with " - Source": move it into `source`. */
function splitGoogleSource(i: NewsItem): NewsItem {
  if (i.source !== 'Google News') return i;
  const m = i.title.match(/^(.*)\s-\s([^-]{2,40})$/);
  return m ? { ...i, title: m[1].trim(), source: m[2].trim() } : i;
}

/* ---------- Fetch + parse ---------- */

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
}

/** Small FNV-1a hash, for stable ids from links. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

export function parseRss(xml: string, source: string, lang: 'en' | 'he'): NewsItem[] {
  return xml
    .split(/<item[\s>]/i)
    .slice(1)
    .map((raw) => {
      const title = tag(raw, 'title');
      const link = tag(raw, 'link');
      const time = Date.parse(tag(raw, 'pubDate')) || Date.now();
      return { id: hash(link || title), title, link, source, time, lang, tickers: [] };
    })
    .filter((i) => i.title.length > 0);
}

async function fetchFeed(f: (typeof FEEDS)[number]): Promise<NewsItem[]> {
  const res = await withTimeout(fetch(f.url, { headers: UA }), 12_000);
  if (!res.ok) return [];
  return parseRss(await res.text(), f.source, f.lang);
}

type YahooNews = { uuid: string; title: string; publisher: string; link: string; providerPublishTime: number; relatedTickers?: string[] };

async function fetchTickerNews(symbol: string, count = 4): Promise<NewsItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=${count}&quotesCount=0`;
  const res = await withTimeout(fetch(url, { headers: UA }), 12_000);
  if (!res.ok) return [];
  const body = (await res.json()) as { news?: YahooNews[] };
  return (body.news ?? []).map((n) => ({
    id: hash(n.link || n.uuid),
    title: n.title,
    link: n.link,
    source: n.publisher,
    time: n.providerPublishTime * 1000,
    lang: 'en' as const,
    // Only the source's own tags: a search hit for NVDA can be a story about something else.
    tickers: (n.relatedTickers ?? []).map((t) => t.toUpperCase()),
  }));
}

/* ---------- Classification ---------- */

type Rule = { category: EventCategory; weight: number; en: RegExp; he: RegExp };

/** First matching rule wins, so specific categories come before broad ones. */
const RULES: Rule[] = [
  {
    category: 'rates',
    weight: 45,
    en: /\b(fed|fomc|powell|rate (cut|hike)s?|interest rates?|central bank|ecb|treasury yields?|bond yields?|10-year)\b/i,
    he: /(ריבית|בנק ישראל|הפד|פאוול|תשואות האג"ח|תשואות אג״ח)/,
  },
  {
    category: 'inflation',
    weight: 40,
    en: /\b(inflation|cpi|ppi|consumer prices|wholesale prices|pce|cost of living)\b/i,
    he: /(אינפלציה|מדד המחירים|יוקר המחיה|מדד ה?צרכן)/,
  },
  { category: 'jobs', weight: 35, en: /\b(jobs report|payrolls|unemployment|jobless|labor market|hiring)\b/i, he: /(אבטלה|שוק העבודה|דוח התעסוקה)/ },
  {
    category: 'growth',
    weight: 35,
    en: /\b(gdp|recession|economy (grew|shrank|contract\w*)|economic growth|slowdown|consumer spending|retail sales)\b/i,
    he: /(תוצר|צמיחה|מיתון|האטה|צריכה פרטית)/,
  },
  {
    category: 'energy',
    weight: 30,
    en: /\b(oil|crude|opec|brent|natural gas|gasoline|energy prices)\b/i,
    he: /(נפט|אופ"ק|אופ״ק|גז טבעי|ברנט|דלק)/,
  },
  {
    category: 'geopolitics',
    weight: 35,
    en: /\b(war|missile|attack|ceasefire|sanctions?|invasion|conflict|iran|hezbollah|hamas|gaza|ukraine|russia|military|strike on)\b/i,
    he: /(מלחמה|טילים?|הפסקת אש|סנקציות|איראן|חיזבאללה|חמאס|עזה|מבצע|ביטחוני|תקיפה)/,
  },
  {
    category: 'trade',
    weight: 32,
    en: /\b(tariffs?|trade war|trade deal|export (ban|controls?)|import duties|customs)\b/i,
    he: /(מכסים?|מלחמת סחר|הסכם סחר|יצוא|ייצוא|מגבלות יצוא)/,
  },
  {
    category: 'currency',
    weight: 28,
    en: /\b(dollar|shekel|currency|forex|exchange rate|yen|euro)\b/i,
    he: /(שקל|דולר|שער החליפין|מטבע|יורו)/,
  },
  { category: 'crypto', weight: 20, en: /\b(bitcoin|crypto\w*|ethereum|stablecoin)\b/i, he: /(ביטקוין|קריפטו|מטבעות דיגיטליים)/ },
  {
    category: 'earnings',
    weight: 25,
    en: /\b(earnings|quarterly results|revenue|profit|guidance|beats? estimates|misses? estimates|outlook)\b/i,
    he: /(דוחות|הדוחות|רווח|הכנסות|תחזית|רבעון)/,
  },
  {
    category: 'tech',
    weight: 22,
    en: /\b(ai|chips?|semiconductors?|nvidia|apple|microsoft|google|alphabet|amazon|meta|tesla|openai)\b/i,
    he: /(בינה מלאכותית|שבבים|אנבידיה|אפל|מיקרוסופט|גוגל|אמזון|טסלה|הייטק)/,
  },
  {
    category: 'israel',
    weight: 25,
    en: /\b(israel\w*|tel aviv|tase|ta-?35|ta-?125)\b/i,
    he: /(תל אביב|ת"א|ת״א|הבורסה|ישראל|ממשלה|תקציב המדינה|מס)/,
  },
  {
    category: 'markets',
    weight: 22,
    en: /\b(stocks?|s&p|dow|nasdaq|wall street|markets?|rally|sell-?off|futures|index)\b/i,
    he: /(וול סטריט|מניות|מדד|מדדים|שוק ההון|נאסד"ק|נאסד״ק|אס אנד פי)/,
  },
];

const UP = /\b(surge\w*|soar\w*|jump\w*|rall(y|ies|ied)|gain\w*|rise[sn]?|rising|climb\w*|record high|beats?|boost\w*|rebound\w*|cut rates|rate cuts?)\b|(זינוק|מזנק|עליות|עולה|שיא|מטפס|קפיצה|הורדת ריבית)/i;
const DOWN = /\b(plunge\w*|tumble\w*|slump\w*|fall(s|ing)?|fell|drop\w*|sink\w*|slid(e|es)?|crash\w*|sell-?off|miss(es)?|cuts? guidance|warns?|fears?|hike\w*|loss(es)?)\b|(ירידות|יורד|צונח|נופל|קריסה|נפילה|מפולת|העלאת ריבית|הפסד|אזהרה)/i;

/** Company names for common symbols (English + Hebrew), used to spot a story about the user's stock. */
const ALIASES: Record<string, string[]> = {
  AAPL: ['apple', 'אפל'],
  MSFT: ['microsoft', 'מיקרוסופט'],
  NVDA: ['nvidia', 'אנבידיה'],
  GOOGL: ['google', 'alphabet', 'גוגל', 'אלפבית'],
  GOOG: ['google', 'alphabet', 'גוגל'],
  AMZN: ['amazon', 'אמזון'],
  META: ['meta', 'facebook', 'מטא', 'פייסבוק'],
  TSLA: ['tesla', 'טסלה'],
  AMD: ['amd'],
  AVGO: ['broadcom', 'ברודקום'],
  INTC: ['intel', 'אינטל'],
  NFLX: ['netflix', 'נטפליקס'],
  TEVA: ['teva', 'טבע'],
  'TEVA.TA': ['teva', 'טבע'],
  CHKP: ['check point', "צ'ק פוינט", 'צ׳ק פוינט'],
  NICE: ['nice systems', 'נייס'],
  ESLT: ['elbit', 'אלביט'],
  'ESLT.TA': ['elbit', 'אלביט'],
  'LUMI.TA': ['leumi', 'לאומי'],
  'POLI.TA': ['hapoalim', 'הפועלים'],
  'ICL.TA': ['icl', 'כיל'],
  SPY: ['s&p 500', 's&p'],
  VOO: ['s&p 500', 's&p'],
  QQQ: ['nasdaq', 'נאסד"ק', 'נאסד״ק'],
  '^TA125.TA': ['ta-125', 'ta-35', 'tel aviv', 'ת"א', 'ת״א', 'תל אביב'],
};

const isTA = (s: string) => s.endsWith('.TA');
const TECH = new Set(['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'AMD', 'AVGO', 'INTC', 'QQQ', 'CHKP', 'NICE', 'TSM', 'NFLX']);
const ENERGY = new Set(['XOM', 'CVX', 'COP', 'BP', 'SHEL', 'XLE', 'OXY', 'DLEKG.TA', 'NWMD.TA']);
const BROAD = new Set(['SPY', 'VOO', 'VT', 'VTI', 'QQQ', 'IVV', 'DIA', '^GSPC', '^TA125.TA']);

/** Symbols a story affects through its category, from the user's list. */
function indirect(category: EventCategory, symbols: string[]): string[] {
  switch (category) {
    case 'rates':
    case 'inflation':
    case 'jobs':
    case 'growth':
    case 'markets':
      // Macro news moves broad funds first; rates and inflation also hit growth/tech names.
      return symbols.filter((s) => BROAD.has(s) || (category !== 'markets' && TECH.has(s)) || (!isTA(s) && category === 'growth'));
    case 'energy':
      return symbols.filter((s) => ENERGY.has(s) || BROAD.has(s));
    case 'geopolitics':
    case 'israel':
      return symbols.filter((s) => isTA(s) || ['TEVA', 'CHKP', 'NICE', 'ESLT', 'EIS'].includes(s));
    case 'currency':
      return symbols.filter((s) => isTA(s));
    case 'tech':
      // A story about one tech company moves tech funds, not every other tech stock.
      return symbols.filter((s) => s === 'QQQ');
    case 'trade':
      return symbols.filter((s) => TECH.has(s) || BROAD.has(s));
    default:
      return [];
  }
}

function mentions(title: string, sym: string): boolean {
  const lower = title.toLowerCase();
  const base = sym.replace(/\.TA$/, '').replace(/^\^/, '');
  if (base.length >= 3 && new RegExp(`(^|[^A-Z])${base.replace(/[.^]/g, '\\$&')}([^A-Z]|$)`).test(title)) return true;
  return (ALIASES[sym] ?? []).some((a) => lower.includes(a));
}

export function classify(item: NewsItem, symbols: string[], now = Date.now()): MarketEvent {
  const rule = RULES.find((r) => r.en.test(item.title) || r.he.test(item.title));
  const direct = symbols.filter((s) => item.tickers.includes(s) || mentions(item.title, s));
  let category: EventCategory = rule?.category ?? 'markets';
  if (!rule && direct.length) category = 'company';
  const via = indirect(category, symbols);
  const affects = [...new Set([...direct, ...via])];
  const ageH = Math.max(0, (now - item.time) / 3600_000);
  const up = UP.test(item.title);
  const down = DOWN.test(item.title);
  const direction = up === down ? null : up ? 'up' : 'down';
  const score =
    (rule?.weight ?? 10) + (direct.length ? 35 : 0) + (via.length ? 12 : 0) + (direction ? 10 : 0) + Math.max(0, 20 - ageH * 2);
  const impact: Impact = score >= 85 ? 'high' : score >= 55 ? 'medium' : 'low';
  return { ...item, category, impact, direction, affects, direct: direct.length > 0, score };
}

/* ---------- Public API ---------- */

let memo: { at: number; key: string; events: MarketEvent[] } | null = null;
const MEMO_MS = 60_000;

/**
 * Latest events, newest first, de-duplicated by link and near-identical title.
 * `symbols` = the user's holdings + watchlist (holdings first; news is fetched for up to 6).
 */
export async function getEvents(opts: { symbols: string[]; lang: 'en' | 'he'; force?: boolean }): Promise<MarketEvent[]> {
  const key = `${opts.lang}|${opts.symbols.join(',')}`;
  if (!opts.force && memo && memo.key === key && Date.now() - memo.at < MEMO_MS) return memo.events;

  const feeds = FEEDS.filter((f) => f.lang === 'en' || opts.lang === 'he');
  const tickerSyms = opts.symbols.filter((s) => !s.startsWith('^')).slice(0, 6);
  const batches = await Promise.allSettled([...feeds.map(fetchFeed), ...tickerSyms.map((s) => fetchTickerNews(s))]);
  const items = batches.flatMap((b) => (b.status === 'fulfilled' ? b.value : [])).map(splitGoogleSource);

  const seen = new Set<string>();
  const now = Date.now();
  const events = items
    .filter((i) => now - i.time < 3 * 86400_000)
    .sort((a, b) => b.time - a.time)
    .filter((i) => {
      const k = i.title.toLowerCase().replace(/[^a-z0-9א-ת]+/g, '').slice(0, 60);
      if (seen.has(i.id) || seen.has(k)) return false;
      seen.add(i.id);
      seen.add(k);
      return true;
    })
    .map((i) => classify(i, opts.symbols, now));

  const localized = await localize(events, opts.lang);
  if (localized.length) memo = { at: Date.now(), key, events: localized };
  return localized;
}

/**
 * Shows stories in the app language: in Hebrew, English headlines are translated (up to 120;
 * classification already ran on the English text). The source title is kept in `original`.
 */
async function localize(events: MarketEvent[], lang: 'en' | 'he'): Promise<MarketEvent[]> {
  if (lang !== 'he') return events;
  await translateTitles(
    events.filter((e) => e.lang === 'en').map((e) => e.title),
    'he',
  );
  return events.map((e) => {
    const t = e.lang === 'en' ? translated.get(e.title) : undefined;
    return t ? { ...e, original: e.title, title: t, lang: 'he' as const } : e;
  });
}

/** Stories about one symbol (for the stock page and the chat). */
export async function getSymbolNews(symbol: string, count = 6, lang: 'en' | 'he' = 'en'): Promise<MarketEvent[]> {
  try {
    let items = await fetchTickerNews(symbol, count);
    // Tel Aviv listings often have no Yahoo stories; dual-listed companies do under the US symbol.
    if (!items.length && symbol.toUpperCase().endsWith('.TA')) items = await fetchTickerNews(symbol.slice(0, -3), count);
    return await localize(
      items.map((i) => classify(i, [symbol.toUpperCase(), symbol.toUpperCase().replace(/\.TA$/, '')])),
      lang,
    );
  } catch {
    return [];
  }
}

/** "5m", "3h", "2d" style age, localized. */
export function ago(t: number, lang: 'en' | 'he', now = Date.now()): string {
  const m = Math.max(0, Math.round((now - t) / 60_000));
  if (m < 1) return lang === 'he' ? 'עכשיו' : 'now';
  if (m < 60) return lang === 'he' ? `לפני ${m} ד׳` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'he' ? `לפני ${h} ש׳` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === 'he' ? `לפני ${d} י׳` : `${d}d ago`;
}
