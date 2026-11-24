import { describe, expect, it } from 'vitest';

import { parseRss, safeHttpUrl } from '@/engine/news';

describe('safeHttpUrl keeps only http(s) news links', () => {
  it('accepts absolute https and http links (trimmed)', () => {
    expect(safeHttpUrl('https://www.cnbc.com/2026/11/24/story.html')).toBe('https://www.cnbc.com/2026/11/24/story.html');
    expect(safeHttpUrl('http://example.com/a?b=1#c')).toBe('http://example.com/a?b=1#c');
    expect(safeHttpUrl('  HTTPS://example.com/x  ')).toBe('HTTPS://example.com/x');
  });

  it('rejects other schemes, relative and empty links', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('  JavaScript:alert(document.cookie)')).toBeNull();
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHttpUrl('intent://scan/#Intent;scheme=zxing;end')).toBeNull();
    expect(safeHttpUrl('ftp://x')).toBeNull();
    expect(safeHttpUrl('')).toBeNull();
    expect(safeHttpUrl('/path')).toBeNull();
  });

  it('rejects malformed http-looking links', () => {
    expect(safeHttpUrl('https://')).toBeNull();
    expect(safeHttpUrl('https:/example.com')).toBeNull();
    expect(safeHttpUrl('java\tscript:alert(1)')).toBeNull();
    expect(safeHttpUrl('https://exa mple.com')).toBeNull();
    expect(safeHttpUrl('https://example.com/\u0000')).toBeNull();
  });
});

describe('parseRss drops unsafe links', () => {
  it('blanks a javascript: link but keeps the story and a safe link', () => {
    const xml =
      '<rss><channel>' +
      '<item><title>Bad</title><link>javascript:alert(1)</link></item>' +
      '<item><title>Good</title><link>https://example.com/good</link></item>' +
      '</channel></rss>';
    const items = parseRss(xml, 'Test', 'en');
    expect(items.map((i) => [i.title, i.link])).toEqual([
      ['Bad', ''],
      ['Good', 'https://example.com/good'],
    ]);
  });
});
