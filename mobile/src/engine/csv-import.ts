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
 * column named in agorot are divided by 100 here, once (`agorotConverted`); for other files the
 * Import screen asks and converts with `toShekelRows`.
 * Numbers: in a ;-delimited file a comma is the decimal mark ("182,50" = 182.5); otherwise a
 * comma before exactly 3 digits groups thousands ("1,234.56", "1,234").
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

/** `date`: a date that does not exist (31/02) or cannot be read. `column`: the section's header lacks a needed column. */
export type ImportIssue = { line: number; reason: 'symbol' | 'number' | 'action' | 'date' | 'column' };

export type ImportResult = {
  format: 'ibkr' | 'table' | 'unknown';
  rows: ImportRow[];
  issues: ImportIssue[];
  /** Rows that were not trades (deposits, interest, totals): skipped quietly. */
  skipped: number;
  /** True when the price column was named in agorot and prices were already divided by 100. */
  agorotConverted: boolean;
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

/** Guesses the delimiter (, ; or tab) from the first non-empty line. */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const first = text.replace(/^﻿/, '').split(/\r?\n/).find((l) => l.trim()) ?? '';
  const counts = ([',', ';', '\t'] as const).map((d) => ({ d, n: first.split(d).length }));
  return counts.sort((a, b) => b.n - a.n)[0].d;
}

/** Splits CSV text into rows of cells. Handles quotes, "" escapes, CRLF, BOM; guesses , ; or tab. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const delim = detectDelimiter(src);
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

/**
 * "1,234.50", "1.234,50", "182,50", "(12.3)", "$45", "₪ 12", "-3" → number; NaN when not a number.
 * `decimalComma` (the file is ;-delimited): a lone comma is the decimal mark, so "1,234" = 1.234.
 * Otherwise a lone comma before exactly 3 digits groups thousands ("1,234" = 1234) and any other
 * lone comma is a decimal mark ("182,50" = 182.5: thousands groups always have 3 digits).
 * Mixed or badly grouped separators that fit neither style give NaN, so the line is reported.
 */
export function parseNumber(t: string | undefined, decimalComma = false): number {
  if (t === undefined) return NaN;
  let s = t.trim();
  if (!s) return NaN;
  const neg = /^\(.*\)$/.test(s) || /-$/.test(s);
  s = s.replace(/[()$₪€£\s‎‏]/g, '').replace(/-$/, '');
  const comma = s.lastIndexOf(',');
  const dot = s.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) {
      // 1.234,50
      if (!/^-?\d{1,3}(\.\d{3})*,\d+$/.test(s)) return NaN;
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.50
      if (!/^-?\d{1,3}(,\d{3})*\.\d+$/.test(s)) return NaN;
      s = s.replace(/,/g, '');
    }
  } else if (comma >= 0) {
    if (s.indexOf(',') === comma && (decimalComma || !/^-?\d{1,3},\d{3}$/.test(s))) s = s.replace(',', '.'); // 182,50
    else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, ''); // 1,234,567
    else return NaN;
  } else if (decimalComma && /^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, ''); // 1.234.567
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
  // Days in the month, leap years included (31/02 and 29/02/2025 do not exist).
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return undefined;
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

/** Columns a row of each IBKR section cannot be read without. */
const IBKR_REQUIRED: Record<string, string[]> = {
  Trades: ['Symbol', 'Quantity', 'T. Price'],
  Dividends: ['Description', 'Amount'],
  'Withholding Tax': ['Description', 'Amount'],
};

/** A date cell that has text but no real date (31/02, an unknown format) is an error, not "no date". */
const badDate = (raw: string | undefined, date: string | undefined) => !!raw?.trim() && !date;

