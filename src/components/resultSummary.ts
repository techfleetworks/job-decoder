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
  const full = result.covered.filter((h) => h.level === "full").length;
  const partial = result.covered.length - full;
  return `Title fit ${result.pctWhole}%. This posting fully covers ${full} and partly covers ${partial} of the ${result.standardCount} standard hats for this title.`;
}

// The three verdict-step counts, labeled in match-level language to match the prototype's
// stat tiles (T17 / ADR-0039): hats the posting covers (full + partial), hats it leaves out
// (hidden), and hats it adds beyond the role (extra). Count only, so the meaning is carried
// by the label text, never by color (WCAG 2.2 AA).
export interface VerdictCount {
  label: string;
  count: number;
}

export function verdictCounts(result: DecodeResult): VerdictCount[] {
  return [
    { label: "Hats covered", count: result.covered.length },
    { label: "Hidden hats", count: result.missing.length },
    { label: "Extra hats", count: result.nonStandard.length },
  ];
}

// The step-2 group headings, kept here (not inline in the component) so a copy change is
// caught by this module's tests, per the header rule above. The match-level cutoffs follow
// ADR-0039: full is 25% or more of a hat's work, partial is above 0 and under 25%.
export const GROUP_HEADINGS = {
  full: "Fully covered — 25% or more of the hat’s work",
  partial: "Partly covered — under 25% of the hat’s work",
} as const;
