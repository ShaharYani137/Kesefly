/**
 * Kesefly Academy: placement scoring and a personal learning path.
 *
 * 1. Placement test (12 questions, 3 per level). A level counts as known when the user gets
 *    at least 2 of its 3 questions right. The path starts at the first level not known.
 * 2. Lessons in known levels are marked "tested out" (optional review).
 * 3. Lessons that match the user's own situation get a "for you" flag and jump the queue:
 *    expensive debt, missing emergency fund, negative free cash, a concentrated portfolio,
 *    or foreign-currency holdings.
 * Knowledge score (0-100) blends the placement result with completed lessons and quiz scores.
 */
import { type LessonId, PATH, type PlacementQ } from '@/i18n/academy';

import type { Profile } from './types';

export type LevelId = 1 | 2 | 3 | 4;

export type Placement = { correct: number; total: number; known: LevelId[]; start: LevelId; at: number };

export type AcademyProgress = {
  placement?: Placement;
  /** Completed lessons, with the share of quiz questions right (0-1). */
  done: Partial<Record<LessonId, { score: number; at: number }>>;
  xp: number;
  /** Days in a row with at least one finished lesson. */
  streak: number;
  /** Last study day, YYYY-MM-DD (local). */
  lastDay?: string;
};

export const EMPTY_PROGRESS: AcademyProgress = { done: {}, xp: 0, streak: 0 };

export const XP_LESSON = 20;
export const XP_PER_CORRECT = 5;

export function scorePlacement(questions: PlacementQ[], answers: number[]): Placement {
  const byLevel: Record<LevelId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) {
      correct++;
      byLevel[q.level]++;
    }
  });
  const known = ([1, 2, 3, 4] as LevelId[]).filter((l) => byLevel[l] >= 2);
  const start = (([1, 2, 3, 4] as LevelId[]).find((l) => !known.includes(l)) ?? 4) as LevelId;
  return { correct, total: questions.length, known, start, at: Date.now() };
}

export type HoldingLite = { symbol: string; shares: number; buyPrice: number };

/** Lessons that fit the user's numbers right now. */
export function personalFocus(p: Profile, holdings: HoldingLite[]): LessonId[] {
  const out: LessonId[] = [];
  if (p.monthlyIncome > 0 && p.monthlyIncome - p.monthlyExpenses <= 0) out.push('budget');
  if (p.highInterestDebt > 0) out.push('debt');
  if (p.monthlyExpenses > 0 && p.cashSavings < p.monthlyExpenses * 3) out.push('emergency');
  const cost = holdings.map((h) => h.shares * h.buyPrice);
  const total = cost.reduce((a, b) => a + b, 0);
  if (holdings.length > 0 && total > 0 && Math.max(...cost) / total > 0.3) out.push('diversification');
  const hasTA = holdings.some((h) => h.symbol.endsWith('.TA'));
  const hasForeign = p.currency === 'ILS' ? holdings.some((h) => !h.symbol.endsWith('.TA')) : hasTA;
  if (hasForeign) out.push('currency');
  return out;
}

export type PathItem = {
  id: LessonId;
  level: LevelId;
  status: 'done' | 'tested' | 'next' | 'open';
  forYou: boolean;
  score?: number;
};

export function buildPath(progress: AcademyProgress, profile: Profile, holdings: HoldingLite[]) {
  const focus = personalFocus(profile, holdings);
  const known = progress.placement?.known ?? [];
  const items: PathItem[] = PATH.flatMap((lvl) =>
    lvl.lessons.map((id): PathItem => {
      const d = progress.done[id];
      return {
        id,
        level: lvl.id,
        status: d ? 'done' : known.includes(lvl.id) ? 'tested' : 'open',
        forYou: focus.includes(id),
        score: d?.score,
      };
    }),
  );
  // Next: a "for you" lesson not done yet, else the first open lesson in path order.
  const next = items.find((i) => i.forYou && i.status !== 'done') ?? items.find((i) => i.status === 'open') ?? items.find((i) => i.status === 'tested');
  if (next && next.status !== 'done') next.status = 'next';

  const doneCount = items.filter((i) => i.status === 'done').length;
  const placementPart = progress.placement ? progress.placement.correct / progress.placement.total : 0;
  const quizAvg = doneCount ? items.reduce((a, i) => a + (i.score ?? 0), 0) / doneCount : 0;
  const lessonsPart = doneCount / items.length;
  const knowledge = Math.round(100 * Math.min(1, placementPart * 0.4 + lessonsPart * 0.45 + quizAvg * lessonsPart * 0.15));

  // Current level: the highest level fully known or completed, plus one (capped at 4).
  let level: LevelId = 1;
  for (const lvl of PATH) {
    const all = items.filter((i) => i.level === lvl.id);
    if (all.every((i) => i.status === 'done' || i.status === 'tested' || known.includes(lvl.id))) level = Math.min(4, lvl.id + 1) as LevelId;
    else break;
  }
  return { items, next, doneCount, total: items.length, knowledge, level, focus };
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** New progress after finishing a lesson quiz. First completion earns full XP; reviews earn quiz XP only. */
export function completeLesson(p: AcademyProgress, id: LessonId, correct: number, total: number): AcademyProgress {
  const first = !p.done[id];
  const day = today();
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const streak = p.lastDay === day ? p.streak : p.lastDay === yesterday ? p.streak + 1 : 1;
  const prev = p.done[id]?.score ?? 0;
  return {
    ...p,
    done: { ...p.done, [id]: { score: Math.max(prev, total ? correct / total : 1), at: Date.now() } },
    xp: p.xp + (first ? XP_LESSON : 0) + correct * XP_PER_CORRECT,
    streak,
    lastDay: day,
  };
}
