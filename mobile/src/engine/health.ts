/**
 * Money check-up: five yes/no checks in personal-finance priority order.
 * Same thresholds as `recommendations.ts`, so the check-up and the ideas never disagree.
 */
import { forecast } from './projection';
import { EMERGENCY_MONTHS } from './recommendations';
import type { Profile } from './types';

export type CheckKey = 'cashFlow' | 'noDebt' | 'emergency' | 'investing' | 'goal';

export function checkup(p: Profile): { key: CheckKey; ok: boolean }[] {
  const free = p.monthlyIncome - p.monthlyExpenses;
  const emergencyTarget = p.monthlyExpenses * EMERGENCY_MONTHS;
  return [
    { key: 'cashFlow', ok: free > 0 },
    { key: 'noDebt', ok: p.highInterestDebt <= 0 },
    { key: 'emergency', ok: p.cashSavings >= emergencyTarget },
    { key: 'investing', ok: p.monthlyInvest > 0 && p.monthlyInvest <= Math.max(0, free) },
    { key: 'goal', ok: p.goalAmount > 0 && forecast(p).goalChance >= 0.5 },
  ];
}
