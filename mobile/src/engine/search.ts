/**
 * Find a stock by ticker, company name (English or Hebrew) or Tel Aviv security number
 * (מספר נייר ערך). Two sources:
 * - Every tradable Tel Aviv security (shares, ETFs, mutual funds, bonds, warrants), bundled from the TASE
 *   public list (`src/data/tase-securities.json`, rebuilt by `scripts/make_tase_list.py`).
 *   Works offline, in Hebrew and by security number.
 * - Yahoo Finance search for all other markets (Latin names and tickers).
 * Only the typed query leaves the phone.
 */
import TASE from '@/data/tase-securities.json';

export type SecurityKind = 'share' | 'etf' | 'fund' | 'bond' | 'warrant';

export type SymbolMatch = {
  symbol: string;
  name: string;
  /** Exchange label, e.g. "Tel Aviv", "NASDAQ". */
  exchange: string;
  /** TASE security number, when known. */
  taseId?: string;
  kind?: SecurityKind;
};

/** [security number, Yahoo symbol, Hebrew name, English name, kind] */
type TaseRow = [string, string, string, string, SecurityKind];
const ROWS = TASE as TaseRow[];

/** US stocks people often type in Hebrew. */
const HEBREW_ALIASES: { symbol: string; en: string; he: string; exchange: string }[] = [
  { symbol: 'AAPL', en: 'Apple', he: 'אפל', exchange: 'NASDAQ' },
  { symbol: 'MSFT', en: 'Microsoft', he: 'מיקרוסופט', exchange: 'NASDAQ' },
  { symbol: 'NVDA', en: 'NVIDIA', he: 'אנבידיה', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', en: 'Alphabet (Google)', he: 'גוגל', exchange: 'NASDAQ' },
  { symbol: 'AMZN', en: 'Amazon', he: 'אמזון', exchange: 'NASDAQ' },
  { symbol: 'META', en: 'Meta Platforms', he: 'מטא', exchange: 'NASDAQ' },
  { symbol: 'TSLA', en: 'Tesla', he: 'טסלה', exchange: 'NASDAQ' },
  { symbol: 'INTC', en: 'Intel', he: 'אינטל', exchange: 'NASDAQ' },
  { symbol: 'NFLX', en: 'Netflix', he: 'נטפליקס', exchange: 'NASDAQ' },
  { symbol: 'SPY', en: 'SPDR S&P 500 ETF', he: 'אס אנד פי 500', exchange: 'NYSE Arca' },
  { symbol: 'QQQ', en: 'Invesco QQQ (Nasdaq-100)', he: 'נאסדק 100', exchange: 'NASDAQ' },
];

const norm = (t: string) => t.trim().toLowerCase().replace(/["״׳'.\-]/g, '').replace(/\s+/g, ' ');
const HEBREW = /[֐-׿]/;
const LIMIT = 10;

/** Lower score = better: exact number/symbol, then name starts with the query, then contains; shares before ETFs, bonds, warrants. */
const KIND_RANK: Record<SecurityKind, number> = { share: 0, etf: 1, fund: 2, bond: 3, warrant: 4 };

function localMatches(q: string): SymbolMatch[] {
  const n = norm(q);
  if (!n) return [];
  const digits = /^\d+$/.test(n);
  const scored: { score: number; m: SymbolMatch }[] = [];
  for (const [id, symbol, he, en, kind] of ROWS) {
    let score: number;
    if (digits) {
      if (id === n) score = 0;
      else if (id.startsWith(n)) score = 10;
      else continue;
    } else {
      const sym = norm(symbol.replace(/\.TA$/, ''));
      const h = norm(he);
      const e = norm(en);
      if (sym === n) score = 0;
      else if (h === n || e === n) score = 1;
      else if (h.startsWith(n) || e.startsWith(n) || sym.startsWith(n)) score = 10;
      else if (h.includes(n) || e.includes(n)) score = 20;
      else continue;
    }
    const name = he && en ? `${he} · ${en}` : he || en;
    scored.push({ score: score + KIND_RANK[kind], m: { symbol, name, exchange: kind === 'fund' ? 'Tel Aviv · Fund' : 'Tel Aviv', taseId: id, kind } });
  }
  if (!digits) {
    for (const a of HEBREW_ALIASES) {
      if (norm(a.he).includes(n) || norm(a.en).startsWith(n)) scored.push({ score: 5, m: { symbol: a.symbol, name: `${a.en} · ${a.he}`, exchange: a.exchange } });
    }
  }
  return scored.sort((x, y) => x.score - y.score).slice(0, LIMIT).map((x) => x.m);
}

type YahooSearch = {
  quotes?: { symbol?: string; shortname?: string; longname?: string; exchDisp?: string; quoteType?: string }[];
};
const TYPES = new Set(['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX']);

/** Longest wait for Yahoo search before giving up and showing the Tel Aviv list only. */
export const SEARCH_TIMEOUT_MS = 5_000;

/**
 * Yahoo search, aborted after `SEARCH_TIMEOUT_MS` or when the caller's signal aborts, whichever
 * comes first. Joined by hand (not `AbortSignal.any`/`AbortSignal.timeout`) so it works on every
 * JS engine the app runs on.
 */
async function yahooMatches(q: string, signal?: AbortSignal, timeoutMs = SEARCH_TIMEOUT_MS): Promise<SymbolMatch[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
  if (signal?.aborted) return [];
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  signal?.addEventListener('abort', stop);
  const timer = setTimeout(stop, timeoutMs);
  // fetch does not always settle on abort (some engines ignore the signal), so race it too.
  const aborted = new Promise<never>((_, reject) => ctrl.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  try {
    const work = (async () => {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: ctrl.signal });
      if (!res.ok) return [];
      return ((await res.json()) as YahooSearch).quotes ?? [];
    })();
    work.catch(() => {}); // A late failure after the timeout won the race is not an error.
    const quotes = await Promise.race([work, aborted]);
    return quotes
      .filter((r) => r.symbol && TYPES.has(r.quoteType ?? ''))
      .map((r) => ({ symbol: r.symbol!.toUpperCase(), name: r.longname ?? r.shortname ?? r.symbol!, exchange: r.exchDisp ?? '' }));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
}

/** Offline matches (Tel Aviv list and Hebrew names of US stocks), at once and without the network. */
export function localSymbols(query: string): SymbolMatch[] {
  return localMatches(query.trim());
}

/** True when `searchSymbols` also asks Yahoo: Latin text. Hebrew text and security numbers stay offline. */
export function searchesOnline(query: string): boolean {
  const q = query.trim();
  return q.length > 0 && !HEBREW.test(q) && !/^\d+$/.test(q);
}

/**
 * Matches for a query, at most 10. Hebrew text and security numbers search the Tel Aviv list
 * only (Yahoo does not know them). Latin text mixes both: Yahoo first for global reach, Tel Aviv
 * matches fill in. Network errors, a Yahoo wait over `SEARCH_TIMEOUT_MS` or an aborted `signal`
 * return only the Tel Aviv list. Show `localSymbols` while this runs.
 */
export async function searchSymbols(query: string, signal?: AbortSignal, timeoutMs = SEARCH_TIMEOUT_MS): Promise<SymbolMatch[]> {
  const q = query.trim();
  if (!q) return [];
  const local = localMatches(q);
  if (!searchesOnline(q)) return local;
  let remote: SymbolMatch[] = [];
  try {
    remote = await yahooMatches(q, signal, timeoutMs);
  } catch {
    // Offline, timed out or aborted: Tel Aviv list only.
  }
  // Exact Tel Aviv symbol hits stay on top; otherwise interleave so both markets show.
  const out: SymbolMatch[] = [];
  const seen = new Set<string>();
  const add = (m: SymbolMatch | undefined) => {
    if (m && !seen.has(m.symbol)) {
      seen.add(m.symbol);
      out.push(m);
    }
  };
  for (let i = 0; i < LIMIT && out.length < LIMIT; i++) {
    add(remote[i]);
    add(local[i]);
  }
  return out.slice(0, LIMIT);
}
