/**
 * Wide answers from the internet for the chat: Wikipedia (free API, no key), in the app
 * language. Used for general questions the money rules do not cover ("what is a P/E ratio",
 * "מה זה אג״ח", "who is Warren Buffett"). Only the question text is sent; answers are cached
 * so a repeated question works offline.
 */
const UA = { 'User-Agent': 'Kesefly/1.0 (education app)', Accept: 'application/json' };
const cache = new Map<string, WebAnswer | null>();

export type WebAnswer = { title: string; text: string; url: string; source: 'Wikipedia' };

/** Strips question words so the search hits the subject ("what is inflation?" → "inflation"). */
/** Finance abbreviations, spelled out so the search finds the right article. */
const EXPAND: [RegExp, string][] = [
  [/אג["״']?ח/g, 'איגרת חוב'],
  [/מק["״']?מ/g, 'מלווה קצר מועד'],
  [/מדד ת["״']?א/g, 'מדד תל אביב'],
  [/\bp\/e\b/gi, 'price earnings ratio'],
  [/\betfs?\b/gi, 'exchange-traded fund'],
];

/** True when at least one meaningful word of the subject appears in the article title or text. */
function relevant(subject: string, title: string, text: string): boolean {
  const hay = `${title} ${text}`.toLowerCase();
  const words = subject
    .toLowerCase()
    .split(/[\s\-–,]+/)
    .map((w) => w.replace(/^[והבלשמכ](?=[א-ת]{3})/, ''))
    .filter((w) => w.length >= 3);
  return words.length === 0 || words.some((w) => hay.includes(w));
}

export function subjectOf(q: string): string {
  let s = q.trim();
  for (const [re, full] of EXPAND) s = s.replace(re, full);
  return s
    .replace(/[?؟!.]+$/g, '')
    .replace(/^(what|who|where|when|how|why)\s+(is|are|was|were|does|do)\s+(a|an|the)?\s*/i, '')
    .replace(/^(explain|define|tell me about|meaning of)\s+/i, '')
    .replace(/^(מה\s+זה|מה\s+זו|מהו|מהי|מי\s+זה|מי\s+זו|מיהו|מיהי|מה\s+המשמעות\s+של|הסבר\s+על|תסביר\s+(לי\s+)?(על|מה\s+זה)?|ספר\s+לי\s+על)\s*/u, '')
    .trim();
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

/** Best Wikipedia summary for a question, or null. */
export async function webAnswer(question: string, lang: 'en' | 'he', sentencesWanted = 3): Promise<WebAnswer | null> {
  const subject = subjectOf(question);
  if (subject.length < 2) return null;
  const key = `${lang}|${sentencesWanted}|${subject.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const host = `https://${lang}.wikipedia.org`;
  try {
    const search = await withTimeout(
      fetch(`${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(subject)}&format=json&srlimit=1&utf8=1`, { headers: UA }),
      10_000,
    );
    const sj = (await search.json()) as { query?: { search?: { title: string }[] } };
    const title = sj.query?.search?.[0]?.title;
    if (!title) {
      cache.set(key, null);
      return null;
    }
    const sum = await withTimeout(fetch(`${host}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, { headers: UA }), 10_000);
    const d = (await sum.json()) as { title?: string; extract?: string; type?: string; content_urls?: { mobile?: { page?: string } } };
    if (!d.extract || d.type === 'disambiguation' || !relevant(subject, d.title ?? title, d.extract)) {
      cache.set(key, null);
      return null;
    }
    // Keep it chat-sized: first few sentences (more when the user asks "tell me more").
    const sentences = d.extract.match(/[^.!?]+[.!?]+/g) ?? [d.extract];
    const ans: WebAnswer = {
      title: d.title ?? title,
      text: sentences.slice(0, sentencesWanted).join('').trim(),
      url: d.content_urls?.mobile?.page ?? `${host}/wiki/${encodeURIComponent(title)}`,
      source: 'Wikipedia',
    };
    cache.set(key, ans);
    return ans;
  } catch {
    return null;
  }
}
