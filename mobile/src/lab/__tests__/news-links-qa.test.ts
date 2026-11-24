import { describe, expect, it } from 'vitest';

import { parseRss, safeHttpUrl } from '@/engine/news';

// QA review of P-004: bypass attempts against the news link check.
describe('safeHttpUrl bypass attempts', () => {
  it('rejects backslash and slash tricks', () => {
    expect(safeHttpUrl('https:\\\\evil.com')).toBeNull();
    expect(safeHttpUrl('https:/\\evil.com')).toBeNull();
    expect(safeHttpUrl('https://\\evil.com')).toBeNull();
    expect(safeHttpUrl('https:///x')).toBeNull();
    expect(safeHttpUrl('javascript://https://x')).toBeNull();
  });

  it('rejects hidden characters before or inside the scheme', () => {
    expect(safeHttpUrl('\u0000https://x.com')).toBeNull();
    expect(safeHttpUrl('​https://x.com')).toBeNull();
    expect(safeHttpUrl('ｈttps://x.com')).toBeNull();
    expect(safeHttpUrl('https://x.com\njavascript:1')).toBeNull();
  });

  it('handles non-string input', () => {
    expect(safeHttpUrl(undefined as unknown as string)).toBeNull();
    expect(safeHttpUrl(null as unknown as string)).toBeNull();
  });
});

describe('parseRss checks links after decoding entities', () => {
  it('blanks entity-encoded javascript: links and keeps encoded https links', () => {
    const xml =
      '<rss><channel>' +
      '<item><title>A</title><link>&#x6a;avascript:alert(1)</link></item>' +
      '<item><title>C</title><link>&#106;avascript&#58;x</link></item>' +
      '<item><title>E</title><link>java&#x09;script:x</link></item>' +
      '<item><title>D</title><link>https&#58;//ok.com/d</link></item>' +
      '<item><title>B</title><link><![CDATA[ https://ok.com/b ]]></link></item>' +
      '</channel></rss>';
    expect(parseRss(xml, 'T', 'en').map((i) => i.link)).toEqual(['', '', '', 'https://ok.com/d', 'https://ok.com/b']);
  });
});
