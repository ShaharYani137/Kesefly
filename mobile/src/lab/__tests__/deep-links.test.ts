/** Outside links lose their params (state/deep-links.ts); chat ids must be uuids (chat/ids.ts). */
import { describe, expect, it } from 'vitest';

import { isChatId } from '@/chat/ids';
import { stripExternalParams } from '@/state/deep-links';

describe('stripExternalParams', () => {
  it('drops the question from a helper link', () => {
    expect(stripExternalParams('kesefly://helper?q=my%20name%20is%20Bob')).toBe('kesefly://helper');
    expect(stripExternalParams('/helper?q=hi')).toBe('/helper');
  });
  it('drops the title from a chat link and keeps the id', () => {
    const id = '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
    expect(stripExternalParams(`kesefly://chats/${id}?title=Support%20team`)).toBe(`kesefly://chats/${id}`);
    expect(stripExternalParams(`/chats/${id}?a=1&title=x#frag`)).toBe(`/chats/${id}`);
  });
  it('drops fragments and keeps links without params unchanged', () => {
    expect(stripExternalParams('kesefly://#q=x')).toBe('kesefly://');
    expect(stripExternalParams('kesefly://settings')).toBe('kesefly://settings');
    expect(stripExternalParams('/stock/AAPL')).toBe('/stock/AAPL');
  });
  it('never returns an empty path', () => {
    expect(stripExternalParams('')).toBe('/');
    expect(stripExternalParams('?q=x')).toBe('/');
  });
});

describe('isChatId', () => {
  it('accepts uuids in either case', () => {
    expect(isChatId('3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d')).toBe(true);
    expect(isChatId('3F2B1C4D-5E6F-4A7B-8C9D-0E1F2A3B4C5D')).toBe(true);
  });
  it('rejects anything else', () => {
    for (const bad of ['', 'abc', '123', '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d&select=*', '3f2b1c4d5e6f4a7b8c9d0e1f2a3b4c5d', ' 3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d\n', undefined, null, 42, ['3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d']]) {
      expect(isChatId(bad)).toBe(false);
    }
  });
});
