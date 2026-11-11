import { describe, expect, it } from "vitest";
import { unionMatches } from "./match";
import type { Match } from "./types";

// Meaning-confirmation, mechanism B (ADR-0047): after union, a match is confirmed iff the
// recognizer recognized it (its sources include "llm"). A keyword/alias/similar match the
// recognizer did not also recognize is unconfirmed. The flag is set once, at union, so the
// two decode twins compute it identically.
const kw = (slug: string): Match => ({
  slug,
  type: "activity",
  label: slug,
  tier: "exact",
  term: slug,
  via: ["keyword"],
  duties: [],
});
const llm = (slug: string): Match => ({
  slug,
  type: "activity",
  label: slug,
  tier: "exact",
  term: slug,
  via: ["llm"],
  duties: [],
  quote: "q",
});

describe("unionMatches meaning-confirmation (ADR-0047 mechanism B)", () => {
  it("confirms only matches the recognizer recognized, leaving keyword-only matches unconfirmed", () => {
    const out = unionMatches([kw("a"), kw("b")], [llm("b"), llm("c")]);
    const find = (slug: string) => out.find((m) => m.slug === slug);

    expect(find("a")?.confirmed).toBe(false); // keyword only: recognizer did not confirm
    expect(find("b")?.confirmed).toBe(true); // keyword + recognizer
    expect(find("c")?.confirmed).toBe(true); // recognizer only

    // b was found both ways, so its sources carry both and it keeps a confirmed verdict.
    expect(find("b")?.via).toContain("keyword");
    expect(find("b")?.via).toContain("llm");
  });

  it("marks every match unconfirmed when the recognizer did not run (basic read)", () => {
    const out = unionMatches([kw("a"), kw("b")], []);
    expect(out.every((m) => m.confirmed === false)).toBe(true);
  });
});
