import { describe, expect, it } from 'vitest';

import { taxReport, type TaxInput, type TaxRules } from '../tax';

// US resident, 30% short-term, 15% long-term: a 1,000 gain is 300 short-term or 150 long-term.
const US: TaxRules = { country: 'US', usShort: 0.3, usLong: 0.15 };
/** Local noon on a calendar day, so results do not depend on the test machine's time zone. */
const at = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day, 12).getTime();
};

/** One lot of 10 shares at 100, sold in full at 200 (gain 1,000). */
function sold(buy: string, sell: string) {
  const input: TaxInput = {
    lots: [{ symbol: 'AAA', shares: 10, buyPrice: 100, date: buy }],
    sales: [{ symbol: 'AAA', shares: 10, price: 200, date: sell }],
    dividends: [],
    prices: {},
    conv: (v) => v,
    rules: US,
    year: Number(sell.slice(0, 4)),
    now: at(sell),
  };
  return taxReport(input).realized;
}

/** One lot of 10 shares at 100, still held, priced at 200 today (gain 1,000). */
function held(buy: string, today: string) {
  const r = taxReport({
    lots: [{ symbol: 'AAA', shares: 10, buyPrice: 100, date: buy }],
    sales: [],
    dividends: [],
    prices: { AAA: 200 },
    conv: (v) => v,
    rules: US,
    year: Number(today.slice(0, 4)),
    now: at(today),
  });
  return r.open[0];
}

describe('US holding period: long-term only when held more than one year (IRS Pub. 550)', () => {
  it('a sale on the one-year anniversary is still short-term', () => {
    const r = sold('2025-06-10', '2026-06-10');
    expect(r.split).toEqual({ short: 1000, long: 0 });
    expect(r.tax).toBeCloseTo(300);
  });

  it('a sale the day after the anniversary is long-term', () => {
    const r = sold('2025-06-10', '2026-06-11');
    expect(r.split).toEqual({ short: 0, long: 1000 });
    expect(r.tax).toBeCloseTo(150);
  });

  it('a sale well inside the year is short-term, well after is long-term', () => {
    expect(sold('2025-01-15', '2025-09-01').split.long).toBe(0);
    expect(sold('2023-01-15', '2026-09-01').split.short).toBe(0);
  });

  it('across Feb 29: the anniversary sale is short-term even though 366 days have passed', () => {
    // Bought 2027-03-01, the year to 2028-03-01 has 366 days. The 365-day rule called this long-term.
    expect(sold('2027-03-01', '2028-02-29').split).toEqual({ short: 1000, long: 0 });
    const r = sold('2027-03-01', '2028-03-01');
    expect(r.split).toEqual({ short: 1000, long: 0 });
    expect(r.tax).toBeCloseTo(300);
    expect(sold('2027-03-01', '2028-03-02').split).toEqual({ short: 0, long: 1000 });
  });

  it('across Feb 29, mid-year buy: anniversary short-term, next day long-term', () => {
    expect(sold('2027-06-01', '2028-06-01').split).toEqual({ short: 1000, long: 0 });
    expect(sold('2027-06-01', '2028-06-02').split).toEqual({ short: 0, long: 1000 });
  });

  it('a Feb 29 buy has its anniversary on Feb 28 in a non-leap year', () => {
    expect(sold('2028-02-29', '2029-02-28').split).toEqual({ short: 1000, long: 0 });
    expect(sold('2028-02-29', '2029-03-01').split).toEqual({ short: 0, long: 1000 });
  });

  it('a Feb 28 buy before a leap day: Feb 29 is the day after the anniversary', () => {
    expect(sold('2027-02-28', '2028-02-28').split).toEqual({ short: 1000, long: 0 });
    expect(sold('2027-02-28', '2028-02-29').split).toEqual({ short: 0, long: 1000 });
  });

  it('undated lots count as long-term (saved before dates existed)', () => {
    const r = taxReport({
      lots: [{ symbol: 'AAA', shares: 10, buyPrice: 100 }],
      sales: [{ symbol: 'AAA', shares: 10, price: 200, date: '2026-05-01' }],
      dividends: [],
      prices: {},
      conv: (v) => v,
      rules: US,
      year: 2026,
    });
    expect(r.realized.split).toEqual({ short: 0, long: 1000 });
  });
});

describe('US "turns long-term on" date for held lots', () => {
  it('is the day after the anniversary, with no leap day in between', () => {
    const p = held('2025-06-10', '2026-06-01');
    expect(p.split).toEqual({ short: 1000, long: 0 });
    expect(p.longSoon).toMatchObject({ date: '2026-06-11', days: 10, shares: 10 });
    expect(p.longSoon!.saves).toBeCloseTo(150);
  });

  it('is the day after the anniversary across Feb 29 (was a day early)', () => {
    expect(held('2027-03-01', '2028-02-20').longSoon).toMatchObject({ date: '2028-03-02', days: 11 });
  });

  it('is March 1 for a Feb 29 buy', () => {
    expect(held('2028-02-29', '2029-02-20').longSoon).toMatchObject({ date: '2029-03-01', days: 9 });
  });

  it('on the anniversary the lot is still short-term, one day to go', () => {
    const p = held('2025-06-10', '2026-06-10');
    expect(p.split).toEqual({ short: 1000, long: 0 });
    expect(p.longSoon).toMatchObject({ date: '2026-06-11', days: 1 });
  });

  it('the day after the anniversary the lot is long-term and has no countdown', () => {
    const p = held('2025-06-10', '2026-06-11');
    expect(p.split).toEqual({ short: 0, long: 1000 });
    expect(p.longSoon).toBeUndefined();
  });
});
