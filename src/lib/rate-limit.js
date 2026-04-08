// Lightweight in-process rate limiter.
//
// Per-key sliding window — a key is usually `${ip}:${routeName}`.
// Keeps a deque of timestamps; on every check, drops anything older
// than the window. Allows up to `limit` requests per window.
//
// Single-process scope (Next.js dev or one Dokploy container).
// If you ever scale to multiple replicas, swap for Redis. For one
// admin user + a single GitHub webhook source, in-memory is plenty.
//
// Survives Next.js HMR via globalThis.

if (!globalThis.__ghostbotRateLimit) {
  globalThis.__ghostbotRateLimit = {
    // Map<key, number[]>  — array of request timestamps in ms
    buckets: new Map(),
    // Last cleanup time so we don't sweep on every call
    lastSweep: 0,
  };
}

const store = globalThis.__ghostbotRateLimit;

const SWEEP_INTERVAL_MS = 60 * 1000;
const MAX_TRACKED_KEYS = 5000;

function maybeSweep(now) {
  if (now - store.lastSweep < SWEEP_INTERVAL_MS) return;
  store.lastSweep = now;

  // Drop any bucket where every entry is older than 10 minutes
  const cutoff = now - 10 * 60 * 1000;
  for (const [key, list] of store.buckets.entries()) {
    if (list.length === 0 || list[list.length - 1] < cutoff) {
      store.buckets.delete(key);
    }
  }

  // Hard cap to prevent unbounded growth from a flood of unique keys
  if (store.buckets.size > MAX_TRACKED_KEYS) {
    const excess = store.buckets.size - MAX_TRACKED_KEYS;
    let i = 0;
    for (const key of store.buckets.keys()) {
      if (i++ >= excess) break;
      store.buckets.delete(key);
    }
  }
}

/**
 * Check if `key` is allowed under `limit` requests per `windowMs`.
 * Returns { allowed, remaining, retryAfterSec, resetAt }.
 */
export function checkRateLimit(key, { limit = 60, windowMs = 60 * 1000 } = {}) {
  const now = Date.now();
  maybeSweep(now);

  const cutoff = now - windowMs;
  let list = store.buckets.get(key);
  if (!list) {
    list = [];
    store.buckets.set(key, list);
  }

  // Drop old timestamps from the front
  while (list.length > 0 && list[0] < cutoff) list.shift();

  if (list.length >= limit) {
    const oldest = list[0];
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfterSec: Math.ceil(retryAfterMs / 1000) || 1,
      resetAt: oldest + windowMs,
    };
  }

  list.push(now);
  return {
    allowed: true,
    remaining: limit - list.length,
    limit,
    retryAfterSec: 0,
    resetAt: now + windowMs,
  };
}

/**
 * Extract a stable client identifier from a Next.js Request.
 * Trusts x-forwarded-for from Traefik / Cloudflare / etc, falls
 * back to a generic 'unknown' bucket.
 */
export function getClientIp(request) {
  if (!request?.headers) return 'unknown';
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const cfip = request.headers.get('cf-connecting-ip');
  if (cfip) return cfip.trim();
  return 'unknown';
}

/**
 * Convenience: check + return a 429 Response if limited.
 * Use at the top of any /api route handler:
 *
 *   const limited = enforceRateLimit(request, 'agent-jobs:create', { limit: 10 });
 *   if (limited) return limited;
 */
export function enforceRateLimit(request, route, opts = {}) {
  const ip = getClientIp(request);
  const key = `${ip}:${route}`;
  const result = checkRateLimit(key, opts);
  if (result.allowed) return null;
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfterSec: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
      },
    },
  );
}
