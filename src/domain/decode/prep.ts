// Resume and application prep, built from the hats (ADR-0024). Pure: it takes the decode
// result and the snapshot lookups in and returns the guide. No AI, no personal data, no
// I/O. Every item carries its hat, entity, slug, and source field so it can be traced to
// the framework. Hats are ordered hidden (expected but missing) first, then matched, then
// non-standard, on every step.

import { normalize } from "./text";
import type { DecodeResult, DutyDetail, Match, SkillInfo, SnapshotItem } from "./types";

export type HatSet = "hidden" | "matched" | "non-standard";

export interface SkillPrepItem {
  slug: string;
  label: string;
  type: string; // "Technical" | "Interpersonal"
  hats: { slug: string; name: string; set: HatSet }[];
  sourceField: string;
  key: boolean; // true = a key skill to lead with; false = "other skills this hat uses" (accordion)
}
export interface HighlightItem {
  slug: string;
  label: string;
  entity: "activity" | "deliverable";
  hatSlug: string;
  hatSet: HatSet;
  matched: boolean;
  quote?: string;
}
export interface OutcomeTemplate {
  activitySlug: string;
  activityLabel: string;
  hatSlug: string;
  hatSet: HatSet;
  deliverableLabel: string | null;
  template: string;
  hint: string;
}
export interface KeywordGroup {
  group: string;
  keywords: string[];
}
export interface PrepPoint {
  hatSlug: string;
  hatName: string;
  hatSet: HatSet;
  text: string;
  deliverables?: string[]; // cover-letter points: the hat's deliverables to mention
}

export interface PrepGuide {
  technicalSkills: SkillPrepItem[];
  interpersonalSkills: SkillPrepItem[];
  activities: HighlightItem[];
  deliverables: HighlightItem[];
  outcomeTemplates: OutcomeTemplate[];
  atsKeywords: KeywordGroup[];
  coverLetterPoints: PrepPoint[];
  interviewPoints: PrepPoint[];
}

export interface PrepLookups {
  duties: DutyDetail[];
  skills: SkillInfo[];
  items: SnapshotItem[];
}

const TIER_RANK: Record<Match["tier"], number> = { similar: 1, alias: 2, exact: 3 };

