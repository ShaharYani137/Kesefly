/**
 * Goal forecast engine.
 *
 * Forecasts are ranges, never single numbers. Each risk profile has an assumed
 * long-run nominal annual return (mean) and volatility. Over a horizon of T years
 * the spread of the average annual return shrinks roughly with 1/sqrt(T), so:
 *
 *   rate(z) = mean + z * vol / sqrt(T)
 *
 * We report z = -1.2816 (10th percentile, "bad case"), z = 0 (median) and
 * z = +1.2816 (90th percentile, "good case"). These are simplified planning
 * assumptions, not predictions; the UI must say so.
 */
import type { Profile, Risk } from './types';

export const RISK_ASSUMPTIONS: Record<Risk, { mean: number; vol: number; stocks: number }> = {
  conservative: { mean: 0.04, vol: 0.06, stocks: 0.3 },
  balanced: { mean: 0.06, vol: 0.11, stocks: 0.6 },
  growth: { mean: 0.08, vol: 0.16, stocks: 0.9 },
};

const Z90 = 1.2816;

/** Future value of a starting balance plus monthly deposits at an annual rate, compounded monthly. */
export function futureValue(start: number, monthly: number, annualRate: number, years: number): number {
  const n = Math.round(years * 12);
  if (n <= 0) return start;
  const r = Math.pow(1 + annualRate, 1 / 12) - 1;
  if (Math.abs(r) < 1e-9) return start + monthly * n;
  const g = Math.pow(1 + r, n);
  return start * g + monthly * ((g - 1) / r);
}

/** Monthly deposit needed to reach `target` from `start` in `years` at `annualRate`. */
export function requiredMonthly(start: number, target: number, annualRate: number, years: number): number {
  const n = Math.round(years * 12);
  if (n <= 0) return Math.max(0, target - start);
  const r = Math.pow(1 + annualRate, 1 / 12) - 1;
  const g = Math.pow(1 + r, n);
  const need = target - start * g;
  if (need <= 0) return 0;
  return Math.abs(r) < 1e-9 ? need / n : (need * r) / (g - 1);
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 approximation, error < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export type ForecastPoint = {
  year: number;
  low: number;
  mid: number;
  high: number;
};

export type Forecast = {
  points: ForecastPoint[];
  final: ForecastPoint;
  /** Chance (0–1) of reaching the goal under the model assumptions. */
  goalChance: number;
  /** Monthly deposit that reaches the goal in the median case. */
  monthlyNeeded: number;
  totalDeposited: number;
};

export function forecast(p: Profile): Forecast {
  const { mean, vol } = RISK_ASSUMPTIONS[p.risk];
  const years = Math.max(1, Math.round(p.goalYears));
  const start = Math.max(0, p.investments);
  const monthly = Math.max(0, p.monthlyInvest);

  const at = (y: number): ForecastPoint => {
    const spread = (Z90 * vol) / Math.sqrt(y);
    return {
      year: y,
      low: futureValue(start, monthly, mean - spread, y),
      mid: futureValue(start, monthly, mean, y),
      high: futureValue(start, monthly, mean + spread, y),
    };
  };

  const step = years <= 6 ? 1 : Math.ceil(years / 6);
  const points: ForecastPoint[] = [];
  for (let y = step; y < years; y += step) points.push(at(y));
  points.push(at(years));

  return {
    points,
    final: points[points.length - 1],
    goalChance: goalChance(start, monthly, p.goalAmount, mean, vol, years),
    monthlyNeeded: requiredMonthly(start, p.goalAmount, mean, years),
    totalDeposited: start + monthly * years * 12,
  };
}

/** Solve for the z-score whose return hits the goal exactly, then convert to a probability. */
function goalChance(start: number, monthly: number, goal: number, mean: number, vol: number, years: number): number {
  if (goal <= 0) return 1;
  const sd = vol / Math.sqrt(years);
  const fv = (z: number) => futureValue(start, monthly, mean + z * sd, years);
  let lo = -6;
  let hi = 6;
  if (fv(hi) < goal) return 0;
  if (fv(lo) >= goal) return 1;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (fv(m) >= goal) hi = m;
    else lo = m;
  }
  return 1 - normalCdf(hi);
}
