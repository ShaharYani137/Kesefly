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

/** P-091 QA: no leaked timers or listeners, and the UI's `pending` flag matches real network use. */
describe('symbol search cleanup (P-091 QA)', () => {
  /** A caller signal that counts its live abort listeners. */
  function counted() {
    const ctrl = new AbortController();
    let live = 0;
    const add = ctrl.signal.addEventListener.bind(ctrl.signal);
    const remove = ctrl.signal.removeEventListener.bind(ctrl.signal);
    ctrl.signal.addEventListener = ((t: string, l: EventListenerOrEventListenerObject, o?: AddEventListenerOptions) => {
      live++;
      add(t, l, o);
    }) as typeof ctrl.signal.addEventListener;
    ctrl.signal.removeEventListener = ((t: string, l: EventListenerOrEventListenerObject, o?: EventListenerOptions) => {
      live--;
      remove(t, l, o);
    }) as typeof ctrl.signal.removeEventListener;
    return { ctrl, live: () => live };
  }

  /** Counts timers set and cleared through the globals the engine uses. */
  function timers() {
    const set = new Set<unknown>();
    const realSet = globalThis.setTimeout;
    const realClear = globalThis.clearTimeout;
    vi.stubGlobal('setTimeout', ((fn: () => void, ms?: number) => {
      const id = realSet(fn, ms);
      set.add(id);
      return id;
    }) as typeof setTimeout);
    vi.stubGlobal('clearTimeout', ((id?: ReturnType<typeof setTimeout>) => {
      set.delete(id);
      realClear(id);
    }) as typeof clearTimeout);
    return { pending: () => set.size };
  }

  const ok = () =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ quotes: [{ symbol: 'TEVA', quoteType: 'EQUITY' }] }), { status: 200 })));

  it('clears the timeout and removes the caller listener when Yahoo answers', async () => {
    const t = timers();
    ok();
    const { ctrl, live } = counted();
    await searchSymbols('teva', ctrl.signal, 60_000);
    expect(t.pending()).toBe(0);
    expect(live()).toBe(0);
  });

  it('removes the caller listener after a timeout and after a caller abort', async () => {
    stall(true);
    const a = counted();
    await searchSymbols('teva', a.ctrl.signal, 10);
    expect(a.live()).toBe(0);
    const b = counted();
    const p = searchSymbols('teva', b.ctrl.signal, 60_000);
    b.ctrl.abort();
    await p;
    expect(b.live()).toBe(0);
  });

  it('does not pile up listeners on a long-lived caller signal', async () => {
    ok();
    const { ctrl, live } = counted();
    for (let i = 0; i < 5; i++) await searchSymbols('teva', ctrl.signal, 60_000);
    expect(live()).toBe(0);
  });

  it('a fetch that fails after the timeout causes no unhandled rejection', async () => {
    const seen: unknown[] = [];
    const onUnhandled = (e: unknown) => seen.push(e);
    process.on('unhandledRejection', onUnhandled);
    try {
      vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((_, reject) => setTimeout(() => reject(new TypeError('late')), 30))));
      expect(await searchSymbols('teva', undefined, 5)).toEqual(localSymbols('teva'));
      await new Promise((r) => setTimeout(r, 60));
      expect(seen).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('searchesOnline matches whether searchSymbols really calls the network', async () => {
    for (const q of ['teva', 'AAPL', ' aapl ', 'a1', 'טבע', 'טבע teva', 'teva טבע', '629014', ' 629014 ', '', '   ']) {
      const fn = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fn);
      await searchSymbols(q);
      expect([q, fn.mock.calls.length > 0]).toEqual([q, searchesOnline(q)]);
    }
  });

  it('Hebrew mixed with Latin or digits stays offline', async () => {
    const fn = stall(true);
    await searchSymbols('טבע teva');
    await searchSymbols('טבע 1');
    expect(fn).not.toHaveBeenCalled();
  });
});
