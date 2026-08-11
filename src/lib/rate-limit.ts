// ---------------------------------------------------------------------------
// Login rate limiting (brute-force protection).
//
// In-memory sliding window: failed attempts are timestamped per key and
// counted back over the window. Two layers are enforced at the login action:
//   - per IP+username  (5 failures / 15 min)  -> stops targeted guessing
//   - per IP           (20 failures / 15 min) -> stops distributed guessing
//
// Successful logins clear the per-user counter (a legitimate owner getting
// back in resets their streak) but not the whole-IP counter.
//
// NOTE: counters live in process memory, so this is per-instance — adequate
// for self-hosting and dev. For multi-instance serverless deployments,
// replace with a shared store (e.g. a Supabase table or Redis) using the
// same check/record/clear contract.
// ---------------------------------------------------------------------------

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_USERNAME_FAILURES = 5;
export const MAX_IP_FAILURES = 20;

const failures = new Map<string, number[]>();

function prune(key: string, now: number, windowMs: number): number[] {
  const hits = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
  failures.set(key, hits);
  return hits;
}

// Bound memory: sweep expired keys once the map grows beyond a few hundred.
function sweepExpired() {
  if (failures.size < 1000) return;
  const now = Date.now();
  for (const [key, hits] of failures) {
    if (hits.every((t) => now - t >= LOGIN_WINDOW_MS)) failures.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window rolls over (0 when allowed). */
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs = LOGIN_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const hits = prune(key, now, windowMs);
  if (hits.length >= max) {
    const oldest = hits[0]!;
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const hits = prune(key, now, LOGIN_WINDOW_MS);
  hits.push(now);
  failures.set(key, hits);
  sweepExpired();
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
