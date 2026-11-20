/**
 * The Lab's practice limits. Starting values are the day-trader-skill pack's defaults
 * (trader-budget / trader-risk config): budget 5,000, 10% cash buffer, position cap 75%,
 * max order 4,000, min order 5, max loss 50 a trade, 150 a day, 3 trades a day, reward to
 * risk at least 1.0.
 *
 * KESEFLY DESIGN DECISION: shekel limits are the dollar ones times 3.6 (about the USD/ILS
 * rate when written), rounded to round numbers: budget 18,000, max order 14,400, min order 20,
 * max loss 180 a trade, 540 a day. New York trades use the dollar limits, Tel Aviv trades the
 * shekel ones; trade counts are shared.
 */
export type MoneyLimits = {
  budget: number;
  cashBufferPct: number;
  maxPositionPct: number;
  maxOrder: number;
  minOrder: number;
  maxLossPerTrade: number;
  maxDailyLoss: number;
};

export type LabLimits = {
  USD: MoneyLimits;
  ILS: MoneyLimits;
  maxTradesPerDay: number;
  minRewardRisk: number;
  requireStop: true;
};

export const DEFAULT_LIMITS: LabLimits = {
  USD: { budget: 5000, cashBufferPct: 10, maxPositionPct: 75, maxOrder: 4000, minOrder: 5, maxLossPerTrade: 50, maxDailyLoss: 150 },
  ILS: { budget: 18000, cashBufferPct: 10, maxPositionPct: 75, maxOrder: 14400, minOrder: 20, maxLossPerTrade: 180, maxDailyLoss: 540 },
  maxTradesPerDay: 3,
  minRewardRisk: 1,
  requireStop: true,
};

/** Merge saved limits over the defaults (older saves may miss fields). */
export function withDefaults(saved?: Partial<LabLimits> | null): LabLimits {
  return {
    USD: { ...DEFAULT_LIMITS.USD, ...saved?.USD },
    ILS: { ...DEFAULT_LIMITS.ILS, ...saved?.ILS },
    maxTradesPerDay: saved?.maxTradesPerDay ?? DEFAULT_LIMITS.maxTradesPerDay,
    minRewardRisk: saved?.minRewardRisk ?? DEFAULT_LIMITS.minRewardRisk,
    requireStop: true,
  };
}
