// Text normalization now lives with the derivation that depends on it, in
// pipeline/lib/text.mjs (ADR-0027). This module re-exports it so the eval harness keeps
// its imports and both the eval and the production build normalize identically.
export { normalize, tokens, contentTokens, includesPhrase } from '../../pipeline/lib/text.mjs';
