# ADR-0019: Eval harness for model selection and data-flow proof

- Status: Accepted
- Date: 2026-11-01
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: ADR-0007 (grounded LLM matching), ADR-0010 (framework is the source of
  truth), ADR-0014 (receipt, visible misses, always-on union), ADR-0016 (item to
  duty roll-up via RACI), ADR-0017 (skills route to activities).

Note: ADRs 0005 through 0018 live on branch `docs/adr-0005-mvp1-scope`, not yet
merged, so they are referenced here by number rather than by file link.

## Context

Before building the three-tier app we need to pick the OpenRouter model and prove
the decode data flow (backlog ticket T12). The decode's accuracy rests mostly on
one uncertain step: how well a posting's wording is recognized as framework items.
We want a measurable, repeatable way to compare models and to check the keyword
baseline and the grounding/validation, without first paying to build the app.

## Decision

Build a dependency-free Node eval harness in `eval/` that runs the same decode
pipeline the app will use and measures leaf-item precision and recall against
human-labeled postings.

- **Match across all leaf items** (activities, deliverables, tools), not narrowed
  to the resolved function, so non-standard hats can surface. The title is used for
  classification only. The full candidate set is about 221 items, small enough to
  hand the model in one prompt, so scoping for token cost is unnecessary.
- **The LLM recognizes wording only and decides nothing.** Its output is validated
  against the framework (the slug must be a candidate; any supplied quote must be
  verbatim in the posting) and dropped otherwise. The deterministic keyword matcher
  always runs; the result is the union of both. This matches ADR-0007, 0010, 0014,
  0016, and 0017.
- **Metric:** precision, recall, and F1 per entity type and overall, micro-averaged
  across fixtures. The model is chosen by measured accuracy.
- **Operational:** the key is read from `OPENROUTER_API_KEY` only; the endpoint is
  fixed; the call has a timeout; a failure degrades to the keyword-only result.

Patterns: a pipeline (load, match, union, roll up, classify, score), a gateway plus
anti-corruption layer around the model call, and a strategy split between the
keyword and LLM matchers behind one union.

## Consequences

- Model choice and the data flow become evidence instead of assertion. The harness
  shares the decode pipeline with the app, so what it measures is what will ship.
- **Honest limit:** precision and recall are only meaningful with real labeled
  postings. Until those exist the accuracy is `not-assessed`; what is `observed` is
  that the harness runs and computes. The keyword matcher is lexical and misses
  paraphrase, which is the reason the LLM step exists and what the harness measures.
- The harness is a developer tool, not the production endpoint. Its security
  controls are implemented here; the executable `@security` scenarios for the
  `/api/decode` route are tracked under ticket T13.

## Alternatives considered

- **Scope candidates to the resolved function** (fewer prompt tokens): rejected. It
  blocks non-standard-hat detection and is unnecessary at about 221 items.
- **Test inside the app after building it:** rejected. It couples model selection to
  the app build and makes comparing models harder.
- **Add a test framework or dependencies:** rejected. A dependency-free script is
  enough and runs anywhere Node 18+ is present.

## Update 2026-11-01: tightened matcher and coverage audit

The first real posting (a Greenhouse UX Designer role) showed the keyword matcher's
"similar" tier (all content tokens anywhere in the text) producing many false
positives, because a long posting scatters common words like "plan", "market", and
"business". Two changes:

- **Scope matching to a line or sentence.** A "similar" match now needs all of the
  label's content words in one unit, not anywhere in the posting. This removes the
  scattered-word false positives while keeping genuine near-matches.
- **Coverage audit.** The matcher returns one record per posting line, each matched
  or unplaced, so every line is accounted for by construction. This is 100%
  line-accountability, not matching accuracy: a line can be audited and still be
  matched wrong or missed. Accuracy stays a measured property that the LLM step and
  labeled data improve.

## Amendment 2026-11-01: AI quotes and the release gate (v1 audit)

- **AI quotes are required (ADR-0025).** The rule above ("any supplied quote must be
  verbatim") let an AI match with no quote through. A match the AI proposes is now
  dropped unless it quotes the posting word for word, and a kept AI-only match is
  tiered as similar, not exact. The harness code must be changed to match.
- **The release gate (Morgan).** Baseline first: label real postings, run the harness
  for a baseline, then Morgan sets the precision and recall bar from those numbers
  and approves the model. Both are recorded in an ADR, and a CI eval gate fails any
  change below the bar. Still open: who labels the postings. Until then, accuracy is
  not assessed and the gate does not exist (ticket T12, status Development).
