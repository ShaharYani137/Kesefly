/**
 * Chat name rules (P-099): what users may type as their chat display name or a group title, and
 * how an @username is shown. Pure functions, no React Native, so they are unit tested.
 *
 * A display name is free text, so someone could call themselves "Kesefly Support ✔" and look
 * official. The client therefore rejects names that:
 * - contain control or format characters (Unicode Cc and Cf): bidi overrides and isolates,
 *   zero-width spaces and joiners, the BOM, soft hyphen and similar invisible marks;
 * - contain check-mark or seal glyphs that copy the verified badge;
 * - contain the app's name, "Kesefly" (any case) or its Hebrew spelling "כספלי";
 * - contain "@" (also full-width or small forms), so a name cannot look like an @username.
 * This is input validation only. The server-side check is a separate proposal (P-100).
 * Rooms also always show the @username next to a display name, so a name alone cannot pass as
 * someone else.
 */

/**
 * Unicode Cc (control) and Cf (format) code points, written out as ranges (checked against Unicode 17.0),
 * so the check does not depend on regex property escapes in the JS engine.
 * The unit test checks this list against `\p{Cc}` and `\p{Cf}` in Node.
 */
const CONTROL_OR_FORMAT =
  /[\u0000-\u001F\u007F-\u009F\u00AD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB\u{110BD}\u{110CD}\u{13430}-\u{1343F}\u{1BCA0}-\u{1BCA3}\u{1D173}-\u{1D17A}\u{E0001}\u{E0020}-\u{E007F}]/u;

/**
 * Check marks, ballot boxes with a check, and seal-like marks that could pass for the verified
 * badge: ✓ ✔ ☑ ✅ 🗸 🗹 √ ⍻ 𐄂 🮱 (✔\uFE0F is ✔ plus a variation selector, so it is caught too).
 */
const CHECK_MARKS = /[✓✔☑✅√⍻\u{1F5F8}\u{1F5F9}\u{10102}\u{1FBB1}]/u;

/** The app's name in English and Hebrew, matched after removing spaces and punctuation. */
const BRAND = ['kesefly', 'כספלי'];

export type NameProblem = 'hidden' | 'checkMark' | 'at' | 'brand';

/** NFKC turns full-width and "math bold" letters into plain ones (𝐊𝐞𝐬𝐞𝐟𝐥𝐲 → Kesefly, \uFF20 → @). */
function nfkc(name: string): string {
  try {
    return name.normalize('NFKC');
  } catch {
    // Engines without normalize: compare the raw text.
    return name;
  }
}

/** Lower case without spaces, punctuation and symbols, so "K e s e f l y" and "Kesef.ly" still match. */
function fold(normalized: string): string {
  return normalized.toLowerCase().replace(/[\s.,_\-·•*'"`~|/\\()[\]{}:;!?+=#%&^$@<>]/g, '');
}

/**
 * Why a chat display name or group title is not allowed, or null if it is fine.
 * An empty name is fine here (the caller decides whether a name is required).
 */
export function chatNameProblem(name: string): NameProblem | null {
  if (CONTROL_OR_FORMAT.test(name)) return 'hidden';
  if (CHECK_MARKS.test(name)) return 'checkMark';
  const normalized = nfkc(name);
  // Full-width \uFF20 and small \uFE6B "@" also become "@" under NFKC; listed here too in case normalize is missing.
  if (/[@\uFF20\uFE6B]/.test(normalized)) return 'at';
  const folded = fold(normalized);
  if (BRAND.some((b) => folded.includes(b))) return 'brand';
  return null;
}

export const isAllowedChatName = (name: string) => chatNameProblem(name) === null;

/**
 * "@username" wrapped in Unicode left-to-right isolate marks (U+2066 … U+2069), so the "@" stays
 * on the left of the Latin name inside Hebrew (RTL) text.
 */
export const atUsername = (username: string) => `\u2066@${username}\u2069`;
