# ADR-0010: The framework is the single source of truth; the LLM recognizes wording only

- Status: Accepted (2026-10-31). Refines [ADR-0007](0007-grounded-llm-matching.md).
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Morgan, verbatim: "I do not want AI to determine anything. I only want to check
against the data in the Skills & Practices Framework. This is very important. The
SPF framework is the source of truth." ADR-0007 already limited the LLM to
extraction; this ADR makes the boundary absolute and names the SPF snapshot as the
authority for every claim the app shows.

## Decision

- **The SPF snapshot is the single source of truth** for every hat, number, and
  verdict shown.
- **The LLM does exactly one job:** given the posting and the candidate SPF
  activities/tasks for the resolved job function, recognize which of those items the
  posting describes in its own words, and return the exact quote. It outputs only
  SPF slugs chosen from the candidates it was handed, plus evidence spans.
- **The LLM determines nothing else.** The expected hats, the matched / missing /
  non-standard split, the match score, and the title-fit verdict are computed by
  deterministic code from SPF. Plain-language meaning and resume items are read
  straight from SPF fields.
- **Two structural guards:** every returned slug must exist in SPF or it is
  dropped; every quote must occur verbatim in the posting or it is dropped. The
  model can only ever surface SPF items; it cannot invent one.
- **Deterministic matcher runs always, not only as a fallback** ([ADR-0014](0014-receipt-visible-misses-union-matching.md)): keyword/synonym matching against SPF is unioned with the LLM's recognitions on every decode, and is the full result when the LLM is unavailable. The product works with no AI at all.

## Consequences

- The trust claim ("grounded in a real standard, not AI opinion") becomes
  structural, not a hope. The LLM only raises recall of the recognition step; it
  touches no number and no verdict.
- "Accurate" still depends on the eval gate (ADR-0009); recognition quality is
  measured, not assumed.
- Dropping the LLM entirely stays an option (SPF-only keyword matching), at lower
  recall on paraphrased duties.

## Verify

The validation (slug-exists-in-SPF, quote-in-posting) is a deterministic function
with a discriminating test: feed a hallucinated slug and a fabricated quote and
require both dropped (verifiable-quality-gates).

## Alternatives considered

- **Let the LLM classify or score.** Rejected by Morgan: the AI must determine
  nothing. SPF decides.
- **No LLM at all.** Viable (keyword matching), kept as the fallback; the LLM is
  used only to catch reworded duties.
