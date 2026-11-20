import { describe, expect, it } from 'vitest';

import tase from '@/data/tase-securities.json';
import { universe, UNIVERSES } from '@/lab/universes';

const known = new Set((tase as string[][]).map((row) => row[1]));

describe('scanner lists', () => {
  it('every Tel Aviv symbol exists in the TASE securities list, no duplicates', () => {
    for (const id of UNIVERSES) {
      const list = universe(id, []);
      expect(new Set(list).size, id).toBe(list.length);
      for (const sym of list.filter((s) => s.endsWith('.TA'))) expect(known.has(sym), `${id}: ${sym}`).toBe(true);
    }
  });
  it('TA-125 contains TA-35', () => {
    const ta125 = new Set(universe('ta125', []));
    expect(universe('ta35', []).every((s) => ta125.has(s))).toBe(true);
  });
});
