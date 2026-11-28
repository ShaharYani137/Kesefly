/**
 * Keeps event-alert checks (event-alerts.ts) from overlapping (P-092).
 *
 * Two layers:
 * - `singleFlight`: callers in the same JS runtime (foreground start, the 10-minute interval,
 *   a background task run while the app is open) share the check that is already running.
 * - `runningSince` in the seen-record: a check in another JS runtime (the headless background
 *   task) sees that a check started less than LOCK_STALE_MS ago and skips. A crashed run that
 *   never cleared the mark blocks checks for at most LOCK_STALE_MS.
 *
 * Plain TypeScript, no React Native, so it is unit-tested directly.
 */

/** A check normally takes seconds; after 2 minutes the mark is treated as left by a crashed run. */
export const LOCK_STALE_MS = 2 * 60_000;

/**
 * True when another check holds the lock: `runningSince` is a timestamp from the last
 * LOCK_STALE_MS. Missing, malformed, stale and future values (clock moved back) do not lock,
 * so old records without the field still work and a bad value never blocks alerts.
 */
export function isLocked(runningSince: unknown, now: number): boolean {
  if (typeof runningSince !== 'number' || !Number.isFinite(runningSince)) return false;
  const age = now - runningSince;
  return age >= 0 && age < LOCK_STALE_MS;
}

/** Wraps `fn` so that calls made while it runs get the same promise instead of a second run. */
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let running: Promise<T> | null = null;
  return () => {
    if (!running) {
      running = (async () => {
        try {
          return await fn();
        } finally {
          running = null;
        }
      })();
    }
    return running;
  };
}
