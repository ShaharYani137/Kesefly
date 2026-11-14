/**
 * The chat's long-term memory, so it gets better the more it is used. Stored on the phone only
 * (AsyncStorage), never uploaded.
 *
 * It learns:
 *   - interests: which stocks and topics the user asks about most (personal suggestion chips,
 *     and "your usual" context in answers);
 *   - the user's name ("my name is Dana" / "קוראים לי דנה");
 *   - from feedback: a thumbs-down on an answer for a question makes the next answer to the
 *     same question come from the other source (built-in rules ↔ the web), and a thumbs-up
 *     pins the source that worked;
 *   - web answers it already found (answered again instantly, even offline).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'investapp/brain/v1';

export type AnswerSource = 'rules' | 'live' | 'web';

export type Brain = {
  name?: string;
  /** Ask counts per stock symbol. */
  tickers: Record<string, number>;
  /** Ask counts per topic (market, fx, news, portfolio, ...). */
  topics: Record<string, number>;
  /** Preferred source per normalized question, learned from feedback. */
  prefer: Record<string, AnswerSource>;
  /** Saved web answers by normalized question. */
  web: Record<string, { title: string; text: string; url: string }>;
  questions: number;
  helpful: number;
};

export const EMPTY_BRAIN: Brain = { tickers: {}, topics: {}, prefer: {}, web: {}, questions: 0, helpful: 0 };

let brain: Brain = EMPTY_BRAIN;
let loaded = false;

export async function loadBrain(): Promise<Brain> {
  if (loaded) return brain;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) brain = { ...EMPTY_BRAIN, ...(JSON.parse(raw) as Partial<Brain>) };
  } catch {
    // start fresh
  }
  loaded = true;
  return brain;
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(brain)).catch(() => {});
}

export function normalize(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9א-ת^.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function getBrain(): Brain {
  return brain;
}

/** Records a question: interests and counters. */
export function learnQuestion(opts: { tickers: string[]; topic: string | null }) {
  brain = {
    ...brain,
    questions: brain.questions + 1,
    tickers: { ...brain.tickers },
    topics: { ...brain.topics },
  };
  for (const t of opts.tickers) brain.tickers[t] = (brain.tickers[t] ?? 0) + 1;
  if (opts.topic) brain.topics[opts.topic] = (brain.topics[opts.topic] ?? 0) + 1;
  save();
}

/** "my name is X" / "קוראים לי X" / "אני X". Returns the name when one was said. */
export function learnName(text: string): string | null {
  const m = text.match(/\bmy name is\s+([A-Za-z][\w-]{1,20})|\bcall me\s+([A-Za-z][\w-]{1,20})|קוראים לי\s+([א-ת][א-ת-]{1,20})|שמי\s+([א-ת][א-ת-]{1,20})/i);
  const name = m?.slice(1).find(Boolean);
  if (!name) return null;
  brain = { ...brain, name };
  save();
  return name;
}

export function rememberWeb(q: string, a: { title: string; text: string; url: string }) {
  brain = { ...brain, web: { ...brain.web, [normalize(q)]: a } };
  // Keep the store small.
  const keys = Object.keys(brain.web);
  if (keys.length > 200) delete brain.web[keys[0]];
  save();
}

/** Thumbs up/down on an answer: pins or switches the source for that question. */
export function feedback(q: string, source: AnswerSource, good: boolean) {
  const k = normalize(q);
  const next: AnswerSource = good ? source : source === 'web' ? 'rules' : 'web';
  brain = { ...brain, prefer: { ...brain.prefer, [k]: next }, helpful: brain.helpful + (good ? 1 : 0) };
  save();
}

/** Top symbols and topics the user asks about, most frequent first. */
export function favorites(n = 3): { tickers: string[]; topics: string[] } {
  const top = (r: Record<string, number>) =>
    Object.entries(r)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  return { tickers: top(brain.tickers), topics: top(brain.topics) };
}
