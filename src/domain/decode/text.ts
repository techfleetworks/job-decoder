// Lexical text helpers for matching posting wording to framework labels. This is the
// app's typed copy of the approach the eval harness validated (pipeline/lib/text.mjs).
// It is lexical only: lowercase, fold punctuation to spaces, collapse whitespace. It is
// deliberately not a stemmer, so a match is explainable and predictable, at the honest
// cost of missing paraphrase. The decode domain is pure, so this holds no I/O.
//
// The eval harness keeps its own .mjs copy because it runs as a build-time Node script,
// not as part of the app bundle. Both carry the same rules; the accuracy gate (T12) runs
// the eval fixtures so the two cannot drift silently.

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "for", "in", "on", "with", "by",
  "is", "are", "be", "as", "at", "from", "your", "you", "we", "our", "this",
  "that", "will", "into", "per", "via",
]);

export function normalize(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[‘’]/g, "'") // curly to straight, then dropped below
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokens(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(" ") : [];
}

// Content tokens drop stopwords and very short tokens, so a generic word alone cannot
// carry a "similar" match.
export function contentTokens(s: string): string[] {
  return tokens(s).filter((t) => t.length > 2 && !STOP.has(t));
}

// True when phraseNorm occurs in haystackNorm on token boundaries (contiguous).
export function includesPhrase(haystackNorm: string, phraseNorm: string): boolean {
  if (!phraseNorm) return false;
  return (" " + haystackNorm + " ").includes(" " + phraseNorm + " ");
}

// Split a posting into units: one per line, or per sentence. The lookbehind keeps a
// token like "Builder.io" intact, because the period there is not followed by a space.
export function splitUnits(text: string): string[] {
  return String(text ?? "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((u) => u.trim())
    .filter(Boolean);
}
