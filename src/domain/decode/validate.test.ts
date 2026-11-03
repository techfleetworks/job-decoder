// Discriminating tests for the decode input validator. Each case sends a specific bad
// request and asserts the exact rule that turns it away, plus the status the route returns.
// These are the T13 proof that the server-side allow-list holds (ADR-0035).
import { describe, expect, it } from "vitest";
import { MAX_POSTING, MAX_TITLE, validateDecodeInput } from "./validate";

describe("validateDecodeInput", () => {
  it("accepts a valid title and posting and trims the posting", () => {
    const check = validateDecodeInput({ title: "UX Designer", posting: "  Do wireframing.  " });
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.value.title).toBe("UX Designer");
      expect(check.value.posting).toBe("Do wireframing.");
    }
  });

  it("rejects a non-object body", () => {
    for (const body of [null, undefined, 42, "a string", ["title", "posting"]]) {
      const check = validateDecodeInput(body);
      expect(check.ok).toBe(false);
      if (!check.ok) {
        expect(check.reason).toBe("not-object");
        expect(check.status).toBe(400);
      }
    }
  });

  it("rejects a non-text title or posting", () => {
    const numberPosting = validateDecodeInput({ title: "UX Designer", posting: 123 });
    expect(numberPosting.ok).toBe(false);
    if (!numberPosting.ok) {
      expect(numberPosting.reason).toBe("wrong-type");
      expect(numberPosting.status).toBe(400);
    }
    const missingTitle = validateDecodeInput({ posting: "Do wireframing." });
    expect(missingTitle.ok).toBe(false);
    if (!missingTitle.ok) expect(missingTitle.reason).toBe("wrong-type");
  });

  it("rejects an oversized posting before trimming, as too large", () => {
    // All whitespace and over the cap: it must be rejected as too-long, not slip past as
    // empty, so the matcher never sees it.
    const check = validateDecodeInput({ title: "UX Designer", posting: " ".repeat(MAX_POSTING + 1) });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.reason).toBe("too-long");
      expect(check.status).toBe(413);
    }
  });

  it("rejects an oversized title", () => {
    const check = validateDecodeInput({ title: "a".repeat(MAX_TITLE + 1), posting: "Do wireframing." });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("too-long");
  });

  it("accepts a posting exactly at the limit", () => {
    const check = validateDecodeInput({ title: "UX Designer", posting: "x".repeat(MAX_POSTING) });
    expect(check.ok).toBe(true);
  });

  it("rejects a blank posting", () => {
    const check = validateDecodeInput({ title: "UX Designer", posting: "   \n\t  " });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.reason).toBe("empty-posting");
      expect(check.status).toBe(400);
    }
  });

  it("ignores extra fields on the body, binding only title and posting", () => {
    const check = validateDecodeInput({
      title: "UX Designer",
      posting: "Do wireframing.",
      isAdmin: true,
      role: "superuser",
      __proto__: { polluted: true },
    });
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(Object.keys(check.value).sort()).toEqual(["posting", "title"]);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    }
  });
});
