// Classify the matched items against a job function's standard hats, then score the
// title-fit verdict. Everything here is deterministic from the framework: the matcher
// finds which items a posting names, and this step decides what that means for the title.
//
// A matched item rolls up to the duties it belongs to (carried on the item in the
// snapshot, ADR-0021). A hat the title is expected to cover and did = covered. Expected
// and did not = missing. Matched but not expected for this title = non-standard. The
// match percent is covered over standard (ADR-0018); non-standard hats do not lower it.

import type { FunctionSlice, Hat, Match, NonStandardHat, Verdict } from "./types";

// Title-fit verdict bands (ADR-0018): strong at 60% or more, partial from 25% up to 60%,
// mismatch below 25%. Starting values, tunable once there is real usage.
export const BANDS = { strong: 0.6, partial: 0.25 } as const;

export interface Classification {
  covered: Hat[];
  missing: Hat[];
  nonStandard: NonStandardHat[];
  pct: number;
  pctWhole: number;
  verdict: Verdict;
  standardCount: number;
}

export function classify(
  matched: Match[],
  slice: FunctionSlice,
  dutyNames: Record<string, string>,
): Classification {
  const matchedDuties = new Set<string>();
  for (const m of matched) {
    for (const d of m.duties) if (d !== "everyone") matchedDuties.add(d);
  }

  const standard = slice.standardHats;
  const standardSlugs = new Set(standard.map((h) => h.slug));

  const covered = standard.filter((h) => matchedDuties.has(h.slug));
  const missing = standard.filter((h) => !matchedDuties.has(h.slug));
  const nonStandard: NonStandardHat[] = [...matchedDuties]
    .filter((d) => !standardSlugs.has(d))
    .map((slug) => ({ slug, name: dutyNames[slug] ?? slug }));

  const pct = standard.length ? covered.length / standard.length : 0;
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
