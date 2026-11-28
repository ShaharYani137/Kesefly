/** Chat display-name and group-title rules (chat/names.ts, P-099). */
import { describe, expect, it } from 'vitest';

import { atUsername, chatNameProblem, isAllowedChatName } from '@/chat/names';

describe('chatNameProblem', () => {
  it('allows ordinary names in English and Hebrew, emoji and empty text', () => {
    for (const n of ['Dana', 'דנה כהן', 'Saving for a home', 'חוסכים לדירה', 'Avi 🚀', 'Kesef club', 'Fly high', '']) {
      expect(chatNameProblem(n)).toBeNull();
      expect(isAllowedChatName(n)).toBe(true);
    }
  });

  it('rejects bidi overrides, isolates and marks', () => {
    for (const c of ['\u202E', '\u202D', '\u202A', '\u2066', '\u2067', '\u2068', '\u2069', '\u200E', '\u200F', '\u061C']) {
      expect(chatNameProblem(`Dana${c}`)).toBe('hidden');
    }
  });

  it('rejects zero-width and other invisible format characters', () => {
    for (const c of ['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF', '\u00AD', '\u{E0041}']) {
      expect(chatNameProblem(`Da${c}na`)).toBe('hidden');
    }
  });

  it('rejects control characters such as new lines and tabs', () => {
    for (const c of ['\n', '\r', '\t', '\u0000', '\u007F', '\u0085']) {
      expect(chatNameProblem(`Dana${c}`)).toBe('hidden');
    }
  });

  it('matches every Unicode Cc and Cf code point the JS engine knows', () => {
    const cf = /[\p{Cc}\p{Cf}]/u;
    for (let c = 0; c <= 0x10ffff; c++) {
      if (c >= 0xd800 && c <= 0xdfff) continue;
      const ch = String.fromCodePoint(c);
      if (cf.test(ch)) expect(chatNameProblem(ch), `U+${c.toString(16)}`).toBe('hidden');
    }
  });

  it('rejects check marks and verified-looking glyphs', () => {
    for (const c of ['✓', '✔', '✔\uFE0F', '☑', '✅', '🗸', '🗹', '√']) {
      expect(chatNameProblem(`Dana ${c}`)).toBe('checkMark');
    }
  });

  it('rejects the app name in any case, spacing or script', () => {
    for (const n of ['Kesefly', 'kesefly support', 'KESEFLY', 'Team KeSeFlY', 'K e s e f l y', 'Kesef.ly', 'Kesef-ly', '𝐊𝐞𝐬𝐞𝐟𝐥𝐲', 'Ｋｅｓｅｆｌｙ', 'צוות כספלי', 'כספלי']) {
      expect(chatNameProblem(n)).toBe('brand');
    }
  });

  it('rejects "@" so a display name cannot pass as an @username', () => {
    for (const n of ['@shasha', 'Dana @dana', 'me@home', '\uFF20shasha', '\uFE6Bshasha']) {
      expect(chatNameProblem(n)).toBe('at');
    }
  });

  it('reports hidden characters first when several rules apply', () => {
    expect(chatNameProblem('Kesefly ✔\u202E')).toBe('hidden');
    expect(chatNameProblem('Kesefly ✔')).toBe('checkMark');
  });
});

describe('atUsername', () => {
  it('wraps @username in left-to-right isolate marks', () => {
    expect(atUsername('dana_1')).toBe('\u2066@dana_1\u2069');
  });
});
