import { describe, expect, it } from 'vitest';

import { parseDate, parseImport, parseNumber, toShekelRows } from '../csv-import';

// P-055: money errors in the broker CSV import.

describe('decimal comma in ;-delimited files', () => {
  it('reads "182,50" as 182.5, not 18250', () => {
    const r = parseImport('Date;Action;Symbol;Quantity;Price;Fee\n15/01/2025;Buy;AAPL;10;182,50;1,25');
    expect(r.issues).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ kind: 'buy', symbol: 'AAPL', shares: 10, price: 182.5, fee: 1.25, date: '2025-01-15' });
  });

  it('reads European thousands "1.234,50" as 1234.5', () => {
    const r = parseImport('Date;Action;Symbol;Quantity;Price\n15/01/2025;Buy;AAPL;2;1.234,50');
    expect(r.rows[0].price).toBe(1234.5);
  });

  it('parseNumber: comma is the decimal mark when the file uses ;', () => {
    expect(parseNumber('182,50', true)).toBe(182.5);
    expect(parseNumber('1,5', true)).toBe(1.5);
    expect(parseNumber('1,234', true)).toBe(1.234);
    expect(parseNumber('1.234,5', true)).toBe(1234.5);
    expect(parseNumber('1.234.567,25', true)).toBe(1234567.25);
    expect(parseNumber('-12,75', true)).toBe(-12.75);
    expect(parseNumber('(12,75)', true)).toBe(-12.75);
    expect(parseNumber('182.50', true)).toBe(182.5);
  });

  it('parseNumber: a single comma not followed by exactly 3 digits is a decimal mark in any file', () => {
    expect(parseNumber('182,50')).toBe(182.5);
    expect(parseNumber('0,5')).toBe(0.5);
  });
});

describe('US files keep comma thousands separators', () => {
  it('reads quoted "1,234.56" in a ,-delimited file as 1234.56', () => {
    const r = parseImport('Date,Action,Symbol,Quantity,Price,Fee\n01/15/2025,Buy,AAPL,"1,000","1,234.56",1');
    expect(r.issues).toEqual([]);
    expect(r.rows[0]).toMatchObject({ shares: 1000, price: 1234.56, fee: 1, date: '2025-01-15' });
  });

  it('reads "1,234.56" in a tab-delimited file as 1234.56', () => {
    const r = parseImport('Date\tAction\tSymbol\tQuantity\tPrice\n2025-01-15\tBuy\tAAPL\t3\t1,234.56');
    expect(r.rows[0].price).toBe(1234.56);
  });

  it('parseNumber: US formats', () => {
    expect(parseNumber('1,234.56')).toBe(1234.56);
    expect(parseNumber('1,234')).toBe(1234);
    expect(parseNumber('1,234,567.5')).toBe(1234567.5);
    expect(parseNumber('$45')).toBe(45);
    expect(parseNumber('(12.3)')).toBe(-12.3);
    expect(parseNumber('-3')).toBe(-3);
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
  });
});

describe('Interactive Brokers export with a missing column', () => {
  const statement = 'Statement,Header,Field Name,Field Value\nStatement,Data,BrokerName,Interactive Brokers\n';

  it('imports trades when the DataDiscriminator column is absent (was: all skipped)', () => {
    const r = parseImport(
      statement +
        'Trades,Header,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/Fee\n' +
        'Trades,Data,Stocks,USD,AAPL,"2025-01-15, 10:30:00",10,190.5,-1\n' +
        'Trades,Data,Stocks,USD,MSFT,"2025-02-03, 11:00:00",-2,410.25,-1.05\n',
    );
    expect(r.format).toBe('ibkr');
    expect(r.issues).toEqual([]);
    expect(r.rows).toEqual([
      { kind: 'buy', symbol: 'AAPL', date: '2025-01-15', shares: 10, price: 190.5, fee: 1, amount: 0, tax: 0, line: 4 },
      { kind: 'sell', symbol: 'MSFT', date: '2025-02-03', shares: 2, price: 410.25, fee: 1.05, amount: 0, tax: 0, line: 5 },
    ]);
  });

  it('reports each trade as an issue when a required column is missing (never reads the "Data" marker)', () => {
    const r = parseImport(
      statement +
        'Trades,Header,DataDiscriminator,Asset Category,Currency,Date/Time,Quantity,T. Price\n' +
        'Trades,Data,Order,Stocks,USD,"2025-01-15, 10:30:00",10,190.5\n' +
        'Trades,Data,Order,Stocks,USD,"2025-01-16, 10:30:00",5,191\n',
    );
    expect(r.rows).toEqual([]);
    expect(r.issues).toEqual([
      { line: 4, reason: 'column' },
      { line: 5, reason: 'column' },
    ]);
    expect(r.rows.some((x) => x.symbol === 'DATA')).toBe(false);
  });

  it('reports dividends as issues when the Description column is missing', () => {
    const r = parseImport('Dividends,Header,Currency,Date,Amount\nDividends,Data,USD,2025-08-14,2.6\n');
    expect(r.rows).toEqual([]);
    expect(r.issues).toEqual([{ line: 2, reason: 'column' }]);
  });

  it('still skips subtotal and non-stock rows when the columns are there', () => {
    const r = parseImport(
      'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/Fee\n' +
        'Trades,Data,Order,Stocks,USD,AAPL,"2025-01-15, 10:30:00",10,190.5,-1\n' +
        'Trades,Data,Order,Forex,USD,EUR.USD,"2025-01-15, 10:30:00",100,1.05,-2\n' +
        'Trades,SubTotal,,Stocks,USD,AAPL,,10,,-1\n',
    );
    expect(r.rows).toHaveLength(1);
    expect(r.issues).toEqual([]);
    expect(r.skipped).toBe(1);
  });
});

