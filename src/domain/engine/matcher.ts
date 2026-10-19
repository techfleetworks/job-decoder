/**
 * On-device job-description matching. Given the framework and pasted JD text,
 * finds which duties ("hats") the text actually describes, by locating each
 * duty's evidence phrases in the text. Pure: no I/O, no DOM, no network — all
 * matching happens locally, so the pasted text never leaves the device.
 *
 * Scoring: each matched phrase contributes its token count, so a specific
 * multi-word phrase ("information architecture") weighs more than a lone generic
 * word ("design"). A duty counts as described once its score reaches `minScore`,
 * which keeps a single generic word from implying a whole duty.
 */
import { ENTITY, type FrameworkData } from "../framework/types";
import { getPrimaryName, getRecord } from "../framework/resolver";
import { normalize, phraseInText, tokenCount } from "../text";
import { buildDutyEvidence } from "./evidence";
import type { DescribedDuty, EvidencePhrase } from "./types";

export interface MatchOptions {
  /** Minimum score for a duty to count as described. Default 2. */
  minScore?: number;
  /** Prebuilt evidence index, to avoid rebuilding across calls. */
  evidence?: Map<string, EvidencePhrase[]>;
}

/** Duties the job description describes, strongest first. */
export function matchJobDescription(
  data: FrameworkData,
  jdText: string,
  options: MatchOptions = {},
): DescribedDuty[] {
  const minScore = options.minScore ?? 2;
  const evidence = options.evidence ?? buildDutyEvidence(data);
  const text = normalize(jdText);
  if (text.length === 0) return [];

  const described: DescribedDuty[] = [];

  for (const [slug, phrases] of evidence) {
    let score = 0;
    const matchedPhrases: string[] = [];
    for (const ep of phrases) {
      if (phraseInText(ep.phrase, text)) {
        score += tokenCount(ep.phrase);
        matchedPhrases.push(ep.label);
      }
    }
    if (score >= minScore) {
      const record = getRecord(data, ENTITY.duties, slug);
      if (!record) continue; // evidence without a record: skip rather than guess
      described.push({
        slug,
        name: getPrimaryName(data, ENTITY.duties, record),
        score,
        matchedPhrases,
        record,
      });
    }
  }

  described.sort((a, b) => b.score - a.score);
  return described;
}
