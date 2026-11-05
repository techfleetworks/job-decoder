import { afterEach, describe, expect, it, vi } from "vitest";
import { decodePosting } from "@/data/decodeClient";

// A fetch double: resolves with a Response-like object, or rejects with the given error.
function mockFetch(impl: () => Promise<unknown>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("decodePosting", () => {
  it("returns the decoded result on a 200", async () => {
    mockFetch(async () => jsonResponse(200, { verdict: "strong", prepGuide: null }));
    const res = await decodePosting("UX Designer", "a posting");
    expect(res).toEqual({ ok: true, result: { verdict: "strong", prepGuide: null } });
  });

  it("maps a 429 to the rate-limited reason and keeps the server message", async () => {
    mockFetch(async () => jsonResponse(429, { error: "Too many decodes. Wait a minute." }));
    const res = await decodePosting("UX Designer", "a posting");
    expect(res).toEqual({
      ok: false,
      error: "Too many decodes. Wait a minute.",
      reason: "rate-limited",
    });
  });

  it("maps any other non-ok status to the generic error reason", async () => {
    mockFetch(async () => jsonResponse(500, {}));
    const res = await decodePosting("UX Designer", "a posting");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("error");
  });

  it("maps a network failure to the error reason, not a throw", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    const res = await decodePosting("UX Designer", "a posting");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("error");
  });

  it("re-throws an AbortError so a deliberate cancel is not shown as a failure", async () => {
    mockFetch(async () => {
      throw new DOMException("The user aborted a request.", "AbortError");
    });
    await expect(decodePosting("UX Designer", "a posting")).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("passes the abort signal through to fetch", async () => {
    const spy = vi.fn(async () => jsonResponse(200, { verdict: "strong", prepGuide: null }));
    vi.stubGlobal("fetch", spy);
    const controller = new AbortController();
    await decodePosting("UX Designer", "a posting", controller.signal);
    expect(spy).toHaveBeenCalledWith("/api/decode", expect.objectContaining({ signal: controller.signal }));
  });
});
