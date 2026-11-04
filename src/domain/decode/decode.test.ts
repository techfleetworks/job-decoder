// Unit tests for the pure decode domain. No snapshot, no I/O: small hand-built fixtures
// prove the matcher tiers, the roll-up and classification, the verdict bands, line
// accountability, and the never-guess rule when a title is not covered.
import { describe, expect, it } from "vitest";
import { decode, isDecodeResult, keywordMatch, resolveTitle, unionMatches } from "@/domain/decode";
import type { FunctionSlice, Match, SnapshotItem, SnapshotTitles } from "@/domain/decode/types";

const items: SnapshotItem[] = [
  { slug: "wireframing", type: "activity", label: "Wireframing", aliases: ["wireframes"], duties: ["ux-design"] },
  { slug: "prototype-creation", type: "activity", label: "Prototype Creation", aliases: ["prototyping"], duties: ["ux-design"] },
  { slug: "user-research", type: "activity", label: "User Research", aliases: [], duties: ["ux-research"] },
  { slug: "product-roadmap", type: "deliverable", label: "Product Roadmap", aliases: [], duties: ["product-mgmt"] },
];

const slice: FunctionSlice = {
  function: { slug: "ux-designer", name: "UX Designer", description: "" },
  standardHats: [
    { slug: "ux-design", name: "UX Design", description: "" },
    { slug: "ux-research", name: "UX Research", description: "" },
  ],
};

const dutyNames = { "ux-design": "UX Design", "ux-research": "UX Research", "product-mgmt": "Product Management" };

describe("keywordMatch tiers", () => {
  it("matches the whole label on a line (exact)", () => {
    const { matches } = keywordMatch("We do Wireframing daily.", items);
    expect(matches.find((m) => m.slug === "wireframing")?.tier).toBe("exact");
  });

  it("matches a reviewed alias phrase (alias)", () => {
    const { matches } = keywordMatch("Lots of prototyping here.", items);
    const m = matches.find((x) => x.slug === "prototype-creation");
    expect(m?.tier).toBe("alias");
    expect(m?.term).toBe("prototyping");
  });

  it("does not match a label whose tokens are scattered across lines", () => {
    const { matches } = keywordMatch("We value the user.\nWe publish research.", items);
    expect(matches.find((m) => m.slug === "user-research")).toBeUndefined();
  });
});

describe("unionMatches", () => {
  it("merges sources and keeps the stronger tier and the quote", () => {
    const kw: Match[] = [{ slug: "wireframing", type: "activity", label: "Wireframing", tier: "similar", term: "wireframing", via: ["keyword"], duties: ["ux-design"] }];
    const llm: Match[] = [{ slug: "wireframing", type: "activity", label: "Wireframing", tier: "exact", term: "wireframing", via: ["llm"], duties: ["ux-design"], quote: "build wireframes" }];
    const [m] = unionMatches(kw, llm);
    expect(m!.via.sort()).toEqual(["keyword", "llm"]);
    expect(m!.tier).toBe("exact");
    expect(m!.quote).toBe("build wireframes");
  });
});

describe("decode", () => {
  it("classifies covered, missing, and non-standard hats, strong verdict", () => {
    const posting = "You will do Wireframing and User Research.\nAlso own the Product Roadmap.";
    const r = decode({ posting, items, slice, dutyNames });
    expect(r.functionSlug).toBe("ux-designer");
    expect(r.covered.map((h) => h.slug).sort()).toEqual(["ux-design", "ux-research"]);
    expect(r.missing).toHaveLength(0);
    expect(r.nonStandard.map((h) => h.slug)).toContain("product-mgmt");
    expect(r.nonStandard.find((h) => h.slug === "product-mgmt")?.name).toBe("Product Management");
    expect(r.pctWhole).toBe(100);
    expect(r.verdict).toBe("strong");
  });

  it("reports a missing hat and a partial verdict", () => {
    const r = decode({ posting: "You will do Wireframing.", items, slice, dutyNames });
    expect(r.covered.map((h) => h.slug)).toEqual(["ux-design"]);
    expect(r.missing.map((h) => h.slug)).toEqual(["ux-research"]);
    expect(r.pctWhole).toBe(50);
    expect(r.verdict).toBe("partial");
  });

  it("returns not-covered and never guesses when the title is unknown", () => {
    const r = decode({ posting: "Wireframing.", items, slice: null, dutyNames });
    expect(r.verdict).toBe("not-covered");
    expect(r.functionSlug).toBeNull();
    expect(r.covered).toHaveLength(0);
    expect(r.linesAudited).toBeGreaterThan(0);
  });

  it("accounts for every posting line (matched + unplaced = all)", () => {
    const posting = "You will do Wireframing.\nUnrelated sentence here.";
    const r = decode({ posting, items, slice, dutyNames });
    expect(r.linesMatched + r.unplaced.length).toBe(r.linesAudited);
  });
});

