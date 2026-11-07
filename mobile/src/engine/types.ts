export type Country = 'US' | 'IL';
export type Currency = 'USD' | 'ILS';
export type Risk = 'conservative' | 'balanced' | 'growth';
export type Lang = 'en' | 'he';

/** Everything the user tells the app. All money values are monthly or totals in `currency`. */
export type Profile = {
  country: Country;
  currency: Currency;
  monthlyIncome: number;
  monthlyExpenses: number;
  /** Cash in bank / savings accounts. */
  cashSavings: number;
  /** Money already invested (funds, stocks, pension excluded). */
  investments: number;
  /** Credit card, overdraft, or loans above ~8% interest. */
  highInterestDebt: number;
  /** How much the user plans to invest each month. */
  monthlyInvest: number;
  goalName: string;
  goalAmount: number;
  goalYears: number;
  risk: Risk;
};

export const EMPTY_PROFILE: Profile = {
  country: 'US',
  currency: 'USD',
  monthlyIncome: 0,
  monthlyExpenses: 0,
  cashSavings: 0,
  investments: 0,
  highInterestDebt: 0,
  monthlyInvest: 0,
  goalName: '',
  goalAmount: 0,
  goalYears: 10,
  risk: 'balanced',
};
