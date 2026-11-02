# Architecture review: the input and result screens (T01, T02, T06 to T08)

- Date: 2026-11-02
- Change: `feat/screens` (stacked on `feat/decode-engine`)
- Standard: `decisions.md`, ADR-0011, ADR-0013, ADR-0028, ADR-0029
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **3 findings (1 med, 2 low), all fixed in this change**

## Scope

The tier-1 screens: the input form, the result stepper with per-hat evidence, the
how-it-works panel, the session-store owner, and the client call to `/api/decode`. 9 files
reviewed against the four questions, every cell verdicted with evidence; the grep battery
was run.

## What the review confirmed

- `sessionStorage` is touched only in `src/data/session/sessionStore.ts` (grep-confirmed),
  the single owner the gate allows. State is session-only and owned in one place.
- No tier-1 file imports the Supabase client or reads a secret; the browser calls
  `/api/decode` through the client wrapper, never the database. No literal colors in any
  component. The mechanical gate is clean.
- The decode client reports a plain-language message on every failure path, with no swallow.
- The user-facing wording and verdict mapping live in the pure, tested `resultSummary`
  helper, and the how-it-works steps are single-owned with a count test.

## Findings (all fixed)

- **F1 (med, accessibility):** the result moved focus to the step heading, so the verdict
  headline (the most important line) was skipped for screen readers, and a not-covered
  result moved focus nowhere, dropping the user's place. The "working" state also had no
  live region. **Fixed:** focus now moves to the verdict headline on mount for both covered
  and not-covered results, the per-step focus move is kept for later step changes, and the
  input has a visually hidden `role="status"` live region for the working state.
- **F2 (low, boundary):** the tier wording ("exact wording" / "close wording") lived in the
  component, outside the tested helper, so a copy regression could ship unnoticed. **Fixed:**
  moved `tierWording` into `resultSummary.ts` and covered it with a test.
- **F3 (low, robustness):** a restored session scan was cast to `DecodeResult` with no shape
  check, so a scan saved before a shape change could crash the render. **Fixed:** a pure
  `isDecodeResult` guard validates the restored value, and an invalid one is discarded and
  cleared instead of rendered.

## Verification

After the fixes: `tsc --noEmit` clean, the screens Vitest suite passes (component and
jest-axe accessibility tests), the architecture gate passes, and the BDD suite runs the
screens scenarios green. The machine-readable record is appended to
`docs/arch-reviews/log.jsonl`.

## Limitation

The accessibility checks are automated (jest-axe) plus this review; a full manual
screen-reader pass across browsers is the T15 accessibility-gate work. An uncovered title
names a few supported titles rather than listing the full set (the result does not carry it).
