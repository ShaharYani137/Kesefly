import { describe, expect, it } from 'vitest';

import { feeCheck, MAX_FEES, type SavingsAccount } from '../savings';

const acct = (over: Partial<SavingsAccount>): SavingsAccount => ({
  id: 't',
  kind: 'gemel',
  provider: '',
  balance: 100_000,
  monthly: 1_000,
  feeDeposit: 0,
  feeBalance: 0.005,
  currency: 'ILS',
  ...over,
});

describe('feeCheck: provident fund (gemel) deposit fee', () => {
  it('caps gemel deposit fees at 4%', () => {
    expect(MAX_FEES.gemel).toEqual({ deposit: 0.04, balance: 0.0105 });
  });

  it('rates 0% of deposits as good', () => {
    expect(feeCheck(acct({ feeDeposit: 0 }), 20).level).toBe('good');
  });

  it('rates 2% of deposits as high and counts the extra cost', () => {
    const c = feeCheck(acct({ feeDeposit: 0.02 }), 20);
    expect(c.level).toBe('high');
    expect(c.extraCost).toBeGreaterThan(0);
  });

  it('rates 4% and above as at the legal cap', () => {
    expect(feeCheck(acct({ feeDeposit: 0.04 }), 20).level).toBe('max');
    expect(feeCheck(acct({ feeDeposit: 0.05 }), 20).level).toBe('max');
  });

  it('still reads an old saved entry without a deposit fee', () => {
    const old = { ...acct({}), feeDeposit: undefined } as unknown as SavingsAccount;
    const c = feeCheck(old, 20);
    expect(c.level).toBe('good');
    expect(Number.isFinite(c.projected)).toBe(true);
  });
});

describe('feeCheck: other kinds unchanged', () => {
  it('pension: 6% of deposits is the cap, 1% is good', () => {
    expect(feeCheck(acct({ kind: 'pension', feeDeposit: 0.06, feeBalance: 0.002 }), 20).level).toBe('max');
    expect(feeCheck(acct({ kind: 'pension', feeDeposit: 0.01, feeBalance: 0.002 }), 20).level).toBe('good');
  });

  it('study fund: rated on the balance fee only', () => {
    expect(feeCheck(acct({ kind: 'hishtalmut', feeBalance: 0.005 }), 20).level).toBe('good');
    expect(feeCheck(acct({ kind: 'hishtalmut', feeBalance: 0.01 }), 20).level).toBe('high');
    expect(feeCheck(acct({ kind: 'hishtalmut', feeBalance: 0.02 }), 20).level).toBe('max');
  });
});
