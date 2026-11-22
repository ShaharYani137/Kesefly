import { describe, expect, it } from 'vitest';

import { runTurn, systemPrompt, visibleText } from '@/engine/claude';

/** A fake Anthropic streaming endpoint: answers each request with the next scripted SSE body. */
function fakeApi(replies: string[][]) {
  const bodies: Record<string, unknown>[] = [];
  const headers: Record<string, string>[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    headers.push(Object.fromEntries(new Headers(init.headers).entries()));
    const text = replies[bodies.length - 1].join('');
    return new Response(text, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as unknown as typeof fetch;
  return { fetchImpl, bodies, headers };
}

const sse = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const start = (model = 'claude-opus-5-5') =>
  sse('message_start', { message: { id: 'm1', type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } });
const textBlock = (i: number, parts: string[]) => [
  sse('content_block_start', { index: i, content_block: { type: 'text', text: '' } }),
  ...parts.map((t) => sse('content_block_delta', { index: i, delta: { type: 'text_delta', text: t } })),
  sse('content_block_stop', { index: i }),
];
const end = (reason: string) => [sse('message_delta', { delta: { stop_reason: reason, stop_sequence: null }, usage: { output_tokens: 5 } }), sse('message_stop', {})];

const base = { apiKey: 'sk-ant-test', model: 'claude-opus-5-5' as const, effort: 'medium' as const, webSearch: false, autoMemory: false, system: 'sys' };

describe('Claude chat engine', () => {
  it('streams text, sends the whole history with compaction, caching and fallbacks', async () => {
    const api = fakeApi([[start(), ...textBlock(0, ['Hel', 'lo']), ...end('end_turn')]]);
    const seen: string[] = [];
    const history = [
      { role: 'user' as const, content: 'My name is Dana.' },
      { role: 'assistant' as const, content: 'Hi Dana!' },
    ];
    const r = await runTurn(history, 'What is my name?', { ...base, fetch: api.fetchImpl }, { onText: (t) => seen.push(t) });
    expect(r.text).toBe('Hello');
    expect(r.stop).toBe('done');
    expect(seen[seen.length - 1]).toBe('Hello');
    const body = api.bodies[0];
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.messages).toHaveLength(3);
    expect(body.fallbacks).toBe('default');
    expect(body.cache_control).toEqual({ type: 'ephemeral' });
    expect(body.context_management).toEqual({ edits: [{ type: 'compact_20260112' }] });
    expect(body.output_config).toEqual({ effort: 'medium' });
    expect(api.headers[0]['anthropic-beta']).toContain('compact-2026-01-12');
    expect(api.headers[0]['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    // SDK 1.x sends the API key as a bearer credential.
    expect(api.headers[0].authorization).toBe('Bearer sk-ant-test');
    expect(r.messages).toHaveLength(4);
    expect(visibleText(r.messages[3])).toBe('Hello');
  });

  it('Haiku sends no fallbacks; web search uses the basic tool there', async () => {
    const api = fakeApi([[start('claude-haiku-5-5'), ...textBlock(0, ['ok']), ...end('end_turn')]]);
    await runTurn([], 'hi', { ...base, model: 'claude-haiku-5-5', webSearch: true, fetch: api.fetchImpl }, { onText: () => {} });
    expect(api.bodies[0].fallbacks).toBeUndefined();
    expect(api.headers[0]['anthropic-beta']).not.toContain('server-side-fallback');
    expect((api.bodies[0].tools as { type: string }[])[0].type).toBe('web_search_20250305');
  });

  it('save_memory tool: saves the note, returns a tool result, then finishes', async () => {
    const toolTurn = [
      start(),
      sse('content_block_start', { index: 0, content_block: { type: 'tool_use', id: 'tu1', name: 'save_memory', input: {} } }),
      sse('content_block_delta', { index: 0, delta: { type: 'input_json_delta', partial_json: '{"note":"Lives in Haifa"}' } }),
      sse('content_block_stop', { index: 0 }),
      ...end('tool_use'),
    ];
    const api = fakeApi([toolTurn, [start(), ...textBlock(0, ['Noted.']), ...end('end_turn')]]);
    const notes: string[] = [];
    const r = await runTurn([], 'I live in Haifa', { ...base, autoMemory: true, fetch: api.fetchImpl }, { onText: () => {}, onMemory: (n) => notes.push(n) });
    expect(notes).toEqual(['Lives in Haifa']);
    expect(api.bodies).toHaveLength(2);
    const second = api.bodies[1].messages as { role: string; content: unknown }[];
    expect(second[2]).toEqual({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'Saved.' }] });
    expect(r.text).toBe('Noted.');
  });

  it('refusal stops with a refusal result', async () => {
    const api = fakeApi([[start(), ...end('refusal')]]);
    const r = await runTurn([], 'x', { ...base, fetch: api.fetchImpl }, { onText: () => {} });
    expect(r.stop).toBe('refusal');
  });

  it('system prompt: recommend-only, language, memory, opt-in data only', () => {
    const p = systemPrompt({ lang: 'he', today: '2026-11-20', memory: '- Lives in Haifa', data: null, autoMemory: true });
    expect(p).toContain('never tell the user to buy or sell');
    expect(p).toContain('Answer in Hebrew');
    expect(p).toContain('Lives in Haifa');
    expect(p).toContain('save_memory');
    expect(p).not.toContain("user's numbers in Kesefly");
    expect(systemPrompt({ lang: 'en', today: '2026-11-20', memory: '', data: 'Cash 100', autoMemory: false })).toContain('Cash 100');
  });
});
