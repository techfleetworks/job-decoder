import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { buildPrepGuide } from "../../src/domain/decode/prep";
import { projectPrep } from "../../src/domain/decode/prepByHat";
import type { PrepLookups } from "../../src/domain/decode/prep";
import type { DecodeResult, DutyDetail, SkillInfo, SnapshotItem } from "../../src/domain/decode/types";

const duties: DutyDetail[] = [
  { slug: "ux-design", name: "UX Design", description: "", whyImportant: "Design shapes the work.", skillsRequired: ["figma-skill", "collaboration"], foundationalSkills: ["figma-skill"], activities: ["wireframing"], deliverables: ["wireframes"], tools: ["figma"] },
  { slug: "ux-research", name: "UX Research", description: "", whyImportant: "Research grounds the work.", skillsRequired: ["interviewing"], foundationalSkills: ["interviewing"], activities: ["user-research"], deliverables: ["research-report"], tools: [] },
  { slug: "product-mgmt", name: "Product Management", description: "", whyImportant: "PM steers the work.", skillsRequired: ["roadmapping"], foundationalSkills: ["roadmapping"], activities: [], deliverables: ["product-roadmap"], tools: [] },
];
const skills: SkillInfo[] = [
  { slug: "figma-skill", name: "Figma Skill", type: "Technical" },
  { slug: "collaboration", name: "Collaboration", type: "Interpersonal" },
  { slug: "interviewing", name: "Interviewing", type: "Technical" },
  { slug: "roadmapping", name: "Roadmapping", type: "Technical" },
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

function result(over: Partial<DecodeResult>): DecodeResult {
  return {
    functionSlug: "ux-designer",
    functionName: "UX Designer",
    covered: [{ slug: "ux-design", name: "UX Design", description: "", score: 1, scoreWhole: 100, level: "full" }],
    missing: [{ slug: "ux-research", name: "UX Research", description: "", score: 0, scoreWhole: 0, level: "none" }],
    nonStandard: [{ slug: "product-mgmt", name: "Product Management", score: 1, scoreWhole: 100, level: "full" }],
    matched: [{ slug: "wireframing", type: "activity", label: "Wireframing", tier: "exact", term: "wireframing", via: ["keyword"], duties: ["ux-design"], quote: "do wireframing" }],
    pct: 0.5, pctWhole: 50, verdict: "partial", standardCount: 2, coverage: [], linesAudited: 0, linesMatched: 0, unplaced: [],
    ...over,
  };
}

Given("a decoded posting with matched, hidden, and non-standard hats", function () {
  this.result = result({});
});
Given("a decoded posting with no non-standard hats", function () {
  this.result = result({ nonStandard: [] });
});
Given("a decode for a title the framework does not cover", function () {
  this.result = result({ verdict: "not-covered", functionSlug: null, functionName: null, covered: [], missing: [], nonStandard: [] });
});

When("the prep guide is built", function () {
  this.guide = buildPrepGuide(this.result, lookups);
});
When("the prep guide is projected per hat", function () {
  this.guide = buildPrepGuide(this.result, lookups);
  this.prep = projectPrep(this.guide);
});

Then("technical and interpersonal skills are listed separately, each tied to a hat", function () {
  assert.ok(this.guide.technicalSkills.length > 0);
  assert.ok(this.guide.interpersonalSkills.length > 0);
  for (const s of [...this.guide.technicalSkills, ...this.guide.interpersonalSkills]) {
    assert.ok(Array.isArray(s.hats) && s.hats.length > 0);
  }
});
Then("the cover letter points lead with the hidden hat", function () {
  assert.equal(this.guide.coverLetterPoints[0].hatSet, "hidden");
});
Then("a matched activity has an action, result, and impact template with blanks to fill", function () {
  const t = this.guide.outcomeTemplates.find((o: { activitySlug: string }) => o.activitySlug === "wireframing");
  assert.ok(t, "no outcome template for the matched activity");
  assert.match(t.template, /____/);
});
Then("every ATS keyword appears once across the groups", function () {
  const all = this.guide.atsKeywords.flatMap((g: { keywords: string[] }) => g.keywords.map((k) => k.toLowerCase()));
  assert.equal(new Set(all).size, all.length);
});
Then("no interview point is for a non-standard hat", function () {
  assert.ok(this.guide.interviewPoints.every((p: { hatSet: string }) => p.hatSet !== "non-standard"));
});
Then("there is no prep guide", function () {
  assert.equal(this.guide, null);
});
Then("every skill, activity, and deliverable names the hat it came from", function () {
  for (const s of [...this.guide.technicalSkills, ...this.guide.interpersonalSkills]) assert.ok(s.hats.length > 0);
  for (const a of this.guide.activities) assert.ok(a.hatSlug);
  for (const d of this.guide.deliverables) assert.ok(d.hatSlug);
});
Then("the highlights, cover, and interview steps all lead with a hidden hat", function () {
  assert.equal(this.prep.highlights[0].hat.set, "hidden");
  assert.equal(this.prep.cover[0].hat.set, "hidden");
  assert.equal(this.prep.interview[0].hat.set, "hidden");
});
Then("every per-hat card carries a status set", function () {
  const sets = ["hidden", "matched", "non-standard"];
  const cards = [
    ...this.prep.skills.byHat,
    ...this.prep.highlights,
    ...this.prep.cover,
    ...this.prep.interview,
  ];
  assert.ok(cards.length > 0);
  for (const c of cards) assert.ok(sets.includes(c.hat.set), `unexpected hat set ${c.hat.set}`);
});
Then("a named-in-the-posting skill shows a quote from the posting", function () {
  assert.ok(this.prep.skills.namedInPosting.length > 0, "no named-in-the-posting skills");
  assert.ok(
    this.prep.skills.namedInPosting.some((n: { quote?: string }) => typeof n.quote === "string" && n.quote.length > 0),
    "no named-in-the-posting skill carried a quote",
  );
});
Then("the non-standard cover card shows no deliverable chips", function () {
  const ns = this.prep.cover.find((c: { hat: { set: string } }) => c.hat.set === "non-standard");
  assert.ok(ns, "no non-standard cover card");
  assert.equal(ns.deliverables.length, 0);
});
