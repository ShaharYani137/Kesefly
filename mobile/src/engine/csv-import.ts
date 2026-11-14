/**
 * Broker CSV import: turns a broker's transaction export into purchases, sales and dividends.
 * Pure (no I/O); the Import screen previews the result before anything is saved.
 *
 * Formats:
 * - Interactive Brokers activity statement CSV (sections "Trades", "Dividends",
 *   "Withholding Tax"). Sells have a negative quantity; fees are negative.
 * - Any table with a header row: columns are found by name, in English or Hebrew, so exports
 *   from Israeli brokers (IBI, Meitav, Excellence, bank trading sites) and US brokers work
 *   when their headers use the usual words (symbol / סימול / מספר נייר, date / תאריך,
 *   quantity / כמות, price / שער, fee / עמלה, action / סוג פעולה ...).
 * Tel Aviv security numbers become Yahoo symbols through the bundled TASE list. Prices in a
 * column named in agorot are divided by 100.
 */
import TASE from '@/data/tase-securities.json';

export type ImportKind = 'buy' | 'sell' | 'dividend';

export type ImportRow = {
  kind: ImportKind;
  symbol: string;
  /** YYYY-MM-DD. */
  date?: string;
  shares: number;
  /** Per share, in the stock's currency. 0 for dividends. */
  price: number;
  fee: number;
  /** Dividends: gross amount received. */
  amount: number;
  /** Dividends: tax withheld. */
  tax: number;
  /** 1-based line in the file, for error messages. */
  line: number;
};

export type ImportIssue = { line: number; reason: 'symbol' | 'number' | 'action' };

export type ImportResult = {
  format: 'ibkr' | 'table' | 'unknown';
  rows: ImportRow[];
  issues: ImportIssue[];
  /** Rows that were not trades (deposits, interest, totals): skipped quietly. */
  skipped: number;
};

type TaseRow = [string, string, string, string, string];
const ROWS = TASE as TaseRow[];
const BY_ID = new Map(ROWS.map((r) => [r[0], r[1]]));
const normName = (t: string) => t.trim().toLowerCase().replace(/["״׳'.\-]/g, '').replace(/\s+/g, ' ');
const BY_NAME = new Map<string, string>();
for (const r of ROWS) {
  BY_NAME.set(normName(r[2]), r[1]);
  BY_NAME.set(normName(r[3]), r[1]);
}
const HEBREW = /[֐-׿]/;

// ---------- CSV ----------

/** Splits CSV text into rows of cells. Handles quotes, "" escapes, CRLF, BOM; guesses , ; or tab. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const counts = [',', ';', '\t'].map((d) => ({ d, n: first.split(d).length }));
  const delim = counts.sort((a, b) => b.n - a.n)[0].d;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (c === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell.trim() || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

// ---------- Values ----------

/** "1,234.50", "(12.3)", "$45", "₪ 12", "-3" → number; NaN when not a number. */
export function parseNumber(t: string | undefined): number {
  if (t === undefined) return NaN;
  let s = t.trim();
  if (!s) return NaN;
  const neg = /^\(.*\)$/.test(s) || /-$/.test(s);
  s = s.replace(/[()$₪€£\s‎‏]/g, '').replace(/-$/, '');
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,50
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return neg ? -Math.abs(n) : n;
}

/**
 * Dates to YYYY-MM-DD. Accepts 2025-03-14, 20250314, 14/03/2025, 3/14/25, 14.03.2025, with or
 * without a time after. `dayFirst` decides 01/02/2025 (Israel and most of the world: day first).
 */
export function parseDate(t: string | undefined, dayFirst: boolean): string | undefined {
  if (!t) return undefined;
  const s = t.trim().split(/[ ,T]/)[0];
  let y: number, m: number, d: number;
  let r = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s))) {
    const a = +r[1];
    const b = +r[2];
    y = +r[3] < 100 ? 2000 + +r[3] : +r[3];
    [d, m] = dayFirst ? [a, b] : [b, a];
  } else return undefined;
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Guess day-first from the data: a first part over 12 means day first, a second part over 12 means month first. */
function guessDayFirst(values: string[], fallback: boolean): boolean {
  for (const v of values) {
    const r = /^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(v.trim());
    if (!r) continue;
    if (+r[1] > 12) return true;
    if (+r[2] > 12) return false;
  }
  return fallback;
}

/** Broker symbol, security number or Hebrew name → app symbol. Empty string when unknown. */
export function resolveSymbol(raw: string, currency?: string): string {
  const t = raw.trim().replace(/^\$/, '');
  if (!t) return '';
  if (/^\d{5,9}$/.test(t)) return BY_ID.get(t) ?? `${t}.TA`;
  if (HEBREW.test(t)) return BY_NAME.get(normName(t)) ?? '';
  const byName = BY_NAME.get(normName(t));
  const up = t.toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z][A-Z0-9.^-]{0,11}$/.test(up)) {
    // A letter symbol priced in shekels is a Tel Aviv listing.
    if (!up.includes('.') && /^(ILS|ILA|NIS)$/i.test(currency ?? '')) return `${up}.TA`;
    return up;
  }
  return byName ?? '';
}

