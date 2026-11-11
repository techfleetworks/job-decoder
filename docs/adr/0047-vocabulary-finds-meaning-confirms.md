# ADR-0047: Vocabulary finds, meaning confirms — the recognizer gates lexical matches

- Status: Accepted
- Date: 2026-11-10 (ratified 2026-11-10)
- Deciders: Morgan (mdenner@techfleet.org)
- Refines: [ADR-0014](0014-receipt-visible-misses-union-matching.md) (always-on union of keyword + LLM). Builds on [ADR-0007](0007-grounded-llm-matching.md) and [ADR-0037](0037-live-llm-recognizer-in-decode.md) (grounded recognizer, anti-corruption), [ADR-0025](0025-match-all-items-ai-matches-need-quotes.md) (match all items, verbatim quotes).
- Tracks ticket: T24. Related: T22 (implied-hat walk), T23 (hat-first analysis).

## Context

Matching keys on shared words, not meaning. Two facts in the current code make this concrete:

- `keywordMatch` (`src/domain/decode/match.ts`) matches a framework item when its label, a reviewed translator-table alias, or every content token of a two-word-or-longer label appears in one posting unit. There is no check that the surrounding sense fits the item. It cannot tell software "quality assurance" from building-commissioning "quality assurance."
- `unionMatches` (same file) keeps every keyword match unconditionally, unioned with the LLM's recognitions. A keyword match the recognizer never confirmed still reaches the result. `parseRecognitions` (`src/domain/decode/recognize.ts`) validates that a returned item is a real framework slug and that its quote is verbatim, but it does not judge whether the meaning fits.

The result is shared-word false positives. In the 30-posting test, EEI (building commissioning) matched the hat **QA Analysis** off the words "quality assurance"; a hardware product-development role and a utility PMO matched software and product activities. Any posting that borrows product or agile vocabulary picks up hats it does not really involve. This directly lowers accuracy, and because the T22 implied-hat walk starts from these base matches, one bad base match multiplies into implied-hat noise.

ADR-0014 chose the always-on union on purpose: the keyword path is the recall net and the floor, so an LLM outage degrades quality rather than denying an answer. That trade bought recall and resilience at the price of letting unconfirmed lexical matches through. The 30-posting evidence shows that price is now material.

## Decision

Make matching two steps, both required: **vocabulary finds candidates, meaning confirms them.**

- **Find (vocabulary).** Keyword matching plus the roughly 300-term observed-synonym bank (`translator-table.csv`) and the alias table produce candidate matches, as today. Fast, high recall, blind to meaning.
- **Confirm (meaning).** The recognizer, which already reads the whole posting, becomes the meaning judge. A lexical candidate is kept as a confident match only if the recognizer confirms its sense fits the item in this posting's context. A lexical candidate the recognizer does not confirm does not pass as a confident match.
- **Anti-corruption is preserved exactly** (ADR-0007, ADR-0037). The meaning step can only ever remove or demote a candidate; it can never add one. The model still cannot introduce an item outside the framework, and a quote must still be verbatim. The existing `@security` scenarios keep holding unchanged.
- **This refines ADR-0014.** The union is no longer "keyword kept unconditionally." Keyword stays the recall engine; meaning-confirmation gates what is presented as confident.
- **Measurement.** Add out-of-domain NEGATIVE fixtures to the eval (a building-commissioning PM, an RV electrical engineer) that must NOT match software or product hats, and track the false-positive rate on them alongside the existing precision and recall.

## Decisions ratified (2026-11-10, Morgan)

The three sub-decisions below were open at drafting and were ratified by Morgan on 2026-11-10. They are now part of the decision.

1. **Unconfirmed lexical candidate: demote, not drop.** A lexical candidate the recognizer does not confirm is kept at low confidence, not hard-dropped, so the receipt still shows it as a weak signal and the user keeps visibility, consistent with ADR-0014's "misses and matches are visible, never silent." The results confidence signal (the hat-first vision spec, Stage 7) governs how a low-confidence match is shown.
2. **Confirm mechanism: B.** Keep the recognizer's independent recognition and treat a lexical match the recognizer did not also recognize as unconfirmed, rather than adding an explicit per-candidate confirm pass. This reuses the existing single recognizer call, adds no new prompt surface, and leaves the anti-corruption boundary untouched. Mechanism A (an explicit confirm or reject pass) is held as a fallback only if B's agreement proves too coarse in testing.
3. **Recognizer unavailable: words-only basic read, labeled low confidence.** When the recognizer is down, lexical matches are shown as a basic read, clearly labeled low confidence, rather than suppressed, keeping ADR-0037's safe-degrade principle. The honest consequence stands: without the model the meaning guarantee is absent, which is why the label matters.

## Consequences

- **Accuracy up.** Shared-word false positives are removed or demoted at the source, and T22's implied-hat noise shrinks because the base matches are cleaner. Fixing the base matches is the single highest-leverage accuracy change, which is why T24 precedes T22 in build order.
- **The keyword path is no longer a standalone confident result.** Its matches become candidates pending meaning confirmation. This is a real dependency shift: ADR-0014's "keyword is the floor" becomes "keyword is the recall net; meaning is the floor for confidence." Stated plainly, when the recognizer is unavailable we fall back to words-only with a clear low-confidence label.
- **Cost.** The decode leans more on the recognizer, and the basic read becomes explicitly lower trust. With confirm mechanism B, latency and spend are unchanged because it reuses the one recognizer call already made.
- **Honest limits.** The recognizer's meaning judgment is itself a model call, so it is neither perfect nor fully deterministic. The negative fixtures measure the false-positive rate but cannot prove it is zero. Whichever of drop or demote is chosen, the design must keep a wrong confirmation recoverable through the receipt, so a meaning miss is visible rather than silent.

## Alternatives considered

- **Keep the always-on union unchanged (ADR-0014 as is).** Rejected: the 30-posting test shows shared-word false positives now materially hurt accuracy and feed the T22 walk with noise.
- **Curate the translator table to remove ambiguous synonyms.** Rejected as the primary fix: it is whack-a-mole, it cannot cover context-dependent sense (the same word is right in one domain and wrong in another), and it costs recall. The table stays as the recall net; meaning-confirmation is what handles context.
- **A separate deterministic domain classifier (rules) instead of the recognizer.** Rejected: it duplicates the context understanding the recognizer already has, and meaning-in-context is exactly what the model does better than rules. Keep one meaning authority.

## Verify (Confirmation)

When this is built, the decision is held to the code by:

- Negative out-of-domain fixtures in the eval that must yield zero software or product hats, with a test asserting the false-positive rate on them.
- A test asserting an unconfirmed lexical candidate is dropped or demoted, per the resolved open decision 1.
- The existing `@security` scenarios (`recognizer-injected-slug`, `recognizer-fabricated-quote`, `recognizer-extra-fields`, `recognizer-garbled-output`) continuing to pass unchanged, proving the meaning step never weakened the anti-corruption guarantee.
