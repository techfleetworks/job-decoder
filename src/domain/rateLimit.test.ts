import { describe, expect, it } from "vitest";
import { decideRateLimit, DECODE_RATE_LIMIT } from "@/domain/rateLimit";

const config = { limit: 3, windowSeconds: 60 };

describe("decideRateLimit", () => {
  it("allows requests up to and including the limit", () => {
    expect(decideRateLimit(1, config)).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    expect(decideRateLimit(3, config)).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 0 });
  });

  it("rejects the request past the limit with a retry-after", () => {
    const r = decideRateLimit(4, config);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfterSeconds).toBe(60);
  });

  it("ships a concrete decode cap", () => {
    expect(DECODE_RATE_LIMIT.limit).toBeGreaterThan(0);
    expect(DECODE_RATE_LIMIT.windowSeconds).toBeGreaterThan(0);
  });
});
