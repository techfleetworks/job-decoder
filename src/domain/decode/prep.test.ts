import { describe, expect, it } from "vitest";
import { buildPrepGuide } from "@/domain/decode";
import type { PrepLookups } from "@/domain/decode/prep";
import type { DecodeResult, DutyDetail, SkillInfo, SnapshotItem } from "@/domain/decode/types";

const duties: DutyDetail[] = [
  { slug: "ux-design", name: "UX Design", description: "", whyImportant: "Design shapes the work.", skillsRequired: ["figma-skill", "collaboration", "data-analysis"], foundationalSkills: ["figma-skill"], activities: ["wireframing"], deliverables: ["wireframes"], tools: ["figma"] },
  { slug: "ux-research", name: "UX Research", description: "", whyImportant: "Research grounds the work.", skillsRequired: ["interviewing"], foundationalSkills: ["interviewing"], activities: ["user-research"], deliverables: ["research-report"], tools: [] },
  { slug: "product-mgmt", name: "Product Management", description: "", whyImportant: "PM steers the work.", skillsRequired: ["roadmapping"], foundationalSkills: ["roadmapping"], activities: [], deliverables: ["product-roadmap"], tools: [] },
];

const skills: SkillInfo[] = [
  { slug: "figma-skill", name: "Figma Skill", type: "Technical" },
  { slug: "collaboration", name: "Collaboration", type: "Interpersonal" },
  { slug: "interviewing", name: "Interviewing", type: "Technical" },
  { slug: "roadmapping", name: "Roadmapping", type: "Technical" },
  { slug: "data-analysis", name: "Data Analysis", type: "Technical" },
];

const items: SnapshotItem[] = [
  { slug: "wireframing", type: "activity", label: "Wireframing", aliases: [], duties: ["ux-design"], skills: ["figma-skill", "collaboration"], deliverables: ["wireframes"] },
  { slug: "user-research", type: "activity", label: "User Research", aliases: [], duties: ["ux-research"], skills: ["interviewing"], deliverables: ["research-report"] },
  { slug: "wireframes", type: "deliverable", label: "Wireframes", aliases: [], duties: ["ux-design"], whyImportant: "shows the layout early" },
  { slug: "research-report", type: "deliverable", label: "Research Report", aliases: [], duties: ["ux-research"] },
  { slug: "product-roadmap", type: "deliverable", label: "Product Roadmap", aliases: [], duties: ["product-mgmt"] },
  { slug: "figma", type: "tool", label: "Figma", aliases: [], duties: ["ux-design"] },
];

const lookups: PrepLookups = { duties, skills, items };

const result: DecodeResult = {
  functionSlug: "ux-designer",
  functionName: "UX Designer",
  covered: [{ slug: "ux-design", name: "UX Design", description: "" }],
  missing: [{ slug: "ux-research", name: "UX Research", description: "" }],
  nonStandard: [{ slug: "product-mgmt", name: "Product Management" }],
  matched: [
    { slug: "wireframing", type: "activity", label: "Wireframing", tier: "exact", term: "wireframing", via: ["keyword"], duties: ["ux-design"], quote: "do wireframing" },
  ],
  pct: 0.5,
  pctWhole: 50,
  verdict: "partial",
  standardCount: 2,
  coverage: [],
  linesAudited: 0,
  linesMatched: 0,
  unplaced: [],
};

describe("buildPrepGuide", () => {
  it("returns null when the title is not covered", () => {
    expect(buildPrepGuide({ ...result, verdict: "not-covered" }, lookups)).toBeNull();
  });

  it("splits technical and interpersonal skills by Skill Type, from the full pool", () => {
    const g = buildPrepGuide(result, lookups)!;
    expect(g.technicalSkills.map((s) => s.slug).sort()).toEqual(["data-analysis", "figma-skill", "interviewing", "roadmapping"]);
    expect(g.interpersonalSkills.map((s) => s.slug)).toEqual(["collaboration"]);
  });

  it("flags key skills and keeps a required-only skill as non-key (accordion)", () => {
    const g = buildPrepGuide(result, lookups)!;
    const all = [...g.technicalSkills, ...g.interpersonalSkills];
    for (const s of all) expect(typeof s.key).toBe("boolean");
    expect(g.technicalSkills.find((s) => s.slug === "figma-skill")!.key).toBe(true);
    // data-analysis is required by the duty but not foundational or on a matched activity.
    expect(g.technicalSkills.find((s) => s.slug === "data-analysis")!.key).toBe(false);
  });

  it("each skill lists every hat it serves and traces to a source field", () => {
    const g = buildPrepGuide(result, lookups)!;
    const figma = g.technicalSkills.find((s) => s.slug === "figma-skill")!;
    expect(figma.hats.some((h) => h.slug === "ux-design")).toBe(true);
    expect(figma.sourceField.length).toBeGreaterThan(0);
  });

  it("cover letter points carry the hat's deliverables", () => {
    const g = buildPrepGuide(result, lookups)!;
    const uxd = g.coverLetterPoints.find((p) => p.hatSlug === "ux-design")!;
    expect(uxd.deliverables).toContain("Wireframes");
  });

  it("highlights matched activities first, with their quote", () => {
    const g = buildPrepGuide(result, lookups)!;
    const wf = g.activities.find((a) => a.slug === "wireframing")!;
    expect(wf.matched).toBe(true);
    expect(wf.quote).toBe("do wireframing");
  });

  it("builds an outcome template seeded from the framework, with blanks", () => {
    const g = buildPrepGuide(result, lookups)!;
    const t = g.outcomeTemplates.find((o) => o.activitySlug === "wireframing")!;
    expect(t.template).toBe("Wireframing ____, which resulted in Wireframes ____, so that ____.");
    expect(t.hint).toBe("shows the layout early");
  });

  it("dedupes ATS keywords, each in its highest group", () => {
    const g = buildPrepGuide(result, lookups)!;
    const all = g.atsKeywords.flatMap((grp) => grp.keywords.map((k) => k.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  it("orders cover letter points hidden-hat first", () => {
    const g = buildPrepGuide(result, lookups)!;
    expect(g.coverLetterPoints[0]!.hatSet).toBe("hidden");
  });

  it("frames a non-standard hat as a question to ask", () => {
    const g = buildPrepGuide(result, lookups)!;
    const pm = g.interviewPoints.find((p) => p.hatSlug === "product-mgmt")!;
    expect(pm.text).toMatch(/ask how much of the role is/i);
  });

  it("tells a matched hat which deliverable to be ready to show", () => {
    const g = buildPrepGuide(result, lookups)!;
    const uxd = g.interviewPoints.find((p) => p.hatSlug === "ux-design")!;
    expect(uxd.text).toMatch(/be ready to show Wireframes/i);
  });
});
