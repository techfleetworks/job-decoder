// The decode pipeline, shared shape with the future app route:
//   resolve title -> keyword match (always) union validated LLM match
//   -> roll up matched items to hats via RACI -> classify against the
//   function's standard hats -> match percent and title-fit verdict.
//
// It also carries a coverage audit: one record per posting line, each either
// matched to items or marked unplaced. Every line is accounted for, by
// construction, so nothing is silently dropped.
//
// Everything after matching is deterministic from the framework. The LLM only
// contributes candidate recognitions, already validated by the gateway.

import { resolveTitle, itemDuties } from './framework.mjs';
import { keywordMatch, unionMatches } from './match.mjs';

// Coverage bands for the title-fit verdict. Starting values from ADR-0004/0018;
// tunable once there is real usage.
export const BANDS = { strong: 0.6, partial: 0.25 };

export function decodePosting(fw, fixture, llmMatches, aliasMap) {
  const fnSlug = resolveTitle(fw, fixture.title);

  const { matches: keyword, coverage } = keywordMatch(fixture.posting, fw.items, aliasMap);
  const llm = Array.isArray(llmMatches) ? llmMatches : [];
  const matched = unionMatches(keyword, llm);

  // Roll matched items up to the hats (duties) they belong to.
  const matchedDuties = new Set();
  for (const m of matched) {
    for (const d of itemDuties(fw, m)) matchedDuties.add(d);
  }

  const result = {
    fnSlug,
    matched,
    matchedDuties: [...matchedDuties],
    standard: [],
    covered: [],
    missing: [],
    nonStandard: [],
    pct: 0,
    verdict: 'not-covered',
    // Line-accountability audit: every unit is matched or unplaced.
    linesAudited: coverage.length,
    linesMatched: coverage.filter((c) => c.items.length > 0).length,
    unplaced: coverage.filter((c) => c.items.length === 0).map((c) => c.unit),
    coverage,
  };

  if (!fnSlug) return result; // title not covered: report honestly, do not guess

  const standard = fw.functionToDuties.get(fnSlug) ?? new Set();
  result.standard = [...standard];
  for (const d of standard) (matchedDuties.has(d) ? result.covered : result.missing).push(d);
  for (const d of matchedDuties) if (!standard.has(d)) result.nonStandard.push(d);

  result.pct = standard.size ? result.covered.length / standard.size : 0;
  result.verdict =
    result.pct >= BANDS.strong ? 'strong' : result.pct >= BANDS.partial ? 'partial' : 'mismatch';
  return result;
}
