/** Pure helpers for number text fields (no React Native, so vitest can test them). */

/**
 * Keeps digits and one decimal point. A comma counts as the decimal point (Hebrew and many other
 * keyboards type "," on the decimal pad), so "0,5" becomes "0.5". Commas are never thousands separators.
 * Text in progress stays as typed: "12." and "0" are kept.
 */
export const cleanNum = (t: string) => {
  const s = t.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  return dot < 0 ? s : s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
};

/** Number from field text, read the same way as cleanNum. Empty or invalid text is 0. */
export const parseNum = (t: string) => {
  const n = Number(cleanNum(t));
  return Number.isFinite(n) ? n : 0;
};

/** How a stored number shows in a field that is not being edited: 0 shows empty (the placeholder). */
export const formatNum = (n: number) => (n ? String(n) : '');
