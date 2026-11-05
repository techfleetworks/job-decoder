// A pure per-hat prep projection (ADR-0045). It regroups the already-built PrepGuide into
// the prototype's per-step view model: the Skills step's three sections, and the per-hat
// card lists for Highlights, Cover, and Interview. No I/O, no React, no fetch — a
// deterministic function of its input. The view renders this; it never computes the
// grouping itself. The projection adds no framework data: it only regroups what the guide
// already carries, and uses only grounded quotes (never invents one).

import type { HatSet, PrepGuide, PrepPoint, SkillHat, SkillPrepItem } from "./prep";

export type PillLabel = "Expected but missing" | "Matched" | "Not standard";

/** The status pill each hat set shows, matching the prototype's wording. */
export const PILL_BY_SET: Record<HatSet, PillLabel> = {
  hidden: "Expected but missing",
  matched: "Matched",
  "non-standard": "Not standard",
};

const SET_RANK: Record<HatSet, number> = { hidden: 0, matched: 1, "non-standard": 2 };

export interface HatRef {
  slug: string;
  name: string;
  set: HatSet;
}

export interface Chip {
  slug: string;
  label: string;
}

// --- Skills step (three sections) ---
export interface NamedSkill {
  slug: string;
  label: string;
  hats: HatRef[]; // the matched hats whose posting-named work needs this skill
  quote?: string; // a grounded quote from one of those hats' matched activity, when present
}
export interface SharedSkill {
  slug: string;
  label: string;
  type: string; // "Technical" | "Interpersonal"
  hats: HatRef[]; // every hat it supports, in hat order
}
export interface HatSkillCard {
  hat: HatRef;
  needed: Chip[]; // skills the posting-named work needs
  foundational: Chip[]; // the hat's foundational skills
  all: Chip[]; // every skill for this hat (the "All skills" accordion)
}
export interface SkillsStep {
  namedInPosting: NamedSkill[];
  shared: SharedSkill[];
  byHat: HatSkillCard[];
}

// --- Highlights step ---
export interface HighlightCardItem {
  slug: string;
  label: string;
  matched: boolean;
  quote?: string;
  template: string; // the outcome template, with blanks
  hint: string;
}
export interface HatHighlightCard {
  hat: HatRef;
  items: HighlightCardItem[]; // matched first; the view caps the shown count and collapses the rest
}

// --- Cover step ---
export interface HatCoverCard {
  hat: HatRef;
  sentence: string; // the framework's "why this hat matters" point
  deliverables: string[]; // "Name what you delivered" chips (standard hats)
  quote?: string; // non-standard hats show the posting quote instead of deliverables
}

// --- Interview step ---
export interface HatInterviewCard {
  hat: HatRef;
  sentence: string;
  quote?: string; // non-standard hats show the posting quote
}

export interface PrepByHat {
  skills: SkillsStep;
  highlights: HatHighlightCard[];
  cover: HatCoverCard[];
  interview: HatInterviewCard[];
}

function pointRef(p: PrepPoint): HatRef {
  return { slug: p.hatSlug, name: p.hatName, set: p.hatSet };
}
function skillHatRef(h: SkillHat): HatRef {
  return { slug: h.slug, name: h.name, set: h.set };
}
function toChip(s: SkillPrepItem): Chip {
  return { slug: s.slug, label: s.label };
}