describe("proportional scoring (ADR-0039)", () => {
  // business-analysis owns 4 activities, product-mgmt owns 5 deliverables, graphic-design
  // owns only a tool, and one activity rolls up to the degenerate "everyone" duty.
  const scoreItems: SnapshotItem[] = [
    { slug: "ba-a1", type: "activity", label: "Requirements Gathering", aliases: [], duties: ["business-analysis"] },
    { slug: "ba-a2", type: "activity", label: "Process Mapping", aliases: [], duties: ["business-analysis"] },
    { slug: "ba-a3", type: "activity", label: "Stakeholder Interviews", aliases: [], duties: ["business-analysis"] },
    { slug: "ba-a4", type: "activity", label: "Gap Analysis", aliases: [], duties: ["business-analysis"] },
    { slug: "pm-d1", type: "deliverable", label: "Product Roadmap", aliases: [], duties: ["product-mgmt"] },
    { slug: "pm-d2", type: "deliverable", label: "Release Plan", aliases: [], duties: ["product-mgmt"] },
    { slug: "pm-d3", type: "deliverable", label: "Backlog Report", aliases: [], duties: ["product-mgmt"] },
    { slug: "pm-d4", type: "deliverable", label: "Metrics Dashboard", aliases: [], duties: ["product-mgmt"] },
    { slug: "pm-d5", type: "deliverable", label: "Launch Checklist", aliases: [], duties: ["product-mgmt"] },
    { slug: "figma", type: "tool", label: "Figma", aliases: [], duties: ["graphic-design"] },
    { slug: "presentations", type: "activity", label: "Creating Presentations", aliases: [], duties: ["everyone"] },
  ];
  const names = {
    "business-analysis": "Business Analysis",
    "product-mgmt": "Product Management",
    "graphic-design": "Graphic Design",
  };
  const sliceOf = (hat: string, name: string): FunctionSlice => ({
    function: { slug: "fn", name: "Fn", description: "" },
    standardHats: [{ slug: hat, name, description: "" }],
  });

  it("is full at exactly 25% (1 of 4 items), lone full gives Formula D 100%", () => {
    const r = decode({ posting: "We do Requirements Gathering.", items: scoreItems, slice: sliceOf("business-analysis", "Business Analysis"), dutyNames: names });
    const ba = r.covered.find((h) => h.slug === "business-analysis");
    expect(ba?.scoreWhole).toBe(25);
    expect(ba?.level).toBe("full");
    expect(r.missing).toHaveLength(0);
    expect(r.pctWhole).toBe(100);
    expect(r.verdict).toBe("strong");
  });

  it("is partial below 25% (1 of 5 items), a lone partial gives Formula D 50%", () => {
    const r = decode({ posting: "You own the Product Roadmap.", items: scoreItems, slice: sliceOf("product-mgmt", "Product Management"), dutyNames: names });
    const pm = r.covered.find((h) => h.slug === "product-mgmt");
    expect(pm?.scoreWhole).toBe(20);
    expect(pm?.level).toBe("partial");
    expect(r.pctWhole).toBe(50);
    expect(r.verdict).toBe("partial");
  });

  it("a tool alone confers no hat (none), so it never becomes covered or non-standard", () => {
    const r = decode({ posting: "We use Figma every day.", items: scoreItems, slice: sliceOf("graphic-design", "Graphic Design"), dutyNames: names });
    expect(r.matched.some((m) => m.slug === "figma")).toBe(true); // the tool still matches as an item
    expect(r.covered).toHaveLength(0);
    expect(r.missing.map((h) => h.slug)).toEqual(["graphic-design"]);
    expect(r.missing[0]?.level).toBe("none");
    expect(r.nonStandard).toHaveLength(0);
    expect(r.verdict).toBe("mismatch");
  });

  it("the everyone duty never scores and never appears as a hat", () => {
    const r = decode({ posting: "Lots of Creating Presentations here.", items: scoreItems, slice: sliceOf("business-analysis", "Business Analysis"), dutyNames: names });
    expect(r.matched.some((m) => m.slug === "presentations")).toBe(true);
    expect(r.nonStandard).toHaveLength(0);
    expect([...r.covered, ...r.missing].some((h) => h.slug === "everyone")).toBe(false);
    expect(r.nonStandard.some((h) => h.slug === "everyone")).toBe(false);
  });
});

describe("resolveTitle", () => {
  const titles: SnapshotTitles = {
    titles: { "ux designer": "ux-designer" },
    functions: [{ slug: "ux-designer", name: "UX Designer" }],
  };
  it("resolves a known title and returns null for an unknown one", () => {
    expect(resolveTitle(titles, "UX Designer")).toBe("ux-designer");
    expect(resolveTitle(titles, "Astronaut")).toBeNull();
  });
});

describe("isDecodeResult", () => {
  // A minimal value with every field the guard requires.
  const base = {
    verdict: "strong",
    covered: [],
    missing: [],
    nonStandard: [],
    matched: [],
    coverage: [],
    pctWhole: 50,
  };
  // Every list the prep screen reads back.
  const prepGuide = {
    technicalSkills: [],
    interpersonalSkills: [],
    activities: [],
    deliverables: [],
    outcomeTemplates: [],
    atsKeywords: [],
    coverLetterPoints: [],
    interviewPoints: [],
  };

  it("accepts a well-shaped result, with or without a prep guide", () => {
    expect(isDecodeResult(base)).toBe(true);
    expect(isDecodeResult({ ...base, prepGuide: null })).toBe(true);
    expect(isDecodeResult({ ...base, prepGuide })).toBe(true);
  });

  it("rejects a result missing a required field", () => {
    const { coverage: _omit, ...withoutCoverage } = base;
    expect(isDecodeResult(withoutCoverage)).toBe(false);
    expect(isDecodeResult({ ...base, verdict: "nonsense" })).toBe(false);
    expect(isDecodeResult(null)).toBe(false);
  });

  // The fail-closed branch F1 added: a stale-shape prep guide is rejected with the whole
  // scan, so the prep screen never dereferences a missing list after a cross-deploy restore.
  it("rejects a result whose prep guide is a stale shape", () => {
    const { atsKeywords: _dropped, ...staleGuide } = prepGuide;
    expect(isDecodeResult({ ...base, prepGuide: staleGuide })).toBe(false);
    expect(isDecodeResult({ ...base, prepGuide: "not-an-object" })).toBe(false);
  });
});
