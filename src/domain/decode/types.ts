// Types for the decode domain. These mirror the snapshot read model the build step
// emits (see pipeline/lib/derive.mjs) and the result the decode route returns.

export type ItemType = "activity" | "deliverable" | "tool";

/** A leaf framework item as it appears in the snapshot's shared item index. */
export interface SnapshotItem {
  slug: string;
  type: ItemType;
  label: string;
  aliases: string[];
  duties: string[]; // the duties this item rolls up to (ADR-0021)
  skills?: string[]; // activity only: the skills it lists (ADR-0024)
  deliverables?: string[]; // activity only: its associated deliverables (ADR-0024)
  whyImportant?: string; // deliverable only: why it matters (ADR-0024)
}

/** A hat's full detail, from duties.json, for classification and resume prep (ADR-0024). */
export interface DutyDetail {
  slug: string;
  name: string;
  description: string;
  whyImportant: string;
  skillsRequired: string[];
  foundationalSkills: string[];
  activities: string[];
  deliverables: string[];
  tools: string[];
}

/** A skill's name and type (Technical or Interpersonal), from skills.json (ADR-0024). */
export interface SkillInfo {
  slug: string;
  name: string;
  type: string;
}

/** titles.json: normalized real-world title to job function slug, plus the function list. */
export interface SnapshotTitles {
  titles: Record<string, string>;
  functions: { slug: string; name: string }[];
}

/** One hat (duty) with plain-language fields. */
export interface Hat {
  slug: string;
  name: string;
  description: string;
}

/** functions/<slug>.json: one job function and the hats it is expected to cover. */
export interface FunctionSlice {
  function: { slug: string; name: string; description: string };
  standardHats: Hat[];
}

export type MatchTier = "exact" | "alias" | "similar";
export type MatchVia = "keyword" | "llm";

/** One matched framework item, with how it matched and where. */
export interface Match {
  slug: string;
  type: ItemType;
  label: string;
  tier: MatchTier;
  term: string; // the label or alias phrase that matched
  via: MatchVia[];
  duties: string[];
  quote?: string; // a verbatim phrase from the posting (from the LLM recognizer)
  unit?: number; // which posting line matched
}

/** One posting line and the items matched in it (for the line-accountability audit). */
export interface CoverageUnit {
  index: number;
  unit: string;
  items: string[];
}

/** A non-standard hat: a duty a posting named that the title does not normally cover. */
export interface NonStandardHat {
  slug: string;
  name: string;
}

export type Verdict = "strong" | "partial" | "mismatch" | "not-covered";

/** The full decode result the route returns. */
export interface DecodeResult {
  functionSlug: string | null;
  functionName: string | null;
  covered: Hat[];
  missing: Hat[];
  nonStandard: NonStandardHat[];
  matched: Match[];
  pct: number; // covered / standard, 0..1
  pctWhole: number; // whole-number percent, covered / standard
  verdict: Verdict;
  standardCount: number;
  coverage: CoverageUnit[];
  linesAudited: number;
  linesMatched: number;
  unplaced: number[];
}
