/**
 * Runs async tasks with at most `max` of them in flight at once; the rest wait their turn.
 * Shared per limiter, so every caller of one limiter counts toward the same cap.
 */
export function limiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    while (active >= max) await new Promise<void>((wake) => waiting.push(wake));
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}
