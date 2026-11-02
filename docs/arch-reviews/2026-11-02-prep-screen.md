# Architecture review: T16 part 2 — the "Prepare your application" screen

- **Date:** 2026-11-02
- **Change:** `feat/prep-screen` (base `feat/resume-prep`, stacked on #13)
- **Scope:** `src/components/PrepView.tsx` (new), `src/components/PrepView.test.tsx` (new), `src/components/DecodeFlow.tsx` (modified), `src/components/Results.tsx` (modified)
- **Standard:** ADR-0006 (three tiers), ADR-0011 (session-only state, single owner), ADR-0024 (resume prep), ADR-0029 (restore-with-shape-check)
- **Review context:** fresh (general-purpose subagent, not the authoring context)

## Verdict

**PASS.** The matrix (4 files × 4 questions) was observed clean against all four questions: no
business rule leaked into tier-1 (the prep logic stays in `src/domain/decode/prep.ts`), no session
or storage write outside the single owner `src/data/session/sessionStore.ts`, no secret / DB /
transport import in the components, and the one intentional `catch` (the clipboard no-op) is a
defensible silent-degrade. Three findings, all low severity, none needing a waiver.

## Findings and resolutions

- **F1 (low, error-handling/data-ownership) — fixed.** `DecodeFlow` restored a saved scan with
  `isDecodeResult`, which validated the `DecodeResult` fields but not `prepGuide`. A tab left open
  across a deploy that changed the prep shape could restore a stale-shape guide, and the
  truthiness-only guard would let `PrepView` dereference a missing list and crash the render.
  **Fix:** `isDecodeResult` now also checks the prep guide's shape (`isPrepGuideShape`) and rejects
  the whole scan when it is malformed, with a discriminating test in `decode.test.ts`.
- **F3 (low, dependency-direction) — fixed.** `PrepView` deep-imported member types from
  `@/domain/decode/prep` because the index did not re-export them (type-only, no runtime coupling).
  **Fix:** the index now re-exports `HighlightItem`, `KeywordGroup`, `OutcomeTemplate`, `PrepPoint`,
  and `SkillPrepItem`; `PrepView` imports from the `@/domain/decode` front door.
- **F2 (low, error-handling) — no change.** `copy()` swallows a blocked-clipboard error on purpose.
  Confirmed a legitimate silent-degrade: there is no success signal either, so a failure is never
  misrepresented as success, the text stays on screen for manual selection, and no state is
  corrupted. Limitation: the person gets no "copy failed" signal; optional future hardening only.

## Grep battery (observed clean)

Over the four component files: no direct `sessionStorage`/`localStorage`/`window`/`document`/`cookie`
(only `DecodeFlow`'s import of the sanctioned session owner); no `fetch`/`axios` (that lives in
`decodeClient`, the correct tier); no `supabase`/`service_role`/`secret`/`process.env`; the only
`catch`/`return null` hit is the sanctioned clipboard no-op; `navigator.clipboard` is allowed tier-1.

## Mechanical gate and author verification

`npm run check:architecture` → PASS. After the F1/F3 fixes: `tsc` clean, **76** Vitest tests
(4 new for `PrepView` incl. a zero-violation `jest-axe` pass, 3 new for `isDecodeResult` incl. the
fail-closed branch), `next lint` clean, `next build` clean, all BDD gates PASS (5 features, 25
scenarios, datastore in sync).

## Limitation

The reviewer read the diff and named dependency files; it did not exercise the live UI. The F1 crash
path was `inferred` from the truthiness-only guard, not reproduced at runtime; the added test proves
the guard now rejects the stale shape.
