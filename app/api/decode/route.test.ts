import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the route's composition and resilience with the server adapters mocked, so the
// rate-limit behaviour (429 over the cap; fail-closed on the LLM when the rate check cannot
// run, ADR-0009 / ADR-0043) is proven, not just asserted in prose.

const hit = vi.hoisted(() => vi.fn());

vi.mock("@/data/server/openrouter", () => ({ recognizeMatches: vi.fn(async () => []) }));
vi.mock("@/data/server/snapshot", () => ({
  loadTitles: () => ({ titles: { "ux designer": "ux-designer" }, functions: [{ slug: "ux-designer", name: "UX Designer" }] }),
  loadSlice: () => ({
    function: { slug: "ux-designer", name: "UX Designer", description: "" },
    standardHats: [{ slug: "ux-design", name: "UX Design", description: "" }],
  }),
  loadItems: () => [{ slug: "wireframing", type: "activity", label: "Wireframing", aliases: [], duties: ["ux-design"] }],
  loadDutyNames: () => ({ "ux-design": "UX Design" }),
  loadDuties: () => [
    { slug: "ux-design", name: "UX Design", description: "", whyImportant: "", skillsRequired: [], foundationalSkills: [], activities: ["wireframing"], deliverables: [], tools: [] },
  ],
  loadSkills: () => [],
  SnapshotMissingError: class SnapshotMissingError extends Error {},
}));
vi.mock("@/data/server/rateLimitStore", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return { ...actual, rateLimitStore: { hit } };
});

import { POST } from "./route";
import { recognizeMatches } from "@/data/server/openrouter";
import { NextRequest } from "next/server";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/decode", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.5" },
    body: JSON.stringify(body),
  });
}

const valid = { title: "UX Designer", posting: "We do Wireframing." };

beforeEach(() => {
  hit.mockReset();
  vi.mocked(recognizeMatches).mockClear();
});

describe("POST /api/decode rate limiting", () => {
  it("returns 429 with Retry-After when the client is over the limit", async () => {
    hit.mockResolvedValue(9999);
    const res = await POST(req(valid));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(recognizeMatches).not.toHaveBeenCalled();
  });

  it("skips the LLM and serves the keyword decode when the rate check cannot run (fail closed on the paid call)", async () => {
    hit.mockRejectedValue(new Error("store down"));
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    expect(recognizeMatches).not.toHaveBeenCalled();
  });

  it("runs the LLM step on a normal within-limit request", async () => {
    hit.mockResolvedValue(1);
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    expect(recognizeMatches).toHaveBeenCalledTimes(1);
  });
});
