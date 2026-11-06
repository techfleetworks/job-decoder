import { describe, expect, it } from "vitest";
import { PILL_BY_SET, projectPrep } from "@/domain/decode";
import type { PrepGuide } from "@/domain/decode";

// A focused guide with one hat of each set (hidden -> matched -> non-standard) and skills
// that exercise every per-hat role, so the projection's grouping is pinned in isolation.
const guide: PrepGuide = {
  technicalSkills: [
    {
      slug: "interaction-design",
      label: "Interaction Design",
      type: "Technical",
      hats: [{ slug: "ux-design", name: "UX Design", set: "matched", role: "needed" }],
      sourceField: "a posting-named activity",
      key: true,
    },
    {
      slug: "systems-thinking",
      label: "Systems Thinking",
      type: "Technical",
      hats: [
        { slug: "graphic-design", name: "Graphic Design", set: "hidden", role: "foundational" },
        { slug: "ux-design", name: "UX Design", set: "matched", role: "foundational" },
      ],
      sourceField: "Foundational Skills",
      key: true,
    },
    {
      slug: "apis",
      label: "APIs",
      type: "Technical",
      hats: [{ slug: "development", name: "Development", set: "non-standard", role: "required" }],
      sourceField: "Skills Required For the Duty",
      key: false,
    },
  ],
  interpersonalSkills: [
    {
      slug: "collaboration",
      label: "Collaboration",
      type: "Interpersonal",
      hats: [{ slug: "development", name: "Development", set: "non-standard", role: "needed" }],
      sourceField: "a posting-named activity",
      key: true,
    },
  ],
  activities: [
    { slug: "wireframing", label: "Wireframing", entity: "activity", hatSlug: "ux-design", hatSet: "matched", matched: true, quote: "create wireframes" },
    { slug: "design-system", label: "Design System", entity: "activity", hatSlug: "ux-design", hatSet: "matched", matched: false },
    { slug: "icon-creation", label: "Icon and Logo Creation", entity: "activity", hatSlug: "graphic-design", hatSet: "hidden", matched: false },
    { slug: "front-end-coding", label: "Front-End Coding", entity: "activity", hatSlug: "development", hatSet: "non-standard", matched: true, quote: "write production React" },
  ],
  deliverables: [],
  outcomeTemplates: [
    { activitySlug: "wireframing", activityLabel: "Wireframing", hatSlug: "ux-design", hatSet: "matched", deliverableLabel: "Wireframes", template: "Wireframing ____, which resulted in Wireframes ____, so that ____.", hint: "shows the layout" },
    { activitySlug: "icon-creation", activityLabel: "Icon and Logo Creation", hatSlug: "graphic-design", hatSet: "hidden", deliverableLabel: null, template: "Icon and Logo Creation ____, so that ____.", hint: "" },
  ],
  atsKeywords: [{ group: "Hats", keywords: ["UX Design"] }],
  coverLetterPoints: [
    { hatSlug: "graphic-design", hatName: "Graphic Design", hatSet: "hidden", text: "Design carries the brand.", deliverables: ["Logo and Brand Assets"] },
    { hatSlug: "ux-design", hatName: "UX Design", hatSet: "matched", text: "Design shapes the work.", deliverables: ["Wireframes"] },
    { hatSlug: "development", hatName: "Development", hatSet: "non-standard", text: "Ask how much is Development.", deliverables: ["App Code"] },
  ],
  interviewPoints: [
    { hatSlug: "graphic-design", hatName: "Graphic Design", hatSet: "hidden", text: "Be ready to discuss Graphic Design." },
    { hatSlug: "ux-design", hatName: "UX Design", hatSet: "matched", text: "Be ready to show Wireframes." },
    { hatSlug: "development", hatName: "Development", hatSet: "non-standard", text: "Ask how much of the role is Development (they named Front-End Coding)." },
  ],
};