function parseIbkr(rows: string[][], decimalComma: boolean): ImportResult {
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
    // A column missing from the header reads as undefined (not r[1], the "Data" marker).
    const get = (name: string) => {
      const at = h.indexOf(name);
      return at < 0 ? undefined : r[2 + at];
    };
    const num = (name: string) => parseNumber(get(name), decimalComma);
    const missing = (IBKR_REQUIRED[section] ?? []).some((c) => !h.includes(c));
    if (section === 'Trades') {
      if (get('DataDiscriminator') && get('DataDiscriminator') !== 'Order') return skipped++;
      if (!/stock|etf|fund/i.test(get('Asset Category') ?? 'Stocks')) return skipped++;
      if (missing) return issues.push({ line, reason: 'column' });
      const qty = num('Quantity');
      const price = num('T. Price');
      const symbol = resolveSymbol(get('Symbol') ?? '', get('Currency'));
      if (!symbol) return issues.push({ line, reason: 'symbol' });
      if (!Number.isFinite(qty) || !qty || !Number.isFinite(price)) return issues.push({ line, reason: 'number' });
      const date = parseDate(get('Date/Time'), false);
      if (badDate(get('Date/Time'), date)) return issues.push({ line, reason: 'date' });
      out.push({
        kind: qty < 0 ? 'sell' : 'buy',
        symbol,
        date,
        shares: Math.abs(qty),
        price,
        fee: Math.abs(num('Comm/Fee') || 0),
        amount: 0,
        tax: 0,
        line,
      });
    } else if (section === 'Dividends' || section === 'Withholding Tax') {
      if (/^total/i.test(get('Currency') ?? '')) return skipped++;
      if (missing) return issues.push({ line, reason: 'column' });
      const desc = get('Description') ?? '';
      const amount = num('Amount');
      if (!desc) return skipped++;
      const symbol = resolveSymbol(desc.split(/[(\s]/)[0], get('Currency'));
      if (!symbol) return issues.push({ line, reason: 'symbol' });
      if (!Number.isFinite(amount)) return issues.push({ line, reason: 'number' });
      const date = parseDate(get('Date'), false);
      if (badDate(get('Date'), date)) return issues.push({ line, reason: 'date' });
      if (section === 'Withholding Tax') withholding.push({ symbol, date, amount: -amount });
      else out.push({ kind: 'dividend', symbol, date, shares: 0, price: 0, fee: 0, amount, tax: 0, line });
    } else skipped++;
  });
  // Withholding rows sit in their own section: attach each to its dividend (same symbol and date).
  for (const w of withholding) {
    const d = out.find((x) => x.kind === 'dividend' && x.symbol === w.symbol && x.date === w.date);
    if (d) d.tax += w.amount;
  }
  return { format: 'ibkr', rows: out, issues, skipped, agorotConverted: false };
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

function parseTable(rows: string[][], decimalComma: boolean): ImportResult {
  const hi = rows.findIndex((r) => {
    const m = mapHeader(r);
    return (m.symbol ?? m.id ?? m.name) !== undefined && (m.qty !== undefined || m.amount !== undefined);
  });
  if (hi < 0) return { format: 'unknown', rows: [], issues: [], skipped: rows.length, agorotConverted: false };
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
    const num = (c: Col) => parseNumber(cell(c), decimalComma);
    const qty = num('qty');
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
    if (badDate(cell('date'), date)) {
      issues.push({ line, reason: 'date' });
      continue;
    }
    const fee = Math.abs(num('fee') || 0);
    const amount = Math.abs(num('amount'));
    if (kind === 'dividend') {
      if (!Number.isFinite(amount) || !amount) {
        issues.push({ line, reason: 'number' });
        continue;
      }
      out.push({ kind, symbol, date, shares: 0, price: 0, fee: 0, amount, tax: Math.abs(num('tax') || 0), line });
      continue;
    }
    let price = Math.abs(num('price'));
    // Only a price read from the agorot column is in agorot; amount / quantity is already in shekels.
    if (agorot) price /= 100;
    const shares = Math.abs(qty);
    // No price: amount / quantity.
    if (!Number.isFinite(price) && Number.isFinite(amount) && shares) price = amount / shares;
    if (!Number.isFinite(shares) || !shares || !Number.isFinite(price) || !price) {
      issues.push({ line, reason: 'number' });
      continue;
    }
    out.push({ kind, symbol, date, shares, price, fee, amount: 0, tax: 0, line });
  }
  return { format: 'table', rows: out, issues, skipped, agorotConverted: agorot };
}

export function parseImport(text: string): ImportResult {
  const rows = parseCsv(text);
  const decimalComma = detectDelimiter(text) === ';';
  if (rows.some((r) => r[1] === 'Header' && (r[0] === 'Trades' || r[0] === 'Dividends'))) return parseIbkr(rows, decimalComma);
  return parseTable(rows, decimalComma);
}

/**
 * The Import screen's "Tel Aviv prices are in shekels / agorot" choice. With 'ila', Tel Aviv buy
 * and sell prices and fees are divided by 100, unless the engine already converted the file
 * (`agorotConverted`), so agorot are never divided twice.
 */
export function toShekelRows(result: ImportResult, unit: 'ils' | 'ila'): ImportRow[] {
  if (unit === 'ils' || result.agorotConverted) return result.rows;
  return result.rows.map((r) => (r.kind !== 'dividend' && r.symbol.endsWith('.TA') ? { ...r, price: r.price / 100, fee: r.fee / 100 } : r));
}
