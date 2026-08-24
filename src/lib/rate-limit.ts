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

// ---------------------------------------------------------------------------
// Outbound action rate limiting
//
// Prevents accidental mass status changes, bulk operations, and email
// sending floods. Enforced per user per action type.
//
// Limits:
//   - Status changes:  30 / 5 min per user
//   - Bulk operations:  5 / 5 min per user
//   - Email sends:     10 / 5 min per user (Resend free tier: 100/day)
// ---------------------------------------------------------------------------

const OUTBOUND_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "outbound:status_change": { max: 30, windowMs: 5 * 60 * 1000 },
  "outbound:bulk_action": { max: 5, windowMs: 5 * 60 * 1000 },
  "outbound:send_email": { max: 10, windowMs: 5 * 60 * 1000 },
  "outbound:create_lead": { max: 20, windowMs: 5 * 60 * 1000 },
};

const outboundHits = new Map<string, number[]>();

function pruneOutbound(key: string, now: number, windowMs: number): number[] {
  const hits = (outboundHits.get(key) ?? []).filter((t) => now - t < windowMs);
  outboundHits.set(key, hits);
  return hits;
}

/**
 * Check if an outbound action is allowed for the given user.
 * Returns { allowed: true } or { allowed: false, retryAfterSec }.
 */
export function checkOutboundRateLimit(
  userId: string,
  actionType: keyof typeof OUTBOUND_LIMITS,
): RateLimitResult {
  const limit = OUTBOUND_LIMITS[actionType];
  if (!limit) return { allowed: true, retryAfterSec: 0 };

  const key = `${userId}:${actionType}`;
  const now = Date.now();
  const hits = pruneOutbound(key, now, limit.windowMs);

  if (hits.length >= limit.max) {
    const oldest = hits[0]!;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + limit.windowMs - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Record an outbound action hit for rate limiting.
 */
export function recordOutboundAction(
  userId: string,
  actionType: keyof typeof OUTBOUND_LIMITS,
): void {
  const key = `${userId}:${actionType}`;
  const now = Date.now();
  const limit = OUTBOUND_LIMITS[actionType];
  if (!limit) return;
  const hits = pruneOutbound(key, now, limit.windowMs);
  hits.push(now);
  outboundHits.set(key, hits);
}

// ---------------------------------------------------------------------------
// REST API rate limiting
//
// Protects /api/v1/* endpoints from abuse. Two layers:
//   - per API key:  120 requests / 1 min  (generous for integrations)
//   - per IP:       300 requests / 1 min  (stops distributed abuse)
//
// Returns 429 Too Many Requests with Retry-After header when exceeded.
// ---------------------------------------------------------------------------

const API_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "api:key":   { max: 120, windowMs: 60 * 1000 },
  "api:ip":    { max: 300, windowMs: 60 * 1000 },
};

const apiHits = new Map<string, number[]>();

function pruneApi(key: string, now: number, windowMs: number): number[] {
  const hits = (apiHits.get(key) ?? []).filter((t) => now - t < windowMs);
  apiHits.set(key, hits);
  return hits;
}

/**
 * Check if an API request is allowed for the given key and/or IP.
 * Pass the API key id (from validateApiKey) for per-key limiting,
 * and the client IP for per-IP limiting.
 */
export function checkApiRateLimit(
  keyId: string | null,
  ip: string,
): RateLimitResult {
  const now = Date.now();

  // Per-key check
  if (keyId) {
    const limit = API_LIMITS["api:key"];
    const hits = pruneApi(`key:${keyId}`, now, limit.windowMs);
    if (hits.length >= limit.max) {
      const oldest = hits[0]!;
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((oldest + limit.windowMs - now) / 1000)),
      };
    }
  }

  // Per-IP check
  const ipLimit = API_LIMITS["api:ip"];
  const ipHits = pruneApi(`ip:${ip}`, now, ipLimit.windowMs);
  if (ipHits.length >= ipLimit.max) {
    const oldest = ipHits[0]!;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + ipLimit.windowMs - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** Record an API request hit for rate limiting. */
export function recordApiHit(keyId: string | null, ip: string): void {
  const now = Date.now();
  if (keyId) {
    const limit = API_LIMITS["api:key"];
    const hits = pruneApi(`key:${keyId}`, now, limit.windowMs);
    hits.push(now);
    apiHits.set(`key:${keyId}`, hits);
  }
  const ipLimit = API_LIMITS["api:ip"];
  const ipHits = pruneApi(`ip:${ip}`, now, ipLimit.windowMs);
  ipHits.push(now);
  apiHits.set(`ip:${ip}`, ipHits);
}

