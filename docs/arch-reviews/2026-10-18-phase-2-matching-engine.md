# Architecture review — Phase 2 matching engine

- Date: 2026-10-18
- Change: branch `feat/phase-2-matching-engine` (base `feat/phase-1-data-layer`)
- Scope: shared text util, duty evidence index, JD matcher, posting analysis +
  honesty verdict, plain-language duty detail, ADR-0004.
- Standard: [decisions.md](../../decisions.md),
  [ADR-0002](../adr/0002-framework-data-layer.md),
  [ADR-0004](../adr/0004-on-device-matching-engine.md)
- Review context: fresh (general-purpose subagent, separate from the authoring
  context)

## Verdict

Fresh-context judge-arch returned **PASS** with one advisory finding and one low
note, **both resolved**. All four architectural questions are clean across the 8
code files; the engine is fully in the pure domain layer and does no I/O.

Grep battery (observed clean): no `fetch` / `localStorage` / `window` / `document`
anywhere in `src/domain` (engine included); no network calls at all (matching is
fully on-device, per ADR-0004); exactly one normalizer, in `text.ts` (the inline
copy in `coverage.ts` was removed). The mechanical gate passes.

## Findings and resolutions

### F1 (medium) — new schema-string constants were not pinned by any test

Phase 2 added duty field-name constants (`Activities`, `Responsible Deliverables`,
`Skills Required For the Duty`, `Unique Required Tools`, and three plain-language
fields). The fixture exercised none of them, so a typo in a string would silently
produce empty phrases / empty detail with nothing to catch it — the one place a
mistake in externally-owned schema strings could quietly degrade the core feature.

**Resolved:** the fixture's UX duty now populates every new field; `evidence.test`
pins each array field's label → source, and `dutyDetail.test` asserts the
plain-language fields come back non-empty (with the empty-field path tested on a
different duty). A future typo now fails the suite. The strings match the live
`duties.json` schema inspected while building the engine.

### F2 (low) — verdict thresholds undocumented

**Resolved:** ADR-0004 now records the `strong >= 0.6` / `partial >= 0.25` bands and
their rationale.

## Verification (main session)

- `npm run check:architecture` → **PASS**
- `tsc -b` + `vite build` → clean
- `npm run test:run` → **65/65 passing** (21 new engine/text tests, including the
  field-pinning tests that close F1).

## Limitation

The subagent ran the gate and the domain tests (green) but not the full build or a
live-dataset run (no dataset is bundled in the repo). Live-schema correctness is
verified against the `duties.json` inspected during the build and is now pinned by
the fixture tests.
