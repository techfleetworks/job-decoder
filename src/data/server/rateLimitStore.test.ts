import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, clientKey, createInMemoryRateLimitStore } from "@/data/server/rateLimitStore";

describe("in-memory rate-limit store", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("increments the count within a window and keys are independent", async () => {
    const store = createInMemoryRateLimitStore();
    expect(await store.hit("a", 60)).toBe(1);
    expect(await store.hit("a", 60)).toBe(2);
    expect(await store.hit("b", 60)).toBe(1);
  });

  it("resets the count once the window elapses", async () => {
    const store = createInMemoryRateLimitStore();
    expect(await store.hit("a", 60)).toBe(1);
    expect(await store.hit("a", 60)).toBe(2);
    vi.advanceTimersByTime(60_000);
    expect(await store.hit("a", 60)).toBe(1);
  });
});

describe("clientKey", () => {
  it("hashes the IP (never stores the raw address) and is stable", () => {
    const k = clientKey("203.0.113.7");
    expect(k).not.toContain("203.0.113.7");
    expect(k).toMatch(/^[0-9a-f]{64}$/);
    expect(clientKey("203.0.113.7")).toBe(k);
    expect(clientKey("203.0.113.8")).not.toBe(k);
  });
});

describe("clientIp", () => {
  const from = (h: Record<string, string>) => (name: string) => h[name] ?? null;

  it("prefers the platform-trusted x-real-ip over a spoofed x-forwarded-for left-most", () => {
    // An attacker prepends a fake origin to x-forwarded-for; the trusted header wins.
    const ip = clientIp(from({ "x-real-ip": "198.51.100.9", "x-forwarded-for": "1.1.1.1, 198.51.100.9" }));
    expect(ip).toBe("198.51.100.9");
  });

  it("falls back to the right-most forwarded hop, never the client's left-most token", () => {
    const ip = clientIp(from({ "x-forwarded-for": "1.1.1.1, 198.51.100.9" }));
    expect(ip).toBe("198.51.100.9");
    expect(ip).not.toBe("1.1.1.1");
  });

  it("is 'unknown' when no address header is present", () => {
    expect(clientIp(from({}))).toBe("unknown");
  });
});
