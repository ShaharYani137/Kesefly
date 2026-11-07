import type { Currency, Lang } from './types';

const LOCALE: Record<Lang, string> = { en: 'en-US', he: 'he-IL' };

export function formatMoney(value: number, currency: Currency, lang: Lang, compact = false): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang], {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    // Older Intl builds may lack compact notation.
    const sign = currency === 'USD' ? '$' : '₪';
    return `${sign}${Math.round(value).toLocaleString()}`;
  }
}

export function formatPercent(fraction: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang], { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}

/** Parse a user-typed number; accepts commas and stray spaces. Returns 0 for empty or invalid input. */
export function parseAmount(text: string): number {
  const n = Number(text.replace(/[,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
