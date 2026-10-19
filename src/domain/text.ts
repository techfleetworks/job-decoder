/**
 * Shared text normalization for on-device matching. Pure: no I/O, no DOM.
 * One normalizer is used everywhere (title matching and job-description phrase
 * matching) so "UI/UX Designer" and "ui ux designer" compare equal consistently.
 */

/** Lowercase, replace runs of non-alphanumeric characters with a single space, trim. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Number of whitespace-separated tokens in an already-normalized string. */
export function tokenCount(normalized: string): number {
  if (normalized.length === 0) return 0;
  return normalized.split(" ").length;
}

/**
 * Whether `phrase` occurs in `text` on token boundaries (not as part of a larger
 * word). Both arguments must already be normalized. An empty phrase never matches.
 */
export function phraseInText(phrase: string, text: string): boolean {
  if (phrase.length === 0) return false;
  return ` ${text} `.includes(` ${phrase} `);
}