export function buildPrepGuide(result: DecodeResult, lookups: PrepLookups): PrepGuide | null {
  // No guide when the title is not covered: there is nothing grounded to prepare from.
  if (result.verdict === "not-covered") return null;

  const dutyBySlug = new Map(lookups.duties.map((d) => [d.slug, d] as const));
  const skillBySlug = new Map(lookups.skills.map((s) => [s.slug, s] as const));
  const activityBySlug = new Map(
    lookups.items.filter((i) => i.type === "activity").map((i) => [i.slug, i] as const),
  );
  const deliverableBySlug = new Map(
    lookups.items.filter((i) => i.type === "deliverable").map((i) => [i.slug, i] as const),
  );
  const toolBySlug = new Map(
    lookups.items.filter((i) => i.type === "tool").map((i) => [i.slug, i] as const),
  );

  // Hidden first, then matched, then non-standard, on every step (ADR-0024).
  const hats: { slug: string; name: string; set: HatSet }[] = [
    ...result.missing.map((h) => ({ slug: h.slug, name: h.name, set: "hidden" as HatSet })),
    ...result.covered.map((h) => ({ slug: h.slug, name: h.name, set: "matched" as HatSet })),
    ...result.nonStandard.map((h) => ({ slug: h.slug, name: h.name, set: "non-standard" as HatSet })),
  ];

  const matchedByHat = new Map<string, Match[]>();
  for (const m of result.matched) {
    for (const d of m.duties) {
      if (!matchedByHat.has(d)) matchedByHat.set(d, []);
      matchedByHat.get(d)!.push(m);
    }
  }
  const strongestMatch = (hatSlug: string): Match | undefined =>
    [...(matchedByHat.get(hatSlug) ?? [])].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])[0];

  // --- Step 1: skills, split technical vs interpersonal, deduped across hats ---
  // The pool per hat is the duty's required skills plus the skills of the activities the
  // posting named (ADR-0024). Key skills lead; the rest are flagged for the accordion.
  const skillAgg = new Map<string, SkillPrepItem>();
  const addSkill = (
    slug: string,
    hat: { slug: string; name: string; set: HatSet },
    source: string,
    key: boolean,
  ) => {
    const info = skillBySlug.get(slug);
    if (!info) return; // dropped and not shown; the build gate (R4) guarantees refs resolve
    let agg = skillAgg.get(slug);
    if (!agg) {
      agg = { slug, label: info.name, type: info.type, hats: [], sourceField: source, key: false };
      skillAgg.set(slug, agg);
    }
    if (!agg.hats.some((h) => h.slug === hat.slug)) {
      agg.hats.push({ slug: hat.slug, name: hat.name, set: hat.set });
    }
    if (key) {
      agg.key = true;
      agg.sourceField = source; // a key source names why it leads
    }
  };
  for (const hat of hats) {
    const duty = dutyBySlug.get(hat.slug);
    if (!duty) continue;
    const keySlugs = new Set<string>();
    if (hat.set === "hidden") {
      // No posting evidence, so the key skills are the duty's foundational skills.
      for (const s of duty.foundationalSkills) {
        keySlugs.add(s);
        addSkill(s, hat, "Foundational Skills", true);
      }
    } else {
      // Rank 2: skills required by the activities the posting named for this hat.
      for (const m of (matchedByHat.get(hat.slug) ?? []).filter((x) => x.type === "activity")) {
        for (const s of activityBySlug.get(m.slug)?.skills ?? []) {
          keySlugs.add(s);
          addSkill(s, hat, "a posting-named activity", true);
        }
      }
      // Rank 3: the duty's foundational skills.
      for (const s of duty.foundationalSkills) {
        keySlugs.add(s);
        addSkill(s, hat, "Foundational Skills", true);
      }
    }
    // The rest of the duty's required skills are in the pool but not key (accordion).
    for (const s of duty.skillsRequired) {
      if (!keySlugs.has(s)) addSkill(s, hat, "Skills Required For the Duty", false);
    }
  }
  const allSkills = [...skillAgg.values()];
  const technicalSkills = allSkills.filter((s) => s.type === "Technical");
  const interpersonalSkills = allSkills.filter((s) => s.type === "Interpersonal");

  // --- Step 2: activities and deliverables to highlight (matched first) ---
  const activities: HighlightItem[] = [];
  const deliverables: HighlightItem[] = [];
  for (const hat of hats) {
    const duty = dutyBySlug.get(hat.slug);
    if (!duty) continue;
    const matched = matchedByHat.get(hat.slug) ?? [];
    const matchedActs = new Set(matched.filter((m) => m.type === "activity").map((m) => m.slug));
    const matchedDels = new Set(matched.filter((m) => m.type === "deliverable").map((m) => m.slug));

    for (const m of matched.filter((m) => m.type === "activity")) {
      activities.push({ slug: m.slug, label: m.label, entity: "activity", hatSlug: hat.slug, hatSet: hat.set, matched: true, quote: m.quote ?? m.term });
    }
    for (const aSlug of duty.activities) {
      if (matchedActs.has(aSlug)) continue;
      activities.push({ slug: aSlug, label: activityBySlug.get(aSlug)?.label ?? aSlug, entity: "activity", hatSlug: hat.slug, hatSet: hat.set, matched: false });
    }
    for (const m of matched.filter((m) => m.type === "deliverable")) {
      deliverables.push({ slug: m.slug, label: m.label, entity: "deliverable", hatSlug: hat.slug, hatSet: hat.set, matched: true, quote: m.quote ?? m.term });
    }
    for (const dSlug of duty.deliverables) {
      if (matchedDels.has(dSlug)) continue;
      deliverables.push({ slug: dSlug, label: deliverableBySlug.get(dSlug)?.label ?? dSlug, entity: "deliverable", hatSlug: hat.slug, hatSet: hat.set, matched: false });
    }
  }

  // Outcome template per highlighted activity: "[Activity] ___, which resulted in
  // [deliverable] ___, so that ___." The person fills every blank; no numbers invented.
  const outcomeTemplates: OutcomeTemplate[] = [];
  const seenActivity = new Set<string>();
  for (const a of activities) {
    if (seenActivity.has(a.slug)) continue;
    seenActivity.add(a.slug);
    const delSlug = activityBySlug.get(a.slug)?.deliverables?.[0];
    const del = delSlug ? deliverableBySlug.get(delSlug) : undefined;
    const deliverableLabel = del?.label ?? null;
    outcomeTemplates.push({
      activitySlug: a.slug,
      activityLabel: a.label,
      hatSlug: a.hatSlug,
      hatSet: a.hatSet,
      deliverableLabel,
      template: deliverableLabel
        ? `${a.label} ____, which resulted in ${deliverableLabel} ____, so that ____.`
        : `${a.label} ____, so that ____.`,
      hint: del?.whyImportant ?? "",
    });
  }

  // --- Step 3: ATS keywords, grouped, each once in its highest group ---
  const seenKeyword = new Set<string>();
  const group = (name: string, labels: string[]): KeywordGroup => {
    const keywords: string[] = [];
    for (const label of labels) {
      const key = normalize(label);
      if (!key || seenKeyword.has(key)) continue;
      seenKeyword.add(key);
      keywords.push(label);
    }
    return { group: name, keywords };
  };
  const toolSlugs = new Set<string>();
  for (const hat of hats) for (const t of dutyBySlug.get(hat.slug)?.tools ?? []) toolSlugs.add(t);
  const atsKeywords = [
    group("In the posting", result.matched.map((m) => m.quote ?? m.term)),
    group("Hats", hats.map((h) => h.name)),
    group("Tools", [...toolSlugs].map((s) => toolBySlug.get(s)?.label ?? s)),
    group("Activities", activities.map((a) => a.label)),
    group("Skills", allSkills.map((s) => s.label)),
  ].filter((g) => g.keywords.length > 0);

  // --- Step 4: cover letter points (one per hat, hidden first) ---
  // Built from the duty's "why it matters" and the hat's deliverables (ADR-0024). A hat is
  // kept when it has either, so an empty "why" does not drop a hat with deliverables.
  const coverLetterPoints: PrepPoint[] = hats
    .map((hat) => {
      const duty = dutyBySlug.get(hat.slug);
      return {
        hatSlug: hat.slug,
        hatName: hat.name,
        hatSet: hat.set,
        text: duty?.whyImportant ?? "",
        deliverables: (duty?.deliverables ?? []).map((s) => deliverableBySlug.get(s)?.label ?? s),
      };
    })
    .filter((p) => p.text || (p.deliverables?.length ?? 0) > 0);

  // --- Step 5: interview points ---
  const interviewPoints: PrepPoint[] = hats.map((hat) => {
    const duty = dutyBySlug.get(hat.slug);
    if (hat.set === "non-standard") {
      const strongest = strongestMatch(hat.slug);
      return {
        hatSlug: hat.slug,
        hatName: hat.name,
        hatSet: hat.set,
        text: `Ask how much of the role is ${hat.name}${strongest ? ` (they named ${strongest.label})` : ""}.`,
      };
    }
    const matched = matchedByHat.get(hat.slug) ?? [];
    let deliverable = matched.find((m) => m.type === "deliverable")?.label;
    if (!deliverable) {
      const actDel = activityBySlug.get(matched.find((m) => m.type === "activity")?.slug ?? "")?.deliverables?.[0];
      if (actDel) deliverable = deliverableBySlug.get(actDel)?.label;
    }
    if (!deliverable) {
      const firstOwned = duty?.deliverables?.[0];
      if (firstOwned) deliverable = deliverableBySlug.get(firstOwned)?.label ?? firstOwned;
    }
    return {
      hatSlug: hat.slug,
      hatName: hat.name,
      hatSet: hat.set,
      text: deliverable ? `Be ready to show ${deliverable}.` : `Be ready to discuss ${hat.name}.`,
    };
  });

  return {
    technicalSkills,
    interpersonalSkills,
    activities,
    deliverables,
    outcomeTemplates,
    atsKeywords,
    coverLetterPoints,
    interviewPoints,
  };
}