describe('impossible dates are rejected', () => {
  it('parseDate rejects 31/02, 30/02, 31/04 and 29/02 in a non-leap year', () => {
    expect(parseDate('31/02/2025', true)).toBeUndefined();
    expect(parseDate('30/02/2024', true)).toBeUndefined();
    expect(parseDate('31/04/2025', true)).toBeUndefined();
    expect(parseDate('29/02/2025', true)).toBeUndefined();
    expect(parseDate('2025-02-31', true)).toBeUndefined();
    expect(parseDate('20250231', true)).toBeUndefined();
    expect(parseDate('02/31/2025', false)).toBeUndefined();
    expect(parseDate('29/02/1900', true)).toBeUndefined();
  });

  it('parseDate keeps real dates, including leap days', () => {
    expect(parseDate('29/02/2024', true)).toBe('2024-02-29');
    expect(parseDate('29/02/2000', true)).toBe('2000-02-29');
    expect(parseDate('31/01/2025', true)).toBe('2025-01-31');
    expect(parseDate('3/14/25', false)).toBe('2025-03-14');
    expect(parseDate('2025-03-14, 10:30:00', false)).toBe('2025-03-14');
    expect(parseDate('14.03.2025', true)).toBe('2025-03-14');
  });

  it('a table row with 31/02 becomes a date issue instead of a trade', () => {
    const r = parseImport('Date,Action,Symbol,Quantity,Price\n15/01/2025,Buy,AAPL,1,100\n31/02/2025,Buy,AAPL,1,100');
    expect(r.rows).toHaveLength(1);
    expect(r.issues).toEqual([{ line: 3, reason: 'date' }]);
  });

  it('a row with no date at all is still imported (undated)', () => {
    const r = parseImport('Date,Action,Symbol,Quantity,Price\n,Buy,AAPL,1,100');
    expect(r.issues).toEqual([]);
    expect(r.rows[0].date).toBeUndefined();
  });

  it('an IBKR trade dated 2025-02-31 becomes a date issue', () => {
    const r = parseImport('Trades,Header,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price\nTrades,Data,Stocks,USD,AAPL,"2025-02-31, 10:30:00",10,190.5\n');
    expect(r.rows).toEqual([]);
    expect(r.issues).toEqual([{ line: 2, reason: 'date' }]);
  });
});

describe('agorot are divided by 100 once', () => {
  const agorotFile = 'תאריך,סוג פעולה,מספר נייר,כמות,שער באגורות\n02/03/2025,קנייה,604611,20,4512';

  it('a price column named in agorot is converted once by the engine', () => {
    const r = parseImport(agorotFile);
    expect(r.rows[0]).toMatchObject({ symbol: 'LUMI.TA', shares: 20, price: 45.12 });
    expect(r.agorotConverted).toBe(true);
  });

  it('choosing "agorot" on the screen does not divide an already converted file again', () => {
    const r = parseImport(agorotFile);
    expect(toShekelRows(r, 'ila')[0].price).toBe(45.12);
    expect(toShekelRows(r, 'ils')[0].price).toBe(45.12);
  });

  it('a file whose header does not say agorot is converted once when the person picks agorot', () => {
    const r = parseImport('Date,Action,Symbol,Quantity,Price,Fee\n2025-03-02,Buy,604611,20,4512,500\n2025-03-02,Buy,AAPL,1,190,1');
    expect(r.agorotConverted).toBe(false);
    const ila = toShekelRows(r, 'ila');
    expect(ila[0]).toMatchObject({ symbol: 'LUMI.TA', price: 45.12, fee: 5 });
    expect(ila[1]).toMatchObject({ symbol: 'AAPL', price: 190, fee: 1 });
    expect(toShekelRows(r, 'ils')[0].price).toBe(4512);
  });

  it('a price worked out from a shekel amount is not divided by 100', () => {
    const r = parseImport('תאריך,סוג פעולה,מספר נייר,כמות,שער באגורות,סכום בש"ח\n02/03/2025,קנייה,604611,20,,902.4');
    expect(r.rows[0].price).toBeCloseTo(45.12, 10);
  });
});
