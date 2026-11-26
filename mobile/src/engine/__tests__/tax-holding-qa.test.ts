import { describe, expect, it } from 'vitest';

import { taxReport, type TaxInput, type TaxRules } from '../tax';

// QA for P-056: edge cases around the US holding period that tax.test.ts does not cover.
const US: TaxRules = { country: 'US', usShort: 0.3, usLong: 0.15 };
const IL: TaxRules = { country: 'IL', usShort: 0.3, usLong: 0.15 };

/** Local wall-clock time on a calendar day. */
const local = (d: string, h: number, min = 0) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day, h, min).getTime();
};

function report(over: Partial<TaxInput>) {
  return taxReport({
    lots: [],
    sales: [],
    dividends: [],
    prices: {},
    conv: (v) => v,
    rules: US,
    year: 2026,
    ...over,
  });
}

/** One lot of 10 at 100, held, priced at 200 (gain 1,000), at time `now`. */
const held = (buy: string, now: number, rules = US) =>
  report({ lots: [{ symbol: 'AAA', shares: 10, buyPrice: 100, date: buy }], prices: { AAA: 200 }, rules, now }).open[0];

describe('P-056 QA: `now` is read as the local calendar day', () => {
  it('late on the anniversary (23:59 local) the held lot is still short-term', () => {
    const p = held('2025-06-10', local('2026-06-10', 23, 59));
    expect(p.split).toEqual({ short: 1000, long: 0 });
    expect(p.longSoon).toMatchObject({ date: '2026-06-11', days: 1 });
  });

  it('just after local midnight on the day after the anniversary it is long-term', () => {
    const p = held('2025-06-10', local('2026-06-11', 0, 1));
    expect(p.split).toEqual({ short: 0, long: 1000 });
    expect(p.longSoon).toBeUndefined();
  });

  it('day count is a whole number across a DST change', () => {
    // Mar-Apr crosses DST in Israel, the US and Europe.
    const p = held('2025-04-15', local('2026-03-01', 23, 30));
    expect(p.longSoon).toMatchObject({ date: '2026-04-16', days: 46 });
  });
});

describe('P-056 QA: other edges', () => {
  it('year-end buy: long-term from Jan 1 two years later', () => {
    expect(held('2025-12-31', local('2026-12-31', 12)).longSoon).toMatchObject({ date: '2027-01-01', days: 1 });
    expect(held('2025-12-31', local('2027-01-01', 12)).split.long).toBe(1000);
  });

  it('a sale the day before the anniversary is short-term', () => {
    const r = report({
      lots: [{ symbol: 'AAA', shares: 10, buyPrice: 100, date: '2025-06-10' }],
      sales: [{ symbol: 'AAA', shares: 10, price: 200, date: '2026-06-09' }],
    });
    expect(r.realized.split).toEqual({ short: 1000, long: 0 });
  });

  it('FIFO across lots: older lot long-term, newer lot short-term on the same sale', () => {
    const r = report({
      lots: [
        { symbol: 'AAA', shares: 5, buyPrice: 100, date: '2025-01-10' },
        { symbol: 'AAA', shares: 5, buyPrice: 100, date: '2025-06-10' },
      ],
      sales: [{ symbol: 'AAA', shares: 10, price: 200, date: '2026-06-10' }],
    });
    expect(r.realized.split).toEqual({ short: 500, long: 500 });
  });

  it('longSoon shows the lot that turns long-term first', () => {
    const p = report({
      lots: [
        { symbol: 'AAA', shares: 5, buyPrice: 100, date: '2026-01-10' },
        { symbol: 'AAA', shares: 3, buyPrice: 100, date: '2025-09-01' },
      ],
      prices: { AAA: 200 },
      now: local('2026-06-01', 12),
    }).open[0];
    expect(p.longSoon).toMatchObject({ date: '2026-09-02', shares: 3, days: 93 });
  });

  it('an unreadable buy date counts short-term and does not throw', () => {
    const p = held('garbage', local('2026-06-01', 12));
    expect(p.split).toEqual({ short: 1000, long: 0 });
    expect(p.longSoon).toBeUndefined();
    // '2024-1-5' sorts before the sale (so it is matched) but is not YYYY-MM-DD.
    const r = report({
      lots: [{ symbol: 'AAA', shares: 10, buyPrice: 100, date: '2024-1-5' }],
      sales: [{ symbol: 'AAA', shares: 10, price: 200, date: '2026-06-10' }],
    });
    expect(r.realized.split).toEqual({ short: 1000, long: 0 });
  });
});

describe('P-056 QA: Israel path unaffected', () => {
  it('anniversary sale: whole gain in one bucket, 25%', () => {
    const r = report({
      lots: [{ symbol: 'AAA', shares: 10, buyPrice: 100, date: '2027-03-01' }],
      sales: [{ symbol: 'AAA', shares: 10, price: 200, date: '2028-03-01' }],
      rules: IL,
      year: 2028,
    });
    expect(r.realized.split).toEqual({ short: 0, long: 1000 });
    expect(r.realized.tax).toBeCloseTo(250);
  });

  it('held lot: no short/long split and no "turns long-term" countdown', () => {
    const p = held('2026-05-01', local('2026-06-01', 12), IL);
    expect(p.split).toEqual({ short: 0, long: 1000 });
    expect(p.longSoon).toBeUndefined();
    expect(p.taxIfSold).toBeCloseTo(250);
  });
});
