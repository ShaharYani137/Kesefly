import { describe, expect, it } from 'vitest';

import { cleanNum, formatNum, parseNum } from '@/ui/num-input';

describe('cleanNum', () => {
  it('reads a comma as the decimal point', () => {
    expect(cleanNum('0,5')).toBe('0.5');
    expect(cleanNum('abc1,5')).toBe('1.5');
  });
  it('keeps text in progress as typed', () => {
    expect(cleanNum('12.')).toBe('12.');
    expect(cleanNum('12,')).toBe('12.');
    expect(cleanNum('0')).toBe('0');
    expect(cleanNum('0.0')).toBe('0.0');
    expect(cleanNum('')).toBe('');
  });
  it('keeps only the first decimal point', () => {
    expect(cleanNum('1.2.3')).toBe('1.23');
    expect(cleanNum('1,2.3,4')).toBe('1.234');
    expect(cleanNum('..5')).toBe('.5');
  });
  it('drops everything that is not a digit or a decimal mark', () => {
    expect(cleanNum(' ₪ 1 000 ')).toBe('1000');
    expect(cleanNum('-3')).toBe('3');
  });
});

describe('parseNum and formatNum', () => {
  it('parses comma decimals instead of dropping the comma', () => {
    expect(parseNum('0,5')).toBe(0.5);
    expect(parseNum('12.')).toBe(12);
    expect(parseNum('')).toBe(0);
    expect(parseNum('.')).toBe(0);
  });
  it('shows 0 as empty and other numbers as is', () => {
    expect(formatNum(0)).toBe('');
    expect(formatNum(0.5)).toBe('0.5');
    expect(formatNum(1200)).toBe('1200');
  });
});
