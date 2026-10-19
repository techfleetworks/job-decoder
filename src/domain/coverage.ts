/**
 * The not-covered handler. The framework covers a limited set of digital product
 * and tech roles (11 job functions). When a user's title falls outside that set,
 * the app must say so plainly rather than guess (requirements FR-6.3 / FR-6.6).
 * Pure: no I/O, no DOM.
 */
import {
  ENTITY,
  JOB_FUNCTION_FIELD,
  type FrameworkData,
  type FrameworkRecord,
} from "./framework/types";
import { getPrimaryName, listRecords } from "./framework/resolver";

/** Lowercase, strip punctuation, collapse whitespace. "UI/UX Designer" -> "ui ux designer". */
export function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface SupportedTitle {
  /** The Job Function slug. */
  slug: string;
  /** The Job Function's standard name. */
  name: string;
  /** Real-world titles that map to this Job Function. */
  aliases: string[];
}

/** Split the comma-separated "other job titles" field into trimmed aliases. */
function readAliases(jobFunction: FrameworkRecord): string[] {
  const raw = jobFunction[JOB_FUNCTION_FIELD.worldTitles];
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Every title the app supports today: Job Function names plus their aliases. */
export function getSupportedTitles(data: FrameworkData): SupportedTitle[] {
  return listRecords(data, ENTITY.jobFunctions).map((jf) => ({
    slug: jf.slug,
    name: getPrimaryName(data, ENTITY.jobFunctions, jf),
    aliases: readAliases(jf),
  }));
}

export interface CoverageSuggestion {
  slug: string;
  name: string;
}

export type TitleResolution =
  | {
      status: "covered";
      jobFunction: FrameworkRecord;
      name: string;
      matchedOn: "name" | "alias";
    }
  | {
      status: "not-covered";
      input: string;
      suggestions: CoverageSuggestion[];
    };

/**
 * Resolve a user-entered title to a supported Job Function, or report that it is
 * not covered. A match is exact on the normalized name or a normalized alias.
 * No fuzzy match is treated as a match: an uncertain title is "not-covered" with
 * suggestions, never a silent guess.
 */
export function resolveTitle(
  data: FrameworkData,
  input: string,
): TitleResolution {
  const needle = normalizeTitle(input);
  const supported = getSupportedTitles(data);

  if (needle.length > 0) {
    for (const title of supported) {
      if (normalizeTitle(title.name) === needle) {
        const jobFunction = data.entities
          .get(ENTITY.jobFunctions)
          ?.get(title.slug);
        if (jobFunction) {
          return {
            status: "covered",
            jobFunction,
            name: title.name,
            matchedOn: "name",
          };
        }
      }
    }
    for (const title of supported) {
      if (title.aliases.some((a) => normalizeTitle(a) === needle)) {
        const jobFunction = data.entities
          .get(ENTITY.jobFunctions)
          ?.get(title.slug);
        if (jobFunction) {
          return {
            status: "covered",
            jobFunction,
            name: title.name,
            matchedOn: "alias",
          };
        }
      }
    }
  }

  return {
    status: "not-covered",
    input,
    suggestions: suggestTitles(supported, needle),
  };
}

/** Non-binding suggestions: supported titles whose name/alias shares the input. */
function suggestTitles(
  supported: SupportedTitle[],
  needle: string,
  limit = 3,
): CoverageSuggestion[] {
  if (needle.length === 0) return [];
  const out: CoverageSuggestion[] = [];
  for (const title of supported) {
    const haystacks = [title.name, ...title.aliases].map(normalizeTitle);
    const shares = haystacks.some(
      (h) => h.includes(needle) || needle.includes(h),
    );
    if (shares) out.push({ slug: title.slug, name: title.name });
    if (out.length >= limit) break;
  }
  return out;
}

/** Whether a given entity slug is present in the loaded framework. */
export function isEntityCovered(
  data: FrameworkData,
  entity: string,
  slug: string,
): boolean {
  return data.entities.get(entity)?.has(slug) ?? false;
}
