/**
 * Bidirectional text for Hebrew on phones whose system language is English.
 *
 * The app keeps native layout left-to-right (supportsRTL: false) and lays out Hebrew itself.
 * Android picks each paragraph's direction from its first strong character and, when there is
 * none (digits, "•", "+", "✓", Latin tickers), falls back to the SYSTEM language. On an
 * English phone that makes Hebrew lines such as "• S&P 500: ..." or "3 דק׳" render
 * left-to-right, with punctuation on the wrong side. A Right-to-Left Mark at the start of
 * every paragraph fixes the direction no matter what the system language is.
 *
 * Text drawn by the OS (alert dialogs, notifications, the fingerprint prompt) gets the same
 * treatment, because those follow the system direction too.
 */
import { Alert, type AlertButton } from 'react-native';

export const RLM = '‏';
export const LRM = '‎';

/** Marks every paragraph right-to-left when `rtl`; returns the text unchanged otherwise. */
export function bidi(text: string, rtl: boolean): string {
  if (!rtl || !text) return text;
  return RLM + text.replace(/\n/g, `\n${RLM}`);
}

/** Marks every paragraph left-to-right (prices, tickers, English headlines inside Hebrew UI). */
export function ltr(text: string): string {
  return LRM + text.replace(/\n/g, `\n${LRM}`);
}

/** Alert.alert with right-to-left title, message and buttons in Hebrew. */
export function alertDir(rtl: boolean, title: string, message?: string, buttons?: AlertButton[]) {
  Alert.alert(
    bidi(title, rtl),
    message ? bidi(message, rtl) : undefined,
    buttons?.map((b) => ({ ...b, text: b.text ? bidi(b.text, rtl) : b.text })),
  );
}
