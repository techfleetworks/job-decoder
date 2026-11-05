// The rate-limit decision, pure and deterministic (ADR-0043). It owns the rule — is this
// request within the per-window limit? — with no clock, no store, and no request object, so
// it is tested on its own and reused by the route. The count is the number of requests seen
// in the current window INCLUDING this one; the store (a side-effecting adapter) produces it.
//
// This is the Denial-of-Service countermeasure (owasp): a per-client fixed-window cap in
// front of the expensive decode + LLM call. The structural guarantee is the cap itself; the
// @security scenario checks that the (limit + 1)th request in a window is turned away.

export interface RateLimitConfig {
  /** Max requests allowed per window, per key. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still allowed in this window (0 once over). */
  remaining: number;
  /** Seconds to wait before retrying, for the Retry-After header (0 when allowed). */
  retryAfterSeconds: number;
}

/** The per-decode cap: 20 decodes per 10 minutes, per client. Tunable in one place. */
export const DECODE_RATE_LIMIT: RateLimitConfig = { limit: 20, windowSeconds: 600 };

/**
 * Decide from the post-increment count for this window. `count` is how many requests this
 * key has made in the current window, this one included, so the first request is count 1 and
 * it is allowed while count <= limit.
 */
export function decideRateLimit(count: number, config: RateLimitConfig): RateLimitResult {
  const allowed = count <= config.limit;
  return {
    allowed,
    remaining: Math.max(0, config.limit - count),
    retryAfterSeconds: allowed ? 0 : config.windowSeconds,
  };
}
