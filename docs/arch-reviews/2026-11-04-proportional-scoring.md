# Architecture review: proportional per-hat scoring (ADR-0039, T-prop-1 to T-prop-4)

- Date: 2026-11-04
- Change: `feat/adr-0039-proportional-scoring` (base `main`)
- Standard: `decisions.md`, ADR-0039, ADR-0028 (two decode twins), ADR-0021 (Responsible roll-up), ADR-0018 (business logic)
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **PASS — 1 low-severity finding, fixed in this change**

## Scope

The ADR-0039 scoring refactor across both decode twins and the result screen:
`src/domain/decode/classify.ts` (proportional per-hat scoring), `types.ts` (ScoredHat /
ScoredNonStandardHat / MatchLevel and the result shape), `index.ts` (passes the item index
into classify), `eval/lib/decode.mjs` (the build-time twin, with a shared `scoreHats`),
`eval/run.mjs` (expected-level derivation + hat-level accuracy), `src/components/Results.tsx`
and `resultSummary.ts` (group by match level, show each hat's share), and the test fixtures
updated for the new hat shape. Every changed code file was reviewed against the four
questions, every cell verdicted with evidence; the grep battery was run.

## What the review confirmed

- The scoring is a reusable pure-domain rule. The grep battery found no `request`,
  `response`, `window`, `document`, `localStorage`, or `fetch` in `classify.ts` and no
  swallowed errors; the logic lives in the domain, not a route or component.
- **Numerator and denominator share one roll-up.** Both read the duties an item rolls up to
  from the shared item index (`items[].duties`, produced by `itemDuties` in `derive.mjs`), so
  a hat's share is always 0..1 and the two decode twins compute the same score, level, and
  Formula D (verified line-by-line: `classify.ts` vs `eval/lib/decode.mjs`).
- Tools (`type === "tool"`) and the `everyone` duty are excluded from the numerator **and**
  the denominator in **both** twins, verified at all four sites.
- `score > 1` is impossible (numerator is a subset of the denominator) and divide-by-zero is
  guarded (`den > 0`, and `standard.length ? … : 0` for Formula D) in both twins.

## Findings

- **F1 (low, data-ownership):** the domain numerator originally iterated `m.duties` (the
  value carried on the Match) while the eval twin recomputed the roll-up from the framework.
  They agree for keyword matches (the matcher copies `item.duties` onto the match), but could
  diverge for an LLM match whose carried duties disagreed with the snapshot item of the same
  slug. **Fixed:** `classify.ts` now derives the numerator's duties from the shared item index
  (the single owner), the same source as the denominator, so the twins cannot diverge.

## Verification

After the F1 fix: `tsc --noEmit` clean; the full Vitest suite passes (113 tests, incl. 4 new
scorer cases — the 25% boundary, a sub-25% partial, tool-only → none, `everyone` never scores,
and a lone-partial Formula D = 50%); the eval harness runs keyword-only and reports hat-level
accuracy; `npm run check:architecture` PASS. The machine-readable record is appended to
`docs/arch-reviews/log.jsonl`.

## Limitation

Matching accuracy is still not measured (T12): the scoring rule is deterministic given a
matched set, but the matched set depends on the keyword + LLM matcher. The worked PM numbers
in ADR-0039 come from one live, non-deterministic run on a posting that is not yet
hand-labeled. The F1 fix closes the only observed twin-divergence vector within the reviewed
files; an LLM-match construction bug elsewhere would still need its own guard.
