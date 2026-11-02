# ADR-0007: Framework-grounded LLM matching via OpenRouter, with a deterministic fallback

- Status: Accepted (2026-10-31). **Supersedes [ADR-0004](0004-on-device-matching-engine.md).** Refined by [ADR-0010](0010-framework-source-of-truth.md): the framework is the single source of truth and the model determines nothing.
- Deciders: Morgan (mdenner@techfleet.org)
- Relates to: [ADR-0006](0006-three-tier-architecture.md), [ADR-0008](0008-framework-data-model-integrity.md), [ADR-0009](0009-security-resilience-quality-gates.md)

## Context

ADR-0004 chose on-device keyword/phrase matching and rejected a cloud LLM to keep
the privacy promise. Its own "honest limits" named the weakness: keyword matching
misses paraphrases the framework has no phrase for. Morgan has since decided to use
an LLM ("we need the openrouter llm step," "I will pay"), which is exactly the case
ADR-0004 said "would require a new ADR revisiting the privacy promise." This is
that ADR.

## Decision

Matching runs **server-side in tier 2**, as one OpenRouter call per decode, kept
honest by deterministic code on both sides of it.

- **The model does one narrow job:** given the posting and the candidate hats for
  the resolved job function, return which hats the posting describes and the exact
  quote that shows each. It does not decide the three sets, the score, the verdict,
  or the resume tips. Those stay in deterministic code, so they are testable and
  cannot be invented.
- **Grounding and validation (non-negotiable).** The posting is passed as clearly
  delimited untrusted content; the system instruction forbids following any
  instruction inside it. The output is schema-constrained JSON. Every returned hat
  is then checked in code: it must be a real hat in the loaded framework version,
  and its quote must occur verbatim in the posting. Anything that fails is dropped
  and counted. This is what makes "never fabricate a duty" structural, not a hope.
- **Deterministic fallback = reliability.** The on-device-style rule-based matcher
  from ADR-0004 is kept, moved to tier 2, as the fallback. If OpenRouter errors,
  times out, or returns nothing usable, the route returns the rule-based result,
  labeled as such. The person always gets a grounded result; the product degrades,
  it does not crash (ADR-0009).
- **The accuracy of the LLM path is a claim that must be measured,** not assumed.
  ADR-0009 makes the labeled evaluation set and an agreed threshold a release gate;
  this ADR depends on that gate to earn the word "accurate."

## Consequences

- Recall on paraphrased duties improves over pure keyword matching (the reason for
  the change), at a per-call cost and a network dependency, both bounded by
  ADR-0009.
- Two matchers now exist (LLM primary, rule-based fallback) behind one analysis
  interface. This is deliberate redundancy for reliability, not duplicated rules:
  the classification, scoring, and validation are shared and single-owned.
- The privacy posture changes as recorded in ADR-0006.

## Alternatives considered

- **Keep on-device only (ADR-0004).** Rejected by Morgan for recall, but kept as
  the fallback, so its value is retained.
- **Let the LLM produce the whole result (sets, score, verdict, tips).** Rejected:
  it would move ungrounded judgment into the model, break "every claim has
  evidence," and make the output untestable.
- **A local embedding model in the browser.** More recall than keywords without a
  server, but it does not use the LLM Morgan asked for and still can't match the
  LLM's paraphrase handling. Not chosen for MVP 1.