/** Project the prep guide into the prototype's per-step, per-hat view model (ADR-0045). */
export function projectPrep(guide: PrepGuide): PrepByHat {
  // The canonical hat order (hidden -> matched -> non-standard) comes from the interview
  // points, which prep.ts maps over every hat in that order (ADR-0024). Every per-hat step
  // renders hats in this order so the screens agree.
  const orderedHats: HatRef[] = guide.interviewPoints.map(pointRef);
  const hatRank = new Map(orderedHats.map((h, i) => [h.slug, i] as const));
  const orderHats = (hats: SkillHat[]): HatRef[] =>
    [...hats]
      .sort((a, b) => (hatRank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (hatRank.get(b.slug) ?? Number.MAX_SAFE_INTEGER))
      .sort((a, b) => SET_RANK[a.set] - SET_RANK[b.set])
      .map(skillHatRef);

  // A grounded posting quote per hat, from its strongest matched highlight item. Used for
  // the Named-in-the-posting skills and for the non-standard cover/interview cards. Never
  // fabricated: a hat with no matched quote simply carries none.
  const quoteByHat = new Map<string, string>();
  for (const h of [...guide.activities, ...guide.deliverables]) {
    if (h.matched && h.quote && !quoteByHat.has(h.hatSlug)) quoteByHat.set(h.hatSlug, h.quote);
  }

  const allSkills = [...guide.technicalSkills, ...guide.interpersonalSkills];

  // --- Skills: Named in the posting ---
  const namedInPosting: NamedSkill[] = [];
  for (const s of allSkills) {
    const neededHats = s.hats.filter((h) => h.role === "needed");
    if (neededHats.length === 0) continue;
    const hats = [...neededHats].sort((a, b) => SET_RANK[a.set] - SET_RANK[b.set]).map(skillHatRef);
    const quote = hats.map((h) => quoteByHat.get(h.slug)).find((q): q is string => Boolean(q));
    namedInPosting.push({ slug: s.slug, label: s.label, hats, ...(quote ? { quote } : {}) });
  }

  // --- Skills: Shared by several Hats (every skill not already named, serving 2+ hats) ---
  const namedSlugs = new Set(namedInPosting.map((n) => n.slug));
  const shared: SharedSkill[] = allSkills
    .filter((s) => !namedSlugs.has(s.slug) && s.hats.length >= 2)
    .map((s) => ({ slug: s.slug, label: s.label, type: s.type, hats: orderHats(s.hats) }));

  // --- Skills: By Hat ---
  const skillsForHat = (hatSlug: string, role?: SkillHat["role"]): Chip[] =>
    allSkills
      .filter((s) => s.hats.some((h) => h.slug === hatSlug && (role ? h.role === role : true)))
      .map(toChip);
  const byHat: HatSkillCard[] = orderedHats.map((hat) => ({
    hat,
    needed: skillsForHat(hat.slug, "needed"),
    foundational: skillsForHat(hat.slug, "foundational"),
    all: skillsForHat(hat.slug),
  }));

  // --- Highlights: per-hat item cards, matched first ---
  const templateBySlug = new Map(guide.outcomeTemplates.map((t) => [t.activitySlug, t] as const));
  const highlights: HatHighlightCard[] = orderedHats.map((hat) => {
    const acts = guide.activities.filter((a) => a.hatSlug === hat.slug);
    const ordered = [...acts.filter((a) => a.matched), ...acts.filter((a) => !a.matched)];
    const items: HighlightCardItem[] = ordered.map((a) => {
      const t = templateBySlug.get(a.slug);
      return {
        slug: a.slug,
        label: a.label,
        matched: a.matched,
        ...(a.quote ? { quote: a.quote } : {}),
        template: t?.template ?? "",
        hint: t?.hint ?? "",
      };
    });
    return { hat, items };
  });

  // --- Cover: one card per hat that has a point (already filtered + ordered in the guide) ---
  const cover: HatCoverCard[] = guide.coverLetterPoints.map((p) => {
    const nonStandard = p.hatSet === "non-standard";
    const quote = nonStandard ? quoteByHat.get(p.hatSlug) : undefined;
    return {
      hat: pointRef(p),
      sentence: p.text,
      deliverables: nonStandard ? [] : (p.deliverables ?? []),
      ...(quote ? { quote } : {}),
    };
  });

  // --- Interview: one card per hat, in order ---
  const interview: HatInterviewCard[] = guide.interviewPoints.map((p) => {
    const quote = p.hatSet === "non-standard" ? quoteByHat.get(p.hatSlug) : undefined;
    return { hat: pointRef(p), sentence: p.text, ...(quote ? { quote } : {}) };
  });

  return { skills: { namedInPosting, shared, byHat }, highlights, cover, interview };
}
