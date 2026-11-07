/**
 * Rule-based next-step ideas. Recommend only: the app never trades.
 * Order follows the standard personal-finance priority list:
 * positive cash flow, then high-interest debt, then emergency fund,
 * then tax-advantaged accounts, then low-fee diversified investing.
 */
import { forecast, RISK_ASSUMPTIONS } from './projection';
import type { Profile } from './types';

export type IdeaKind = 'warning' | 'action' | 'tip';

/** `key` maps to a string in i18n (`ideas.<key>.title` / `.body`); `vars` fill its placeholders. */
export type Idea = {
  key: string;
  kind: IdeaKind;
  vars?: Record<string, number | string>;
};

export const EMERGENCY_MONTHS = 6;

export function recommendations(p: Profile): Idea[] {
  const ideas: Idea[] = [];
  const free = p.monthlyIncome - p.monthlyExpenses;

  if (free <= 0) {
    ideas.push({
      key: 'negativeCashFlow',
      kind: 'warning',
      vars: { gap: -free },
    });
  } else if (p.monthlyInvest > free) {
    ideas.push({
      key: 'investOverBudget',
      kind: 'warning',
      vars: { invest: p.monthlyInvest, free },
    });
  }

  if (p.highInterestDebt > 0) {
    ideas.push({
      key: 'payDebt',
      kind: 'action',
      vars: { debt: p.highInterestDebt },
    });
  }

  const emergencyTarget = p.monthlyExpenses * EMERGENCY_MONTHS;
  if (p.cashSavings < emergencyTarget) {
    ideas.push({
      key: 'emergencyFund',
      kind: 'action',
      vars: {
        target: emergencyTarget,
        missing: emergencyTarget - p.cashSavings,
        months: EMERGENCY_MONTHS,
      },
    });
  } else if (p.cashSavings > emergencyTarget * 2 && emergencyTarget > 0) {
    ideas.push({
      key: 'idleCash',
      kind: 'tip',
      vars: { extra: p.cashSavings - emergencyTarget },
    });
  }

  ideas.push({ key: p.country === 'IL' ? 'taxIL' : 'taxUS', kind: 'action' });

  if (p.goalAmount > 0) {
    const f = forecast(p);
    if (f.goalChance < 0.5) {
      ideas.push({
        key: 'goalGap',
        kind: 'action',
        vars: {
          needed: f.monthlyNeeded,
          chance: Math.round(f.goalChance * 100),
        },
      });
    } else {
      ideas.push({
        key: 'goalOnTrack',
        kind: 'tip',
        vars: { chance: Math.round(f.goalChance * 100) },
      });
    }
  }

  const { stocks } = RISK_ASSUMPTIONS[p.risk];
  if (p.goalYears < 3 && p.risk !== 'conservative') {
    ideas.push({
      key: 'shortHorizon',
      kind: 'warning',
      vars: { years: p.goalYears },
    });
  }
  ideas.push({
    key: p.country === 'IL' ? 'allocationIL' : 'allocationUS',
    kind: 'tip',
    vars: {
      stocks: Math.round(stocks * 100),
      bonds: Math.round((1 - stocks) * 100),
    },
  });
  ideas.push({ key: 'lowFees', kind: 'tip' });

  return ideas;
}
