/** Symbol search (engine/search.ts): offline matches first, Yahoo with a timeout (P-091). */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localSymbols, SEARCH_TIMEOUT_MS, searchesOnline, searchSymbols } from '@/engine/search';

type Init = RequestInit & { signal?: AbortSignal };
const signals: AbortSignal[] = [];

/** A network that never answers. `honour`: rejects when its signal aborts, like a real fetch. */
function stall(honour: boolean) {
  const fn = vi.fn(
    (_url: string, init: Init) =>
      new Promise<Response>((_, reject) => {
        if (init.signal) signals.push(init.signal);
        if (honour) init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  signals.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('symbol search', () => {
  it('finds Tel Aviv securities offline, by name, symbol and number', () => {
    const fn = stall(true);
    expect(localSymbols('טבע')[0]).toMatchObject({ symbol: 'TEVA.TA', taseId: '629014' });
    expect(localSymbols('teva')[0].symbol).toBe('TEVA.TA');
    expect(localSymbols(' 629014 ')[0].symbol).toBe('TEVA.TA');
    expect(fn).not.toHaveBeenCalled();
  });

  it('asks Yahoo only for Latin text', () => {
    expect(searchesOnline('teva')).toBe(true);
    expect(searchesOnline('טבע')).toBe(false);
    expect(searchesOnline('629014')).toBe(false);
    expect(searchesOnline('  ')).toBe(false);
  });

  it('never calls the network for Hebrew text or numbers', async () => {
    const fn = stall(true);
    expect((await searchSymbols('טבע'))[0].symbol).toBe('TEVA.TA');
    expect((await searchSymbols('629014'))[0].symbol).toBe('TEVA.TA');
    expect(fn).not.toHaveBeenCalled();
  });

  it('gives up on a stalled Yahoo after the timeout and returns the offline matches', async () => {
    expect(SEARCH_TIMEOUT_MS).toBe(5_000);
    vi.useFakeTimers();
    stall(true);
    let done: unknown = null;
    void searchSymbols('teva').then((r) => (done = r));
    await vi.advanceTimersByTimeAsync(SEARCH_TIMEOUT_MS - 1);
    expect(done).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toEqual(localSymbols('teva'));
    expect(signals[0].aborted).toBe(true);
  });

  it('still settles when fetch ignores the abort signal', async () => {
    stall(false);
    const r = await searchSymbols('teva', undefined, 20);
    expect(r).toEqual(localSymbols('teva'));
    expect(signals[0].aborted).toBe(true);
  });

  it('stops at once when the caller aborts, before the timeout', async () => {
    stall(true);
    const ctrl = new AbortController();
    const p = searchSymbols('teva', ctrl.signal, 60_000);
    ctrl.abort();
    expect(await p).toEqual(localSymbols('teva'));
    expect(signals[0].aborted).toBe(true);
    // Already aborted: no request at all.
    const fn = stall(true);
    expect(await searchSymbols('teva', ctrl.signal)).toEqual(localSymbols('teva'));
    expect(fn).not.toHaveBeenCalled();
  });

  it('mixes Yahoo and Tel Aviv matches when Yahoo answers in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ quotes: [{ symbol: 'teva', longname: 'Teva Pharmaceutical', exchDisp: 'NYSE', quoteType: 'EQUITY' }, { symbol: 'X', quoteType: 'OPTION' }] }), { status: 200 })),
    );
    const r = await searchSymbols('teva');
    expect(r[0]).toEqual({ symbol: 'TEVA', name: 'Teva Pharmaceutical', exchange: 'NYSE' });
    expect(r[1].symbol).toBe('TEVA.TA');
    expect(r.some((m) => m.symbol === 'X')).toBe(false);
  });

  it('returns the offline matches when Yahoo is offline or errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Network request failed');
      }),
    );
    expect(await searchSymbols('teva')).toEqual(localSymbols('teva'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    expect(await searchSymbols('teva')).toEqual(localSymbols('teva'));
  });
});
