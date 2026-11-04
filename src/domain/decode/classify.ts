// Classify the matched items against a job function's standard hats, then score the
// title-fit verdict. Everything here is deterministic from the framework: the matcher
// finds which items a posting names, and this step decides what that means for the title.
//
// Scoring is proportional (ADR-0039). A hat is scored by the share of its real work the
// posting names: the matched activities and deliverables that roll up to it over all the
// activities and deliverables that roll up to it, both via the same Responsible roll-up
// (ADR-0021). A hat is full at 25% or more, partial above 0 and under 25%, none at 0.
// Tools do not count toward a hat (numerator or denominator) and the "everyone" duty never
// scores. The overall title-fit is Formula D: a full hat counts 1, a partial 0.5, over all
// the title's standard hats; the verdict thresholds are unchanged.

import type {
  FunctionSlice,
  MatchLevel,
  Match,
  ScoredHat,
  ScoredNonStandardHat,
  SnapshotItem,
  Verdict,
} from "./types";

// Title-fit verdict bands (ADR-0018, unchanged by ADR-0039): strong at 60% or more,
// partial from 25% up to 60%, mismatch below 25%.
export const BANDS = { strong: 0.6, partial: 0.25 } as const;

// A hat is "full" when the posting names at least this share of its activities and
// deliverables (ADR-0039). Locked, not a tunable starting value.
export const FULL_THRESHOLD = 0.25;

export interface Classification {
  covered: ScoredHat[]; // standard hats at full or partial
  missing: ScoredHat[]; // standard hats at none
  nonStandard: ScoredNonStandardHat[];
  pct: number;
  pctWhole: number;
  verdict: Verdict;
  standardCount: number;
}

function levelOf(score: number, matchedCount: number): MatchLevel {
  if (matchedCount === 0) return "none";
  return score >= FULL_THRESHOLD ? "full" : "partial";
}

export function classify(
  matched: Match[],
  slice: FunctionSlice,
  dutyNames: Record<string, string>,
  items: SnapshotItem[],
): Classification {
  // Denominator per hat: every activity and deliverable that rolls up to it, via the same
  // roll-up the matcher uses (ADR-0021). Tools and the "everyone" duty never count, so the
  // share is always between 0 and 100% (ADR-0039).
  const totals = new Map<string, number>();
  for (const it of items) {
    if (it.type === "tool") continue;
    for (const d of it.duties) {
      if (d !== "everyone") totals.set(d, (totals.get(d) ?? 0) + 1);
    }
  }

  // The roll-up a matched item belongs to comes from the shared item index (the single
  // owner, ADR-0021), not from the match object, so the numerator reads the same source as
  // the denominator and the two decode twins cannot diverge on a hat's membership for an
  // LLM match whose carried duties disagree with the snapshot (judge-arch 2026-11-04).
  const dutiesBySlug = new Map<string, string[]>();
  for (const it of items) dutiesBySlug.set(`${it.type}:${it.slug}`, it.duties);

  // Numerator per hat: the distinct matched activities and deliverables that roll up to it.
  const matchedItems = new Map<string, Set<string>>();
  for (const m of matched) {
    if (m.type === "tool") continue;
    for (const d of dutiesBySlug.get(`${m.type}:${m.slug}`) ?? m.duties) {
      if (d === "everyone") continue;
      let set = matchedItems.get(d);
      if (!set) matchedItems.set(d, (set = new Set<string>()));
      set.add(m.slug);
    }
  }

  const scoreOf = (slug: string): { score: number; scoreWhole: number; level: MatchLevel } => {
    const num = matchedItems.get(slug)?.size ?? 0;
    const den = totals.get(slug) ?? 0;
    const score = den > 0 ? num / den : 0;
    return { score, scoreWhole: Math.round(score * 100), level: levelOf(score, num) };
  };

  const standard = slice.standardHats;
  const standardSlugs = new Set(standard.map((h) => h.slug));

  const scoredStandard: ScoredHat[] = standard.map((h) => ({ ...h, ...scoreOf(h.slug) }));
  const covered = scoredStandard.filter((h) => h.level !== "none");
  const missing = scoredStandard.filter((h) => h.level === "none");

  // A non-standard hat only appears because an item rolled up to it, so it is never "none".
  const nonStandard: ScoredNonStandardHat[] = [...matchedItems.keys()]
    .filter((d) => !standardSlugs.has(d))
    .map((slug) => ({ slug, name: dutyNames[slug] ?? slug, ...scoreOf(slug) }));

  // Overall title-fit, Formula D (ADR-0039): a full standard hat counts 1, a partial 0.5,
  // over all the title's standard hats. Non-standard hats do not change it.
  const weighted = covered.reduce((sum, h) => sum + (h.level === "full" ? 1 : 0.5), 0);
  const pct = standard.length ? weighted / standard.length : 0;
  const verdict: Verdict =
    pct >= BANDS.strong ? "strong" : pct >= BANDS.partial ? "partial" : "mismatch";

  return {
    covered,
    missing,
    nonStandard,
    pct,
    pctWhole: Math.round(pct * 100),
    verdict,
    standardCount: standard.length,
  };
}
