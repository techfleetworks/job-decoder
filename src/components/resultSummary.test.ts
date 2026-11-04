import { describe, expect, it } from "vitest";
import { GROUP_HEADINGS, isBasicRead, matchSummary, tierWording, verdictCounts, verdictHeadline } from "@/components/resultSummary";
import type { DecodeResult, Match } from "@/domain/decode/types";

const base: DecodeResult = {
  functionSlug: "ux-designer",
  functionName: "UX Designer",
  covered: [{ slug: "a", name: "A", description: "", score: 1, scoreWhole: 100, level: "full" }],
  missing: [],
  nonStandard: [],
  matched: [],
  pct: 0.5,
  pctWhole: 50,
  verdict: "partial",
  standardCount: 2,
  coverage: [],
  linesAudited: 0,
  linesMatched: 0,
  unplaced: [],
};

const kw: Match = { slug: "x", type: "activity", label: "X", tier: "exact", term: "x", via: ["keyword"], duties: [] };

describe("resultSummary", () => {
  it("headline reflects the verdict", () => {
    expect(verdictHeadline({ ...base, verdict: "strong" })).toMatch(/fits the title well/i);
    expect(verdictHeadline({ ...base, verdict: "not-covered" })).toMatch(/do not cover/i);
  });

  it("is a basic read only when no AI match contributed", () => {
    expect(isBasicRead({ ...base, matched: [kw] })).toBe(true);
    expect(isBasicRead({ ...base, matched: [{ ...kw, via: ["keyword", "llm"] }] })).toBe(false);
  });

  it("match summary shows the percent, or says not covered", () => {
    expect(matchSummary(base)).toMatch(/50%/);
    expect(matchSummary({ ...base, verdict: "not-covered" })).toMatch(/not in the framework/i);
  });

  it("tier wording reads plainly for each tier", () => {
    expect(tierWording("exact")).toBe("exact wording");
    expect(tierWording("alias")).toBe("a known phrasing");
    expect(tierWording("similar")).toBe("close wording");
  });

  it("verdict counts label the covered, hidden, and extra hats (match-level wording, ADR-0039)", () => {
    const result: DecodeResult = {
      ...base,
      covered: [
        { slug: "a", name: "A", description: "", score: 1, scoreWhole: 100, level: "full" },
        { slug: "b", name: "B", description: "", score: 0.1, scoreWhole: 10, level: "partial" },
      ],
      missing: [{ slug: "c", name: "C", description: "", score: 0, scoreWhole: 0, level: "none" }],
      nonStandard: [{ slug: "d", name: "D", score: 1, scoreWhole: 100, level: "full" }],
    };
    expect(verdictCounts(result)).toEqual([
      { label: "Hats covered", count: 2 },
      { label: "Hidden hats", count: 1 },
      { label: "Extra hats", count: 1 },
    ]);
  });

  it("group headings state the match-level cutoffs (ADR-0039)", () => {
    expect(GROUP_HEADINGS.full).toMatch(/fully covered/i);
    expect(GROUP_HEADINGS.full).toMatch(/25% or more/);
    expect(GROUP_HEADINGS.partial).toMatch(/partly covered/i);
    expect(GROUP_HEADINGS.partial).toMatch(/under 25%/);
  });
});
