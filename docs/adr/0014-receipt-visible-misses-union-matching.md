# ADR-0014: Receipt, visible misses, and an always-on union of LLM + keyword matching

- Status: Accepted (2026-10-31). Refines [ADR-0007](0007-grounded-llm-matching.md) and [ADR-0010](0010-framework-source-of-truth.md).
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Translating a posting's wording to the framework's vocabulary is error-prone, and
Morgan expects it to miss things. The goal: make it structurally hard to translate
*wrong*, make every *miss* visible rather than silent, and show the user a receipt
of how the posting was read. Fully preventing misses is not achievable; bounding and
surfacing them is.

## Decision

- **Receipt in the UI.** Every match is shown as the posting quote mapped to the
  framework hat, so the user can check each translation. Nothing is shown without a
  verbatim quote (written hats) or a named framework rule (expected hats). This makes
  a *fabricated* mapping impossible: it would have no valid quote.
- **Misses are visible.** The UI lists the posting lines that mapped to no framework
  item ("lines we could not place"), so a miss is never silent.
- **The hidden-hats insight does not depend on the AI.** The "expected but missing"
  set is computed from the framework for the title and does not depend on the AI
  reading the posting. An AI miss can never hide a hidden hat, which is the product's
  most valuable output.
- **Always-on union.** The deterministic keyword/synonym matcher runs on every
  decode, unioned with the LLM's recognitions, not only as a fallback. The LLM
  catches reworded duties; the keyword matcher catches exact framework terms the LLM
  dropped; each covers the other's blind spot. The deterministic path remains the
  full result when the LLM is unavailable. (This supersedes the fallback-only stance
  in ADR-0007 and ADR-0010 for the live path.)
- **Recall is measured.** The accuracy eval gate (ADR-0009, ADR-0010) measures
  precision and recall on labeled postings and blocks release below an agreed
  threshold, so the miss rate is bounded and tracked.

## Consequences

- Fabrication is impossible; misses are visible and measured; the core insight is
  AI-proof. Trust shifts from "believe the AI" to "check the receipt."
- Costs: the union can raise false positives (more candidate matches), mitigated by
  the framework validation and by the receipt letting the user discard a bad match;
  the receipt and unmapped-lines list add UI.

## Verify

- A test asserts no hat is ever returned without a quote (written) or a named rule
  (expected).
- A test asserts unmapped posting lines are surfaced.
- A test asserts the union includes keyword-only matches the LLM missed, and
  LLM-only matches the keyword pass missed.
- The eval harness reports precision/recall per set against labeled fixtures.

## Alternatives considered

- **LLM-only matching.** Rejected: a single pass misses more and gives the user no
  cross-check.
- **Keyword-only matching.** Viable and fully deterministic, but misses paraphrase;
  kept as one half of the union and as the fallback.
- **Hide low-confidence misses.** Rejected: silent misses are the failure Morgan
  called out; they must be shown.
