/**
 * Reads one posting against one title: compares the title's standard hats to the
 * hats the job description describes, and produces the three sets plus an honesty
 * verdict. Pure: no I/O, no DOM.
 */
import { ENTITY, type FrameworkData, type FrameworkRecord } from "../framework/types";
import {
  getAssociatedDuties,
  getPrimaryName,
  type ResolvedRef,
} from "../framework/resolver";
import { matchJobDescription, type MatchOptions } from "./matcher";
import type {
  AnalyzedHat,
  HonestyVerdict,
  PostingAnalysis,
  VerdictLevel,
} from "./types";

const STRONG_MIN_RATIO = 0.6;
const PARTIAL_MIN_RATIO = 0.25;

function nameOf(data: FrameworkData, ref: ResolvedRef): string {
  return ref.record
    ? getPrimaryName(data, ENTITY.duties, ref.record)
    : ref.label;
}

function buildVerdict(
  standardCount: number,
  matchedCount: number,
  nonStandardCount: number,
): HonestyVerdict {
  const coverageRatio = standardCount === 0 ? 0 : matchedCount / standardCount;
  let level: VerdictLevel;
  if (coverageRatio >= STRONG_MIN_RATIO) level = "strong";
  else if (coverageRatio >= PARTIAL_MIN_RATIO) level = "partial";
  else level = "mismatch";
  return { level, standardCount, matchedCount, nonStandardCount, coverageRatio };
}

/**
 * Analyze a posting. `jobFunction` is the resolved Job Function for the title
 * (from coverage.resolveTitle); `jdText` is the pasted job description.
 */
export function analyzePosting(
  data: FrameworkData,
  jobFunction: FrameworkRecord,
  jdText: string,
  options?: MatchOptions,
): PostingAnalysis {
  const standard = getAssociatedDuties(data, jobFunction);
  const standardSlugs = new Set(standard.map((hat) => hat.slug));

  const described = matchJobDescription(data, jdText, options);
  const describedBySlug = new Map(described.map((d) => [d.slug, d]));

  const matched: AnalyzedHat[] = [];
  const expectedMissing: AnalyzedHat[] = [];

  for (const hat of standard) {
    const found = describedBySlug.get(hat.slug);
    if (found) {
      matched.push({
        slug: hat.slug,
        name: found.name,
        record: found.record,
        score: found.score,
        matchedPhrases: found.matchedPhrases,
      });
    } else {
      expectedMissing.push({
        slug: hat.slug,
        name: nameOf(data, hat),
        record: hat.record,
        score: 0,
        matchedPhrases: [],
      });
    }
  }

  const nonStandard: AnalyzedHat[] = described
    .filter((d) => !standardSlugs.has(d.slug))
    .map((d) => ({
      slug: d.slug,
      name: d.name,
      record: d.record,
      score: d.score,
      matchedPhrases: d.matchedPhrases,
    }));

  return {
    jobFunction,
    jobFunctionName: getPrimaryName(data, ENTITY.jobFunctions, jobFunction),
    matched,
    expectedMissing,
    nonStandard,
    verdict: buildVerdict(standard.length, matched.length, nonStandard.length),
  };
}