describe("projectPrep", () => {
  it("maps each hat set to the prototype's status pill wording", () => {
    expect(PILL_BY_SET.hidden).toBe("Expected but missing");
    expect(PILL_BY_SET.matched).toBe("Matched");
    expect(PILL_BY_SET["non-standard"]).toBe("Not standard");
  });

  it("names the posting-sourced skills with a grounded quote from the hat's matched work", () => {
    const { skills } = projectPrep(guide);
    const named = skills.namedInPosting;
    const ixn = named.find((n) => n.slug === "interaction-design")!;
    expect(ixn.quote).toBe("create wireframes");
    expect(ixn.hats.map((h) => h.slug)).toEqual(["ux-design"]);
    const collab = named.find((n) => n.slug === "collaboration")!;
    expect(collab.quote).toBe("write production React");
    // A foundational-only skill is never "named in the posting".
    expect(named.some((n) => n.slug === "systems-thinking")).toBe(false);
  });

  it("lists a multi-hat, non-named skill once under Shared, with its hats in order", () => {
    const { skills } = projectPrep(guide);
    const shared = skills.shared;
    const st = shared.find((s) => s.slug === "systems-thinking")!;
    expect(st.hats.map((h) => h.slug)).toEqual(["graphic-design", "ux-design"]);
    // A named skill and a single-hat skill are not in Shared.
    expect(shared.some((s) => s.slug === "interaction-design")).toBe(false);
    expect(shared.some((s) => s.slug === "apis")).toBe(false);
  });

  it("splits each By-Hat card into Needed and Foundational, with every skill in All", () => {
    const { skills } = projectPrep(guide);
    const byHat = skills.byHat;
    expect(byHat.map((c) => c.hat.slug)).toEqual(["graphic-design", "ux-design", "development"]);
    const uxd = byHat.find((c) => c.hat.slug === "ux-design")!;
    expect(uxd.needed.map((c) => c.slug)).toEqual(["interaction-design"]);
    expect(uxd.foundational.map((c) => c.slug)).toEqual(["systems-thinking"]);
    expect(uxd.all.map((c) => c.slug).sort()).toEqual(["interaction-design", "systems-thinking"]);
    const dev = byHat.find((c) => c.hat.slug === "development")!;
    expect(dev.needed.map((c) => c.slug)).toEqual(["collaboration"]);
    // A required-only skill shows only in All (the accordion), never as Needed/Foundational.
    expect(dev.all.map((c) => c.slug).sort()).toEqual(["apis", "collaboration"]);
    expect(dev.needed.some((c) => c.slug === "apis")).toBe(false);
    expect(dev.foundational).toHaveLength(0);
  });

  it("orders every hat-oriented step hidden-hat first", () => {
    const p = projectPrep(guide);
    expect(p.skills.byHat[0]!.hat.set).toBe("hidden");
    expect(p.highlights[0]!.hat.set).toBe("hidden");
    expect(p.cover[0]!.hat.set).toBe("hidden");
    expect(p.interview[0]!.hat.set).toBe("hidden");
  });

  it("builds highlight item cards, matched items first, joined to their outcome template", () => {
    const { highlights } = projectPrep(guide);
    const uxd = highlights.find((c) => c.hat.slug === "ux-design")!;
    expect(uxd.items.map((i) => i.slug)).toEqual(["wireframing", "design-system"]);
    expect(uxd.items[0]!.matched).toBe(true);
    expect(uxd.items[0]!.quote).toBe("create wireframes");
    expect(uxd.items[0]!.template).toContain("Wireframing ____");
    expect(uxd.items[0]!.hint).toBe("shows the layout");
    expect(uxd.items[1]!.matched).toBe(false);
  });

  it("shows deliverable chips for standard cover cards and a quote for non-standard ones", () => {
    const { cover } = projectPrep(guide);
    const uxd = cover.find((c) => c.hat.slug === "ux-design")!;
    expect(uxd.deliverables).toEqual(["Wireframes"]);
    expect(uxd.quote).toBeUndefined();
    const dev = cover.find((c) => c.hat.slug === "development")!;
    expect(dev.deliverables).toHaveLength(0);
    expect(dev.quote).toBe("write production React");
  });

  it("gives a non-standard interview card the posting quote, and a standard one none", () => {
    const { interview } = projectPrep(guide);
    expect(interview.find((c) => c.hat.slug === "development")!.quote).toBe("write production React");
    expect(interview.find((c) => c.hat.slug === "ux-design")!.quote).toBeUndefined();
  });
});
