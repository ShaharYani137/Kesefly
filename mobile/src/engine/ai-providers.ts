/**
 * AI providers for the Kesefly chat: the user brings an API key from any of these companies.
 *
 * - Anthropic (Claude) goes through the official SDK (engine/claude.ts).
 * - Every other provider is reached through its OpenAI-compatible Chat Completions API
 *   (POST {baseUrl}/chat/completions, streaming SSE; GET {baseUrl}/models), which OpenAI,
 *   Google Gemini, xAI, Mistral, DeepSeek, Groq and OpenRouter all offer. "custom" takes any
 *   other OpenAI-compatible address the user types in.
 *
 * The provider is guessed from the key's prefix, then confirmed by listing models with it
 * (some prefixes are shared: "sk-" is OpenAI or DeepSeek; Mistral keys have no prefix).
 * Model names come from the provider's own list, so they never go stale in the app.
 */
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'xai' | 'mistral' | 'deepseek' | 'groq' | 'openrouter' | 'custom';

export type Provider = {
  id: ProviderId;
  name: string;
  baseUrl: string;
  /** Where users create a key. */
  keysUrl: string;
  /** Preferred chat models, best first (matched against the provider's model list). */
  prefer: RegExp[];
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  anthropic: { id: 'anthropic', name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', keysUrl: 'https://console.anthropic.com/settings/keys', prefer: [] },
  openai: { id: 'openai', name: 'OpenAI (ChatGPT)', baseUrl: 'https://api.openai.com/v1', keysUrl: 'https://platform.openai.com/api-keys', prefer: [/^gpt-5(\.\d+)?$/, /^gpt-5/, /^gpt-4\.1$/, /^gpt-4o$/, /^gpt-/] },
  gemini: { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', keysUrl: 'https://aistudio.google.com/apikey', prefer: [/gemini-[\d.]+-pro$/, /gemini-[\d.]+-flash$/, /gemini.*pro/, /gemini.*flash/, /gemini/] },
  xai: { id: 'xai', name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', keysUrl: 'https://console.x.ai', prefer: [/^grok-\d+$/, /^grok-\d/, /^grok/] },
  mistral: { id: 'mistral', name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', keysUrl: 'https://console.mistral.ai/api-keys', prefer: [/^mistral-large-latest$/, /^mistral-medium-latest$/, /^mistral-large/, /^mistral/] },
  deepseek: { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', keysUrl: 'https://platform.deepseek.com/api_keys', prefer: [/^deepseek-chat$/, /^deepseek/] },
  groq: { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', keysUrl: 'https://console.groq.com/keys', prefer: [/llama-3\.3-70b/, /llama.*70b/, /llama/] },
  openrouter: { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', keysUrl: 'https://openrouter.ai/keys', prefer: [/^openrouter\/auto$/] },
  custom: { id: 'custom', name: 'Other (OpenAI-compatible)', baseUrl: '', keysUrl: '', prefer: [] },
};

/** Providers to try for a key, most likely first. */
export function guessProviders(key: string): ProviderId[] {
  const k = key.trim();
  if (k.startsWith('sk-ant-')) return ['anthropic'];
  if (k.startsWith('sk-or-')) return ['openrouter'];
  if (k.startsWith('AIza')) return ['gemini'];
  if (k.startsWith('gsk_')) return ['groq'];
  if (k.startsWith('xai-')) return ['xai'];
  if (k.startsWith('sk-proj-') || k.startsWith('sk-svcacct-') || k.startsWith('sk-admin-')) return ['openai'];
  if (k.startsWith('sk-')) return ['openai', 'deepseek'];
  if (/^[A-Za-z0-9]{32}$/.test(k)) return ['mistral'];
  return ['openai', 'mistral', 'deepseek'];
}

const NOT_CHAT = /(embed|whisper|tts|audio|realtime|transcri|moderation|image|dall-e|davinci|babbage|search|vision-preview|guard|rerank|ocr|aqa|imagen|veo|computer-use|instruct)/i;

/** Chat models from a /models answer, preferred first, at most 40. */
export function chatModels(ids: string[], prefer: RegExp[]): string[] {
  const clean = [...new Set(ids.map((m) => m.replace(/^models\//, '')))].filter((m) => !NOT_CHAT.test(m));
  const rank = (m: string) => {
    const i = prefer.findIndex((r) => r.test(m));
    return i < 0 ? prefer.length : i;
  };
  return clean.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).slice(0, 40);
}

export type KeyCheck = { status: 'ok'; models: string[] } | { status: 'bad' | 'network' };

/** Lists models with the key: proves the key works and gives the model picker. */
export async function listModels(baseUrl: string, key: string, prefer: RegExp[], fetchImpl: typeof fetch = fetch): Promise<KeyCheck> {
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/models`, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } });
  } catch {
    return { status: 'network' };
  }
  if (res.status === 401 || res.status === 403 || res.status === 400) return { status: 'bad' };
  if (!res.ok) return { status: 'network' };
  try {
    const body = (await res.json()) as { data?: { id?: string }[]; models?: { id?: string; name?: string }[] };
    const ids = (body.data ?? body.models ?? []).map((m) => m.id ?? (m as { name?: string }).name ?? '').filter(Boolean);
    return { status: 'ok', models: chatModels(ids, prefer) };
  } catch {
    return { status: 'ok', models: [] };
  }
}

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

export type GenericOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
  fetch?: typeof fetch;
};

export class ProviderError extends Error {
  constructor(
    public kind: 'auth' | 'rate' | 'network' | 'overloaded' | 'other',
    msg?: string,
  ) {
    super(msg ?? kind);
  }
}

/**
 * One streamed Chat Completions reply. Calls onText with the text so far; returns the full
 * text, or what arrived before an abort.
 */
export async function streamChat(messages: ChatMsg[], o: GenericOptions, onText: (t: string) => void): Promise<{ text: string; aborted: boolean }> {
  const f = o.fetch ?? fetch;
  let res: Response;
  try {
    res = await f(`${o.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${o.apiKey}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ model: o.model, messages, stream: true }),
      signal: o.signal,
    });
  } catch (e) {
    if (o.signal?.aborted) return { text: '', aborted: true };
    throw new ProviderError('network', e instanceof Error ? e.message : String(e));
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      // ignore
    }
    const kind = res.status === 401 || res.status === 403 ? 'auth' : res.status === 429 ? 'rate' : res.status >= 500 ? 'overloaded' : 'other';
    throw new ProviderError(kind, `HTTP ${res.status} ${detail}`);
  }
  let text = '';
  const reader = res.body?.getReader();
  if (!reader) {
    // No streaming body: read it whole (some providers ignore stream: true on errors).
    const raw = await res.text();
    text = parseSse(raw).text;
    onText(text);
    return { text, aborted: false };
  }
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const piece = sseLine(line);
        if (piece) {
          text += piece;
          onText(text);
        }
      }
    }
    const last = sseLine(buf);
    if (last) {
      text += last;
      onText(text);
    }
  } catch (e) {
    if (o.signal?.aborted) return { text, aborted: true };
    throw new ProviderError('network', e instanceof Error ? e.message : String(e));
  }
  return { text, aborted: false };
}

/** Text in one SSE "data:" line of a Chat Completions stream ('' for anything else). */
function sseLine(line: string): string {
  const l = line.trim();
  if (!l.startsWith('data:')) return '';
  const data = l.slice(5).trim();
  if (!data || data === '[DONE]') return '';
  try {
    const j = JSON.parse(data) as { choices?: { delta?: { content?: string | null }; message?: { content?: string | null } }[] };
    return j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? '';
  } catch {
    return '';
  }
}

export function parseSse(raw: string): { text: string } {
  return { text: raw.split('\n').map(sseLine).join('') };
}
