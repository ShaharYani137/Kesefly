import { describe, expect, it } from 'vitest';

import { parseImport, parseNumber, toShekelRows } from '../csv-import';

// P-055 QA: regressions around the CSV money fixes (US files, tab files, Israeli exports).

describe('US ,-delimited exports still work', () => {
  it('reads quoted thousands, plain numbers, month-first dates and negative fees', () => {
    const r = parseImport(
      'Date,Action,Symbol,Quantity,Price,Fees & Comm,Amount\n' +
        '01/15/2025,Buy,AAPL,"1,000","1,234.50",1,\n' +
        '01/16/2025 as of 01/15/2025,Sell,AAPL,10,"2,345",0,\n' +
        '01/17/2025,Buy,MSFT,5,410.2,,',
    );
    expect(r.issues).toEqual([]);
    expect(r.rows.map((x) => [x.kind, x.symbol, x.date, x.shares, x.price])).toEqual([
      ['buy', 'AAPL', '2025-01-15', 1000, 1234.5],
      ['sell', 'AAPL', '2025-01-16', 10, 2345],
      ['buy', 'MSFT', '2025-01-17', 5, 410.2],
    ]);
  });

  it('parseNumber keeps comma grouping outside ;-files', () => {
    expect(parseNumber('12,345,678')).toBe(12345678);
    expect(parseNumber('-1,234')).toBe(-1234);
    expect(parseNumber('1,234-')).toBe(-1234);
    expect(parseNumber('(1,234.50)')).toBe(-1234.5);
    expect(parseNumber('$1,234.50')).toBe(1234.5);
    expect(parseNumber('1,23,456')).toBeNaN();
  });
});

describe('tab-delimited files', () => {
  it('reads comma thousands and a lone decimal comma', () => {
    const r = parseImport('Date\tAction\tSymbol\tQuantity\tPrice\n2025-01-15\tBuy\tAAPL\t1,000\t182,50\n2025-01-16\tBuy\tMSFT\t5\t1,234.5');
    expect(r.issues).toEqual([]);
    expect(r.rows.map((x) => [x.shares, x.price])).toEqual([
      [1000, 182.5],
      [5, 1234.5],
    ]);
  });
});

describe('Israeli exports', () => {
  it('agorot column: price and amount / quantity both end in shekels, never divided twice', () => {
    const r = parseImport(
      'תאריך,סוג פעולה,מספר נייר,כמות,שער באגורות,עמלה,סכום\n14/03/2025,קניה,604611,100,"4,512.00",5,\n15/03/2025,קניה,604611,100,,5,"4,512.00"',
    );
    expect(r.agorotConverted).toBe(true);
    expect(r.rows.map((x) => [x.symbol, x.date, x.price, x.fee])).toEqual([
      ['LUMI.TA', '2025-03-14', 45.12, 5],
      ['LUMI.TA', '2025-03-15', 45.12, 5],
    ]);
    expect(toShekelRows(r, 'ila')).toEqual(r.rows);
  });

  it('shekel column: the screen choice divides Tel Aviv prices and fees once, and leaves US rows and dividends', () => {
    const r = parseImport('תאריך,סוג פעולה,סימול,כמות,שער,עמלה,סכום,מטבע\n14/03/2025,קניה,604611,100,4512,5,,\n14/03/2025,קניה,AAPL,1,200,1,,USD\n20/03/2025,דיבידנד,604611,,,,50,');
    expect(r.agorotConverted).toBe(false);
    const ila = toShekelRows(r, 'ila');
    expect(ila.map((x) => [x.symbol, x.kind, x.price, x.fee, x.amount])).toEqual([
      ['LUMI.TA', 'buy', 45.12, 0.05, 0],
      ['AAPL', 'buy', 200, 1, 0],
      ['LUMI.TA', 'dividend', 0, 0, 50],
    ]);
    expect(toShekelRows(r, 'ils')).toBe(r.rows);
    expect(r.rows[0].price).toBe(4512); // the engine result itself is not changed
  });

  it('a row with an impossible date is reported and the other rows still import', () => {
    const r = parseImport('תאריך,סוג פעולה,מספר נייר,כמות,שער\n31/02/2025,קניה,604611,1,10\n29/02/2024,קניה,604611,1,10\n,קניה,604611,1,10');
    expect(r.issues).toEqual([{ line: 2, reason: 'date' }]);
    expect(r.rows.map((x) => x.date)).toEqual(['2024-02-29', undefined]);
  });
});

describe('Interactive Brokers', () => {
  it('a missing Date/Time column imports undated; SubTotal and Total rows stay quiet', () => {
    const r = parseImport(
      'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Quantity,T. Price,Comm/Fee\n' +
        'Trades,Data,Order,Stocks,USD,AAPL,10,"1,190.5",-1\n' +
        'Trades,SubTotal,,Stocks,USD,AAPL,10,,-1\n' +
        'Dividends,Header,Currency,Date,Description,Amount\n' +
        'Dividends,Data,USD,2025-02-14,AAPL(US0378331005) Cash Dividend USD 0.25 per Share,2.5\n' +
        'Dividends,Data,Total,,,2.5',
    );
    expect(r.issues).toEqual([]);
    expect(r.rows.map((x) => [x.kind, x.symbol, x.date, x.shares, x.price, x.fee, x.amount])).toEqual([
      ['buy', 'AAPL', undefined, 10, 1190.5, 1, 0],
      ['dividend', 'AAPL', '2025-02-14', 0, 0, 0, 2.5],
    ]);
  });

  it('a Dividends section without Amount reports every data row, not a silent skip', () => {
    const r = parseImport('Dividends,Header,Currency,Date,Description\nDividends,Data,USD,2025-02-14,AAPL(US0378331005) Cash Dividend\nDividends,Data,Total,,');
    expect(r.rows).toEqual([]);
    expect(r.issues).toEqual([{ line: 2, reason: 'column' }]);
  });
});