function actionOf(t: string | undefined): ImportKind | 'other' | undefined {
  if (!t) return undefined;
  const s = t.trim().toLowerCase();
  if (!s) return undefined;
  if (/^(b|bot)$/.test(s) || /\b(buy|bought|purchase|reinvest)/.test(s) || /קני|רכיש/.test(s)) return 'buy';
  if (/^(s|sld)$/.test(s) || /\b(sell|sold|sale)/.test(s) || /מכיר|מכר/.test(s)) return 'sell';
  if (/div/.test(s) || /דיבידנד/.test(s)) return 'dividend';
  return 'other';
}

// ---------- Interactive Brokers ----------

function parseIbkr(rows: string[][]): ImportResult {
  const out: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  let skipped = 0;
  const headers = new Map<string, string[]>();
  const withholding: { symbol: string; date?: string; amount: number }[] = [];
  rows.forEach((r, i) => {
    const line = i + 1;
    const [section, kind] = r;
    if (kind === 'Header') {
      headers.set(section, r.slice(2));
      return;
    }
    if (kind !== 'Data') return;
    const h = headers.get(section) ?? [];
    const get = (name: string) => r[2 + h.indexOf(name)];
    if (section === 'Trades') {
      if (get('DataDiscriminator') && get('DataDiscriminator') !== 'Order') return skipped++;
      if (!/stock|etf|fund/i.test(get('Asset Category') ?? 'Stocks')) return skipped++;
      const qty = parseNumber(get('Quantity'));
      const price = parseNumber(get('T. Price'));
      const symbol = resolveSymbol(get('Symbol') ?? '', get('Currency'));
      if (!symbol) return issues.push({ line, reason: 'symbol' });
      if (!Number.isFinite(qty) || !qty || !Number.isFinite(price)) return issues.push({ line, reason: 'number' });
      out.push({
        kind: qty < 0 ? 'sell' : 'buy',
        symbol,
        date: parseDate(get('Date/Time'), false),
        shares: Math.abs(qty),
        price,
        fee: Math.abs(parseNumber(get('Comm/Fee')) || 0),
        amount: 0,
        tax: 0,
        line,
      });
    } else if (section === 'Dividends' || section === 'Withholding Tax') {
      const desc = get('Description') ?? '';
      const amount = parseNumber(get('Amount'));
      if (/^total/i.test(get('Currency') ?? '') || !desc) return skipped++;
      const symbol = resolveSymbol(desc.split(/[(\s]/)[0], get('Currency'));
      if (!symbol) return issues.push({ line, reason: 'symbol' });
      if (!Number.isFinite(amount)) return issues.push({ line, reason: 'number' });
      const date = parseDate(get('Date'), false);
      if (section === 'Withholding Tax') withholding.push({ symbol, date, amount: -amount });
      else out.push({ kind: 'dividend', symbol, date, shares: 0, price: 0, fee: 0, amount, tax: 0, line });
    } else skipped++;
  });
  // Withholding rows sit in their own section: attach each to its dividend (same symbol and date).
  for (const w of withholding) {
    const d = out.find((x) => x.kind === 'dividend' && x.symbol === w.symbol && x.date === w.date);
    if (d) d.tax += w.amount;
  }
  return { format: 'ibkr', rows: out, issues, skipped };
}

// ---------- Generic table ----------

type Col = 'symbol' | 'id' | 'name' | 'date' | 'action' | 'qty' | 'price' | 'fee' | 'amount' | 'tax' | 'currency';

/** Header words per column, lowercased. First match wins, so specific names come first. */
const SYNONYMS: [Col, RegExp][] = [
  ['id', /^(security (number|id)|מספר נייר|מס[’'׳]? ?נייר|מספר ני["״]?ע|מס[’'׳]? ני["״]?ע|נייר ערך מספר)$/],
  ['symbol', /^(symbol|ticker|סימול|סמל)$/],
  ['name', /^(name|security|security name|description|instrument|שם נייר|שם נייר ערך|נייר|נייר ערך|שם)$/],
  ['date', /^(date|trade date|transaction date|date\/time|settlement date|תאריך|תאריך ביצוע|תאריך עסקה|תאריך ערך)$/],
  ['action', /^(action|type|side|transaction|transaction type|activity|buy\/sell|סוג|סוג פעולה|פעולה|סוג תנועה|סוג עסקה|קניה\/מכירה)$/],
  ['qty', /^(quantity|qty|shares|units|amount of shares|כמות|כמות ביצוע|כמות מבוצעת|יחידות)$/],
  ['price', /^(price|trade price|t\. price|execution price|price per share|שער|שער ביצוע|מחיר|מחיר ביצוע|שער באגורות|שער ביצוע באגורות)$/],
  ['fee', /^(fee|fees|commission|commissions|comm\/fee|עמלה|עמלות|עמלת ביצוע|עמלת קניה\/מכירה)$/],
  ['amount', /^(amount|net amount|proceeds|total|value|סכום|תמורה|סכום כולל|תמורה נטו|סכום בש["״]?ח)$/],
  ['tax', /^(tax|taxes|withholding|withholding tax|tax withheld|מס|מס שנוכה|ניכוי מס|מס במקור)$/],
  ['currency', /^(currency|ccy|מטבע)$/],
];

const cleanHeader = (h: string) => h.trim().toLowerCase().replace(/[‎‏]/g, '').replace(/\s*\(.*\)\s*$/, '').replace(/\s+/g, ' ');

function mapHeader(cells: string[]): Partial<Record<Col, number>> {
  const m: Partial<Record<Col, number>> = {};
  cells.forEach((raw, i) => {
    const h = cleanHeader(raw);
    for (const [col, re] of SYNONYMS) {
      if (m[col] === undefined && re.test(h)) {
        m[col] = i;
        break;
      }
    }
  });
  return m;
}

function parseTable(rows: string[][]): ImportResult {
  const hi = rows.findIndex((r) => {
    const m = mapHeader(r);
    return (m.symbol ?? m.id ?? m.name) !== undefined && (m.qty !== undefined || m.amount !== undefined);
  });
  if (hi < 0) return { format: 'unknown', rows: [], issues: [], skipped: rows.length };
  const header = rows[hi];
  const m = mapHeader(header);
  const agorot = m.price !== undefined && /אגורות|agorot|ila/i.test(header[m.price]);
  const hebrew = header.some((h) => HEBREW.test(h));
  // No telling sample (all parts ≤ 12): Hebrew headers mean an Israeli export (day first); else US style (month first).
  const dayFirst = guessDayFirst(m.date !== undefined ? rows.slice(hi + 1).map((r) => r[m.date!] ?? '') : [], hebrew);
  const out: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  let skipped = 0;
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    if (r.every((c) => !c)) continue;
    const cell = (c: Col) => (m[c] !== undefined ? r[m[c]!] : undefined);
    const currency = cell('currency');
    const rawSym = cell('symbol') || cell('id') || cell('name') || '';
    if (/^(total|סה["״]?כ|סך הכל)/i.test(rawSym.trim())) {
      skipped++;
      continue;
    }
    const qty = parseNumber(cell('qty'));
    const action = actionOf(cell('action'));
    if (action === 'other') {
      skipped++;
      continue;
    }
    const kind: ImportKind | undefined = action ?? (Number.isFinite(qty) && qty !== 0 ? (qty < 0 ? 'sell' : 'buy') : undefined);
    if (!kind) {
      issues.push({ line, reason: 'action' });
      continue;
    }
    const symbol = resolveSymbol(cell('symbol') ?? '', currency) || resolveSymbol(cell('id') ?? '', currency) || resolveSymbol(cell('name') ?? '', currency);
    if (!symbol) {
      issues.push({ line, reason: 'symbol' });
      continue;
    }
    const date = parseDate(cell('date'), dayFirst);
    const fee = Math.abs(parseNumber(cell('fee')) || 0);
    const amount = Math.abs(parseNumber(cell('amount')));
    if (kind === 'dividend') {
      if (!Number.isFinite(amount) || !amount) {
        issues.push({ line, reason: 'number' });
        continue;
      }
      out.push({ kind, symbol, date, shares: 0, price: 0, fee: 0, amount, tax: Math.abs(parseNumber(cell('tax')) || 0), line });
      continue;
    }
    let price = Math.abs(parseNumber(cell('price')));
    const shares = Math.abs(qty);
    // No price column: amount / quantity.
    if (!Number.isFinite(price) && Number.isFinite(amount) && shares) price = amount / shares;
    if (!Number.isFinite(shares) || !shares || !Number.isFinite(price) || !price) {
      issues.push({ line, reason: 'number' });
      continue;
    }
    if (agorot) price /= 100;
    out.push({ kind, symbol, date, shares, price, fee, amount: 0, tax: 0, line });
  }
  return { format: 'table', rows: out, issues, skipped };
}

export function parseImport(text: string): ImportResult {
  const rows = parseCsv(text);
  if (rows.some((r) => r[1] === 'Header' && (r[0] === 'Trades' || r[0] === 'Dividends'))) return parseIbkr(rows);
  return parseTable(rows);
}
