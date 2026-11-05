// The rate-limit store port and its default in-memory adapter (ADR-0043). The store owns the
// side effect — increment a key's count in its current window and return the new count — so
// the pure decision (src/domain/rateLimit.ts) stays testable. The route depends on the port,
// not this implementation.
//
// Privacy (owasp User Privacy Protection): the client IP is hashed before it is used as a
// key, so the raw address is never stored, and the key is ephemeral (it lives only for the
// window). See ADR-0043 and data-map.json.

import { createHash } from "node:crypto";

export interface RateLimitStore {
  /** Increment `key`'s count in its current window and return the post-increment count. */
  hit(key: string, windowSeconds: number): Promise<number>;
}

// A per-deploy salt is enough; it only has to be stable within one deployment. Hashing means
// the stored key is a pseudonym of the IP, not the IP itself.
const SALT = process.env.RATE_LIMIT_SALT ?? "hat-check-rate-limit-salt";

export function clientKey(ip: string): string {
  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex");
}

// The trusted client IP for the rate-limit key. The left-most `x-forwarded-for` token is
// client-controlled and must NOT be trusted for a security key: a flood could rotate it and
// get a fresh bucket each request (owasp Denial of Service, trust-boundary). On Vercel the
// platform sets `x-real-ip` / `x-vercel-forwarded-for` to the real client address and strips
// client-sent copies, so prefer those; fall back to the RIGHT-most forwarded hop (the
// proxy-appended one), never the left-most. Takes a header getter so it is testable without a
// request object.
export function clientIp(header: (name: string) => string | null): string {
  const real = header("x-real-ip")?.trim();
  if (real) return real;
  const vercel = header("x-vercel-forwarded-for")?.split(",").pop()?.trim();
  if (vercel) return vercel;
  const hops = header("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (hops && hops.length > 0) return hops[hops.length - 1]!;
  return "unknown";
}

// In-memory fixed-window store. HONEST LIMIT (ADR-0043): this is per-process. On serverless
// it enforces the cap only within a single warm instance, so production durability needs a
// shared store (e.g. Upstash Redis) behind this same port — swap the adapter, not the route.
export function createInMemoryRateLimitStore(): RateLimitStore {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    async hit(key, windowSeconds) {
      const now = Date.now();
      const w = windows.get(key);
      if (!w || now - w.start >= windowSeconds * 1000) {
        windows.set(key, { start: now, count: 1 });
        return 1;
      }
      w.count += 1;
      return w.count;
    },
  };
}

// One process-wide instance for the route to use.
export const rateLimitStore: RateLimitStore = createInMemoryRateLimitStore();
