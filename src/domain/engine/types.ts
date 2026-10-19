/**
 * Types for the on-device matching engine. Pure: no I/O, no DOM.
 */
import type { FrameworkRecord } from "../framework/types";

/** One phrase that, if found in a job description, is evidence of a duty. */
export interface EvidencePhrase {
  /** The normalized phrase used for matching. */
  phrase: string;
  /** The original human-readable label, shown to the user. */
  label: string;
  /** Which duty field the phrase came from (e.g. "Responsible Tasks"). */
  source: string;
}

/** A duty the job description actually describes, with what triggered it. */
export interface DescribedDuty {
  slug: string;
  name: string;
  /** Sum of matched phrase weights (longer phrases weigh more). */
  score: number;
  /** The original labels whose phrases were found in the job description. */
  matchedPhrases: string[];
  record: FrameworkRecord;
}

/** A hat (duty) in the analysis. `record` is absent only if a slug is unknown. */
export interface AnalyzedHat {
  slug: string;
  name: string;
  record?: FrameworkRecord;
  /** 0 for an expected-but-missing hat. */
  score: number;
  /** Empty for an expected-but-missing hat. */
  matchedPhrases: string[];
}

export type VerdictLevel = "strong" | "partial" | "mismatch";

/** How honestly the title matches the work the description describes. */
export interface HonestyVerdict {
  level: VerdictLevel;
  standardCount: number;
  matchedCount: number;
  nonStandardCount: number;
  /** matchedCount / standardCount, in [0, 1]. */
  coverageRatio: number;
}

/** The full result of reading one posting against one title. */
export interface PostingAnalysis {
  jobFunction: FrameworkRecord;
  jobFunctionName: string;
  /** Standard hats the description describes. */
  matched: AnalyzedHat[];
  /** Standard hats the description does not describe. */
  expectedMissing: AnalyzedHat[];
  /** Described hats that are not standard for this title. */
  nonStandard: AnalyzedHat[];
  verdict: HonestyVerdict;
}
