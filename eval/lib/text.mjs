// Shared text normalization for matching posting wording to framework labels.
// Lexical only: lowercase, fold punctuation to spaces, collapse whitespace.
// Deliberately NOT a stemmer. It makes matches explainable and predictable,
// at the honest cost of missing paraphrase (see eval/README.md, limits).

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
