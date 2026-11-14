/**
 * Long-term savings accounts: Israeli pension fund (קרן פנסיה), study fund (קרן השתלמות),
 * provident fund (קופת גמל), and US 401(k) / IRA. The user types balances and fees from
 * the yearly statement or the Mislaka (הר הכסף / המסלקה הפנסיונית) report.
 * Pure: fee checks and fee-drag projections.
 */
import type { Currency } from './types';

export type SavingsKind = 'pension' | 'hishtalmut' | 'gemel' | 'k401' | 'ira';

export type SavingsAccount = {
  id: string;
  kind: SavingsKind;
  /** Fund manager, e.g. "Altshuler Shaham" / "מגדל". */
  provider: string;
  balance: number;
  /** Deposit per month (employee + employer), same currency as the balance. */
  monthly: number;
  /** Management fee on deposits, fraction (0.015 = 1.5%). Israeli pension only. */
  feeDeposit: number;
  /** Yearly fee on the balance (or fund expense ratio for 401k / IRA), fraction. */
  feeBalance: number;
  currency: Currency;
  /** YYYY-MM-DD the account was opened (study fund: tax-free after 6 years). */
  opened?: string;
};

export const ISRAELI: SavingsKind[] = ['pension', 'hishtalmut', 'gemel'];
export const US_KINDS: SavingsKind[] = ['k401', 'ira'];

/**
 * Legal maximum fees in Israel (Capital Market Authority): pension 6% of deposits and 0.5% of
 * the balance; study and provident funds 2% of the balance (provident funds 1.05%).
 */
export const MAX_FEES: Partial<Record<SavingsKind, { deposit: number; balance: number }>> = {
  pension: { deposit: 0.06, balance: 0.005 },
  hishtalmut: { deposit: 0, balance: 0.02 },
  gemel: { deposit: 0, balance: 0.0105 },
};

/**
 * Design decision (not an official figure): a "good" fee most savers can get by asking or by
 * moving fund, used only as a reference line. Israel: roughly the default pension funds chosen
 * by tender and what large employee groups pay. US: a broad index fund expense ratio.
 */
export const GOOD_FEES: Record<SavingsKind, { deposit: number; balance: number }> = {
  pension: { deposit: 0.01, balance: 0.0022 },
  hishtalmut: { deposit: 0, balance: 0.006 },
  gemel: { deposit: 0, balance: 0.006 },
  k401: { deposit: 0, balance: 0.001 },
  ira: { deposit: 0, balance: 0.001 },
};

/** Gross yearly return used for fee projections (design decision, middle of the Plan tab's range). */
export const PROJECTION_RETURN = 0.05;

export type FeeCheck = {
  /** 'good' at or under the reference, 'high' above it, 'max' at or above the legal cap. */
  level: 'good' | 'high' | 'max';
  good: { deposit: number; balance: number };
  /** Money lost to fees above the reference over `years` (account currency). */
  extraCost: number;
  /** Projected balance with current fees and with reference fees. */
  projected: number;
  projectedGood: number;
};

/** Monthly compounding with a balance fee and a deposit fee. */
export function project(balance: number, monthly: number, feeDeposit: number, feeBalance: number, years: number, ret = PROJECTION_RETURN): number {
  let b = balance;
  const m = Math.max(0, Math.round(years * 12));
  const r = Math.pow(1 + ret, 1 / 12) - 1;
  const f = Math.pow(1 + feeBalance, 1 / 12) - 1;
  for (let i = 0; i < m; i++) b = b * (1 + r - f) + monthly * (1 - feeDeposit);
  return b;
}

export function feeCheck(a: SavingsAccount, years: number): FeeCheck {
  const good = GOOD_FEES[a.kind];
  const max = MAX_FEES[a.kind];
  const projected = project(a.balance, a.monthly, a.feeDeposit, a.feeBalance, years);
  const projectedGood = project(a.balance, a.monthly, Math.min(a.feeDeposit, good.deposit), Math.min(a.feeBalance, good.balance), years);
  const atMax = !!max && (a.feeBalance >= max.balance - 1e-9 || (max.deposit > 0 && a.feeDeposit >= max.deposit - 1e-9));
  const high = a.feeBalance > good.balance + 1e-9 || a.feeDeposit > good.deposit + 1e-9;
  return { level: atMax ? 'max' : high ? 'high' : 'good', good, extraCost: Math.max(0, projectedGood - projected), projected, projectedGood };
}

/** Study fund: date it can be withdrawn tax-free (6 years from opening). */
export function liquidDate(a: SavingsAccount): string | undefined {
  if (a.kind !== 'hishtalmut' || !a.opened || Number.isNaN(Date.parse(a.opened))) return undefined;
  const [y, m, d] = a.opened.split('-');
  return `${Number(y) + 6}-${m}-${d}`;
}
