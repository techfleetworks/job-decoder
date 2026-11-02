// Pure presentation helpers for the decode result: the words shown to the person. Kept
// out of the components so they can be tested without rendering, and so the meaning of a
// verdict is carried by text, not color (WCAG 2.2 AA, meaning never by color alone).

// Relative import (not the @/ alias) so this module also loads under the cucumber tsx
// runner, which does not resolve tsconfig path aliases.
import type { DecodeResult, MatchTier, Verdict } from "../domain/decode/types";

// How each match tier reads to a person. Kept here with the other user-facing wording so a
// copy change is caught by this module's tests, not shipped unnoticed from a component.
const TIER_WORDS: Record<MatchTier, string> = {
  exact: "exact wording",
  alias: "a known phrasing",
  similar: "close wording",
};

export function tierWording(tier: MatchTier): string {
  return TIER_WORDS[tier];
}

const HEADLINES: Record<Verdict, string> = {
  strong: "This posting fits the title well.",
  partial: "This posting partly fits the title.",
  mismatch: "This posting does not fit the title.",
  "not-covered": "We do not cover this title yet.",
};

export function verdictHeadline(result: DecodeResult): string {
  return HEADLINES[result.verdict];
}

// True when no AI match contributed, so the result is the keyword-only "basic read"
// (ADR-0018 step 15). Until the AI recognizer (T05) ships, every read is basic.
export function isBasicRead(result: DecodeResult): boolean {
  return !result.matched.some((m) => m.via.includes("llm"));
}

export function matchSummary(result: DecodeResult): string {
  if (result.verdict === "not-covered") return "This title is not in the framework yet.";
  return `${result.pctWhole}% of the standard hats for this title are covered (${result.covered.length} of ${result.standardCount}).`;
}
