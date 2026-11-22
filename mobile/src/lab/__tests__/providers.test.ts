import { describe, expect, it } from 'vitest';

import { chatModels, guessProviders, listModels, PROVIDERS, ProviderError, streamChat } from '@/engine/ai-providers';

const sseBody = (parts: string[]) => parts.map((p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`).join('') + 'data: [DONE]\n\n';

describe('AI providers: any company', () => {
  it('guesses the company from the key', () => {
    expect(guessProviders('sk-ant-api03-x')).toEqual(['anthropic']);
    expect(guessProviders('sk-proj-abc')).toEqual(['openai']);
    expect(guessProviders('sk-abc123')).toEqual(['openai', 'deepseek']);
    expect(guessProviders('AIzaSyB')).toEqual(['gemini']);
    expect(guessProviders('gsk_abc')).toEqual(['groq']);
    expect(guessProviders('xai-abc')).toEqual(['xai']);
    expect(guessProviders('sk-or-v1-abc')).toEqual(['openrouter']);
    expect(guessProviders('A'.repeat(32))).toEqual(['mistral']);
  });

  it('keeps chat models only, preferred first', () => {
    const ids = ['text-embedding-3-small', 'whisper-1', 'gpt-4o', 'gpt-5', 'dall-e-3', 'gpt-4.1', 'tts-1'];
    expect(chatModels(ids, PROVIDERS.openai.prefer)).toEqual(['gpt-5', 'gpt-4.1', 'gpt-4o']);
    expect(chatModels(['models/gemini-2.5-flash', 'models/gemini-2.5-pro', 'models/text-embedding-004'], PROVIDERS.gemini.prefer)).toEqual(['gemini-2.5-pro', 'gemini-2.5-flash']);
  });

  it('checks a key by listing models', async () => {
    const ok = (async () => new Response(JSON.stringify({ data: [{ id: 'gpt-5' }, { id: 'whisper-1' }] }), { status: 200 })) as unknown as typeof fetch;
    const bad = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    const down = (async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    expect(await listModels('https://api.openai.com/v1', 'k', PROVIDERS.openai.prefer, ok)).toEqual({ status: 'ok', models: ['gpt-5'] });
    expect(await listModels('https://api.openai.com/v1', 'k', [], bad)).toEqual({ status: 'bad' });
    expect(await listModels('https://api.openai.com/v1', 'k', [], down)).toEqual({ status: 'network' });
  });

  it('streams a Chat Completions reply and sends the history', async () => {
    let sent: { url: string; body: { model: string; stream: boolean; messages: unknown[] }; auth: string } | null = null;
    const f = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get('authorization') ?? '' };
      return new Response(sseBody(['Hel', 'lo', ' שלום']), { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }) as unknown as typeof fetch;
    const seen: string[] = [];
    const r = await streamChat(
      [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      { baseUrl: 'https://api.x.ai/v1/', apiKey: 'xai-k', model: 'grok-4', fetch: f },
      (t) => seen.push(t),
    );
    expect(r).toEqual({ text: 'Hello שלום', aborted: false });
    expect(seen[seen.length - 1]).toBe('Hello שלום');
    expect(sent!.url).toBe('https://api.x.ai/v1/chat/completions');
    expect(sent!.auth).toBe('Bearer xai-k');
    expect(sent!.body).toMatchObject({ model: 'grok-4', stream: true });
    expect(sent!.body.messages).toHaveLength(2);
  });

  it('maps HTTP errors to kinds', async () => {
    const f429 = (async () => new Response('slow down', { status: 429 })) as unknown as typeof fetch;
    await expect(streamChat([], { baseUrl: 'https://a/v1', apiKey: 'k', model: 'm', fetch: f429 }, () => {})).rejects.toMatchObject({ kind: 'rate' });
    const f401 = (async () => new Response('no', { status: 401 })) as unknown as typeof fetch;
    await expect(streamChat([], { baseUrl: 'https://a/v1', apiKey: 'k', model: 'm', fetch: f401 }, () => {})).rejects.toBeInstanceOf(ProviderError);
  });
});
