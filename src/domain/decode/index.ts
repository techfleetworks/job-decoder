// The decode orchestrator. Pure: it takes the posting and the already-loaded snapshot
// data in, and returns the result. No fetch, no file reads, no request or response. The
// route (tier 2) resolves the title, loads the right slice, and hands them here.
//
// Flow: keyword-match the posting against every item, union in any validated LLM matches,
// build the line-accountability audit, and, when the title is covered, classify and score
// against that function's standard hats. When the title is not covered, it says so and
// never guesses (ADR-0008, ADR-0012).

import { classify } from "./classify";
import { keywordMatch, unionMatches } from "./match";
import { normalize } from "./text";
import type { DecodeResult, FunctionSlice, Match, SnapshotItem, SnapshotTitles } from "./types";

export * from "./types";
export { BANDS } from "./classify";
export { keywordMatch, unionMatches } from "./match";

/** Resolve a real-world title to a job function slug, or null when not covered. */
export function resolveTitle(titles: SnapshotTitles, title: string): string | null {
  return titles.titles[normalize(title)] ?? null;
}

export interface DecodeInput {
  posting: string;
  items: SnapshotItem[];
  /** The resolved function's slice, or null when the title is not covered. */
  slice: FunctionSlice | null;
  /** Duty slug to display name, for naming non-standard hats (from the snapshot). */
  dutyNames: Record<string, string>;
  /** Validated recognitions from the LLM recognizer, if any (ADR-0007). */
  llmMatches?: Match[];
}

export function decode(input: DecodeInput): DecodeResult {
  const { posting, items, slice, dutyNames, llmMatches } = input;

  const { matches: keyword, coverage } = keywordMatch(posting, items);
  const matched = unionMatches(keyword, Array.isArray(llmMatches) ? llmMatches : []);

  const result: DecodeResult = {
    functionSlug: slice?.function.slug ?? null,
    functionName: slice?.function.name ?? null,
    covered: [],
    missing: [],
    nonStandard: [],
    matched,
    pct: 0,
    pctWhole: 0,
    verdict: "not-covered",
    standardCount: 0,
    coverage,
    linesAudited: coverage.length,
    linesMatched: coverage.filter((c) => c.items.length > 0).length,
    unplaced: coverage.filter((c) => c.items.length === 0).map((c) => c.index),
  };

  if (!slice) return result; // title not covered: report honestly, do not guess

  return { ...result, ...classify(matched, slice, dutyNames) };
}
