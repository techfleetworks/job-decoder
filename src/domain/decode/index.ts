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
export { BANDS, FULL_THRESHOLD } from "./classify";
export { keywordMatch, unionMatches } from "./match";
export { buildPrepGuide } from "./prep";
export { projectPrep, PILL_BY_SET } from "./prepByHat";
export type {
  Chip,
  HatCoverCard,
  HatHighlightCard,
  HatInterviewCard,
  HatRef,
  HatSkillCard,
  HighlightCardItem,
  NamedSkill,
  PillLabel,
  PrepByHat,
  SharedSkill,
  SkillsStep,
} from "./prepByHat";
export { buildRecognizerPrompt, parseRecognitions } from "./recognize";
export type { DropReason, DroppedRecognition, RecognizeParse, RecognizerPrompt } from "./recognize";
export { MAX_POSTING, MAX_TITLE, validateDecodeInput } from "./validate";
export type { DecodeInputCheck, DecodeInputReason } from "./validate";
export type {
  HatSet,
  HighlightItem,
  KeywordGroup,
  OutcomeTemplate,
  PrepGuide,
  PrepPoint,
  SkillHat,
  SkillPrepItem,
  SkillRole,
} from "./prep";

/** Resolve a real-world title to a job function slug, or null when not covered. */
export function resolveTitle(titles: SnapshotTitles, title: string): string | null {
  return titles.titles[normalize(title)] ?? null;
}

const VERDICTS = new Set(["strong", "partial", "mismatch", "not-covered"]);

// A prep guide is either absent/null (no guide for this result) or carries every list the
// prep screen reads. A stale-shape guide left in storage is rejected with the whole scan,
// so the prep screen never dereferences a missing list.
function isPrepGuideShape(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return false;
  const g = value as Record<string, unknown>;
  return (
    Array.isArray(g.technicalSkills) &&
    Array.isArray(g.interpersonalSkills) &&
    Array.isArray(g.activities) &&
    Array.isArray(g.deliverables) &&
    Array.isArray(g.outcomeTemplates) &&
    Array.isArray(g.atsKeywords) &&
    Array.isArray(g.coverLetterPoints) &&
    Array.isArray(g.interviewPoints)
  );
}

// A minimal shape check for a value read back from storage. A scan saved before a shape
// change (for example a tab left open across a deploy) is rejected rather than cast blind
// and crashing the render. The prep guide, when present, is checked too (ADR-0024 added it
// to the stored result after this guard already existed).
export function isDecodeResult(value: unknown): value is DecodeResult {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.verdict === "string" &&
    VERDICTS.has(r.verdict) &&
    Array.isArray(r.covered) &&
    Array.isArray(r.missing) &&
    Array.isArray(r.nonStandard) &&
    Array.isArray(r.matched) &&
    Array.isArray(r.coverage) &&
    typeof r.pctWhole === "number" &&
    isPrepGuideShape(r.prepGuide)
  );
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

  return { ...result, ...classify(matched, slice, dutyNames, items) };
}
