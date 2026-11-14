/**
 * Find a stock by ticker, company name (English or Hebrew) or Tel Aviv security number
 * (מספר נייר ערך). Two sources:
 * - Every tradable Tel Aviv security (shares, ETFs, bonds, warrants), bundled from the TASE
 *   public list (`src/data/tase-securities.json`, rebuilt by `scripts/make_tase_list.py`).
 *   Works offline, in Hebrew and by security number.
 * - Yahoo Finance search for all other markets (Latin names and tickers).
 * Only the typed query leaves the phone.
 */
import TASE from '@/data/tase-securities.json';

export type SecurityKind = 'share' | 'etf' | 'bond' | 'warrant';

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
const KIND_RANK: Record<SecurityKind, number> = { share: 0, etf: 1, bond: 2, warrant: 3 };

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
    scored.push({ score: score + KIND_RANK[kind], m: { symbol, name, exchange: 'Tel Aviv', taseId: id, kind } });
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

async function yahooMatches(q: string, signal?: AbortSignal): Promise<SymbolMatch[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal });
  if (!res.ok) return [];
  const body = (await res.json()) as YahooSearch;
  return (body.quotes ?? [])
    .filter((r) => r.symbol && TYPES.has(r.quoteType ?? ''))
    .map((r) => ({ symbol: r.symbol!.toUpperCase(), name: r.longname ?? r.shortname ?? r.symbol!, exchange: r.exchDisp ?? '' }));
}

/**
 * Matches for a query, at most 10. Hebrew text and security numbers search the Tel Aviv list
 * only (Yahoo does not know them). Latin text mixes both: Yahoo first for global reach, Tel Aviv
 * matches fill in. Network errors return only the Tel Aviv list.
 */
export async function searchSymbols(query: string, signal?: AbortSignal): Promise<SymbolMatch[]> {
  const q = query.trim();
  if (!q) return [];
  const local = localMatches(q);
  if (HEBREW.test(q) || /^\d+$/.test(q)) return local;
  let remote: SymbolMatch[] = [];
  try {
    remote = await yahooMatches(q, signal);
  } catch {
    // Offline or aborted: Tel Aviv list only.
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
