// Shared text normalization. It lives here, with the derivation that depends on it
// (relations.mjs builds the title index with normalize, and decode-time title lookups
// must normalize identically), so the pipeline owns its shared primitives rather than
// reaching back into the eval harness. The eval harness re-exports from this module.
//
// Lexical only: lowercase, fold punctuation to spaces, collapse whitespace. Deliberately
// NOT a stemmer, so matches stay explainable and predictable, at the honest cost of
// missing paraphrase (see eval/README.md, limits).

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'by',
  'is', 'are', 'be', 'as', 'at', 'from', 'your', 'you', 'we', 'our', 'this',
  'that', 'will', 'into', 'per', 'via',
]);

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'") // curly to straight, then dropped below
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokens(s) {
  const n = normalize(s);
  return n ? n.split(' ') : [];
}

// Content tokens drop stopwords and very short tokens, so a generic word alone
// cannot carry a "similar" match.
export function contentTokens(s) {
  return tokens(s).filter((t) => t.length > 2 && !STOP.has(t));
}

// True when phraseNorm occurs in haystackNorm on token boundaries (contiguous).
export function includesPhrase(haystackNorm, phraseNorm) {
  if (!phraseNorm) return false;
  return (' ' + haystackNorm + ' ').includes(' ' + phraseNorm + ' ');
}
