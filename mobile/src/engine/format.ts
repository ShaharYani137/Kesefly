import type { Currency, Lang } from './types';

const LOCALE: Record<Lang, string> = { en: 'en-US', he: 'he-IL' };

/** Short-number suffixes. Built by hand: Hermes on Android lacks Intl compact notation and
 * would print 3,200,000.0 instead of 3.2M. */
const COMPACT: Record<Lang, { k: string; m: string }> = {
  en: { k: 'K', m: 'M' },
  he: { k: ' אלף', m: ' מיליון' },
};

export function formatMoney(value: number, currency: Currency, lang: Lang, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    const big = Math.abs(value) >= 1e6;
    const n = new Intl.NumberFormat(LOCALE[lang], {
      maximumFractionDigits: 1,
    }).format(value / (big ? 1e6 : 1e3));
    const suffix = big ? COMPACT[lang].m : COMPACT[lang].k;
    const sign = currency === 'USD' ? '$' : '₪';
    // English: $3.2M. Hebrew: 3.2 מיליון ₪ (currency after the number, as he-IL formats it).
    return lang === 'he' ? `${n}${suffix} ${sign}` : `${sign}${n}${suffix}`;
  }
  try {
    return new Intl.NumberFormat(LOCALE[lang], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Older Intl builds may lack compact notation.
    const sign = currency === 'USD' ? '$' : '₪';
    return `${sign}${Math.round(value).toLocaleString(LOCALE[lang])}`;
  }
}

export function formatPercent(fraction: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(fraction);
}

/** Parse a user-typed number; accepts commas and stray spaces. Returns 0 for empty or invalid input. */
export function parseAmount(text: string): number {
  const n = Number(text.replace(/[,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
