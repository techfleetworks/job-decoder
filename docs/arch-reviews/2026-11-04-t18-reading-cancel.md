# Architecture review: T18 Reading screen and cancel for a running decode (ADR-0044)

- Date: 2026-11-04
- Change: `feat/t18-reading-cancel` (base `main`)
- Standard: `decisions.md`, ADR-0044 (Reading/cancel), ADR-0038 (focus management), ADR-0043 (decode route + failure reasons), ADR-0013 (UI design system)
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **PASS — 0 findings, matrix complete and clean**

## Scope

The T18 build: `src/components/Reading.tsx` (new Reading screen — focused heading, polite
status live region, `CircularProgress` aria-hidden, still-working after 8s, Cancel),
`src/components/DecodeFlow.tsx` (AbortController per submit, `cancel()` aborts + remounts the
form seeded with the last input, a `signal.aborted` race guard, renders `<Reading>` while
working), `src/components/InputForm.tsx` (removed the `working` prop and inline live region;
added `initialTitle`/`initialPosting` seed props), and `src/data/decodeClient.ts` (optional
`AbortSignal`, re-throws `AbortError` instead of mapping it to a failure). Every changed source
file was reviewed against the four questions; every cell verdicted with evidence; the grep
battery was run.

## Matrix (4 files × 4 questions)

| File | Boundary | Ownership | Dependency | Error handling |
|---|---|---|---|---|
| Reading.tsx | cleared (pure presentation) | cleared (local `slow` UI state only) | cleared (tier-1; no fetch/storage/domain) | cleared (clearTimeout cleanup; no catch) |
| DecodeFlow.tsx | cleared (orchestrates screens; no match/score/verdict) | cleared (single owner of `submitted`/`working`) | cleared (data via `decodeClient`/session seam; domain via pure `isDecodeResult`) | cleared (catch reports real failures, re-throws AbortError; race guard strands nothing) |
| InputForm.tsx | cleared (form validation, not a business rule) | cleared (own edit buffer, one-way seed) | cleared (MUI + pure domain constants only) | cleared (early-return validation) |
| decodeClient.ts | cleared (tier-1 transport→typed response) | cleared (stateless) | cleared (`fetch` expected; no request/session/env) | cleared (reports typed error; re-throws AbortError; inner `.json().catch` recovers then reports) |

Over-/under-engineering: cleared. The `formKey` remount is the idiomatic React "reset child
state on identity change" pattern (InputForm seeds `useState` from props at mount) and also
drives `autoFocusHeading={formKey > 0}`; justified, not gratuitous.

## What the review confirmed

- **Race guard correct, no stranded state.** `cancel()` aborts, sets `working=false`, bumps
  `formKey`. If the fetch resolved just before abort, `handleSubmit` returns early on
  `signal.aborted` without touching state (working already false); if it rejects with
  `AbortError`, `decodeClient` re-throws and the catch's AbortError branch does nothing. Both
  paths end at `working=false` with the seeded form. `error`/`errorReason` were cleared at
  submit start, so no stale error screen.
- **Cancel is never an error.** `decodeClient` re-throws `AbortError`; `DecodeFlow`'s only
  production caller catches it and sets no error. (`rg decodePosting src` → sole caller
  `DecodeFlow.tsx:54`; rest are tests.)
- **Single data owner.** `submitted` lives only in `DecodeFlow`; `InputForm` copies it into its
  own edit buffer once at mount (one-way seed), no "kept in sync" mirror.

## Findings

None. All four files pass all four questions with re-runnable evidence; no waiver needed.

## Grep battery (run from repo root by the reviewer)

- `rg -n -i '\b(request|response|session|cookie|window|document|localStorage)\b' src/data/decodeClient.ts` → comment-text only, no runtime use.
- `rg -n 'catch\s*\(?[^)]*\)?\s*\{\s*\}|\.catch\(\s*\(\)\s*=>' DecodeFlow.tsx decodeClient.ts Reading.tsx` → one hit `decodeClient.ts:31` (`res.json().catch(()=>({}))`, recovers then reports) — not an empty catch.
- `rg -n -i '\b(match|score|verdict|rollup|classif|resolve)\b' DecodeFlow.tsx Reading.tsx InputForm.tsx` → no output (no business rule in tier-1).
- `rg -n -i 'localStorage|indexedDB' <4 files>` → none.
- `rg -n '#[0-9a-fA-F]{3,6}\b|rgb\(|rgba\(' <3 components>` → none (theme tokens only).
- `rg -n -i 'supabase|createClient|process\.env' <4 files>` → none.

## Gate result

`npm run check:architecture` PASS; full 12-check suite green (148 unit tests, 40 BDD scenarios).

## Limitation

Reviewer did static read + grep and traced the cancel/race state machine; did not run the app
in a browser. The interaction itself is pinned by vitest component tests (focus, still-working
threshold, cancel-restores-input, no-race) and the cucumber cancel-contract feature, all
blocking in CI.
