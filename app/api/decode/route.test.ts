// Integration test for the decode route against the real built snapshot (ensured by the
// vitest global setup). It checks a covered title decodes, bad input is rejected, and an
// unknown title reports not-covered rather than guessing.
import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "./route";

function post(body: unknown): Promise<Response> {
  const req = new Request("http://localhost/api/decode", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return POST(req as unknown as NextRequest) as unknown as Promise<Response>;
}

describe("POST /api/decode", () => {
  it("decodes a covered title against the real snapshot", async () => {
    const res = await post({
      title: "UX Designer",
      posting: "You will do wireframing and user research for our product.",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.functionSlug).toBe("ux-designer");
    expect(["strong", "partial", "mismatch"]).toContain(body.verdict);
    expect(Array.isArray(body.covered)).toBe(true);
    expect(body.linesMatched + body.unplaced.length).toBe(body.linesAudited);
  });

  it("rejects an empty posting with 400", async () => {
    const res = await post({ title: "UX Designer", posting: "   " });
    expect(res.status).toBe(400);
  });

  it("rejects a non-JSON body with 400", async () => {
    const res = await post("not json at all");
    expect(res.status).toBe(400);
  });

  it("reports not-covered for an unknown title and still returns 200", async () => {
    const res = await post({ title: "Astronaut", posting: "Wireframing and research." });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe("not-covered");
    expect(body.functionSlug).toBeNull();
  });
});
