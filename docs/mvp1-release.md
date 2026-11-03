# Hat Check — MVP 1 release board

This is the living release tracker for MVP 1 of Hat Check (the Job Decoder). It is
updated on every push, so the status here always reflects what is merged and what is in
flight. Status values are Done, In progress, and To do.

The ticket numbers below match the Notion backlog (Backlog — Hat Check). An earlier
version of this board used a different shorthand; it has been realigned.

Last updated: 2026-11-02 (T13 OWASP input-validation gate on `feat/t13-owasp-gate`:
`/api/decode` request rules extracted to a pure `validateDecodeInput` domain check with 5
`@security` scenarios and a discriminating unit suite (ADR-0035). Earlier this day: a11y +
licensing gap-fill merged (PR #16); a status audit corrected PR #12's mis-attribution (it
shipped the T13 dependency-scan gate, not T14/T15).

## Release items

| Ticket | Work | Area | Status |
|---|---|---|---|
| — | Decisions of record: ADRs 0001–0029 | Foundation | ✅ Done |
| — | Eval harness (matching validated) | Foundation | ✅ Done |
| T10 | Three-tier app shell + architecture gate | Platform | ✅ Done |
| — | Architecture gate (mechanical + `judge-arch`) | Platform | ✅ Done |
| — | BDD harness + gates wired into CI | Quality | ✅ Done |
| — | CI pipeline (arch, lint, types, tests, BDD, build) | Infra | ✅ Done |
| — | Vercel deploy — production live | Infra | ✅ Done |
| — | PR stack merged, `main` on Next.js | Infra | ✅ Done |
| T11 | Supabase data tier + snapshot pipeline | Data | ✅ Done (PR #7) |
| T01 | Input screen (title + posting) | Screens | ✅ Done (PR #11) |
| T02 | Title resolution (covered / not-covered) | Screens | ✅ Done (PR #11) |
| T03 | Match wording (keyword + AI recognizer) | Decode engine | 🟢 In progress — keyword matcher done (PR #9); AI half deferred (needs OpenRouter key) |
| T04 | Responsible roll-up | Decode engine | ✅ Done (PR #9) |
| T05 | Classify + verdict bands | Decode engine | ✅ Done (PR #9) |
| T06 | Results stepper (covered / missed / added hats) | Screens | ✅ Done (PR #11) |
| T07 | Receipt + unplaced lines per hat | Screens | ✅ Done (PR #11) |
| T08 | How-it-works (the 16 steps) | Screens | ✅ Done (PR #11) |
| T09 | AI-unavailable fallback ("basic read" label) | Decode engine | ✅ Done (PR #9) |
| T12 | Eval accuracy gate (threshold + labels) | Quality gates | ⏸️ Blocked — harness merged; model selection needs the OpenRouter key + labeled fixtures (not yet run) |
| T13 | Security / OWASP scenarios + gate | Quality gates | 🟢 In progress — dependency-scan gate done (PR #12, ADR-0030); `/api/decode` input-validation gate built on `feat/t13-owasp-gate` (ADR-0035, pure `validateDecodeInput` + 5 `@security` scenarios), closes on merge; per-IP rate limiting is a noted follow-up |
| T14 | Accessibility (WCAG / axe gate) | Quality gates | 🟢 In progress — axe coverage for all components (HowItWorks + DecodeFlow added on `feat/a11y-licensing-gaps`); manual WCAG 2.2 AA pass is the last MVP item |
| T15 | Licensing (attribution + license gate) | Quality gates | 🟢 In progress — inline CC BY credit added to the Prep screen on `feat/a11y-licensing-gaps`; closes on merge |
| T16 | Resume & application prep | Screens | ✅ Done (PR #13 + PR #14 merged) |
| — | Branch protection on `main` (CI checks block merge) | Infra | ✅ Done |

Tally: 11 tickets done (T01, T02, T04–T11, T16) plus the foundation/infra rows; 3 in
progress (T03 AI half, T14 manual WCAG pass, T15 credit fix pending merge); 1 partial
(T13 dependency-scan done, OWASP gate remains); 1 blocked (T12 model selection needs the
OpenRouter key + labeled fixtures). The only fully-unstarted work is the T13 OWASP gate.

## T16 sub-progress (resume & application prep)

| Piece | Status |
|---|---|
| Skills entity added to snapshot (115 skills, typed) | ✅ Done |
| Per-hat detail (skills, activities, deliverables, tools, why) | ✅ Done |
| Integrity gate R4 (skills resolve + typed, fail-closed) | ✅ Done |
| `buildPrepGuide` pure domain logic (ADR-0024) | ✅ Done |
| Decode route returns the prep guide | ✅ Done |
| `judge-arch` review of the logic (2 findings, both fixed) | ✅ Done |
| Part 1 up for review (PR #13) | ✅ Merged |
| `PrepView` five-step screen + copy buttons | ✅ Done |
| `Results` "Prepare your application" button + `DecodeFlow` toggle | ✅ Done |
| Component + `jest-axe` tests (zero violations) | ✅ Done |
| `judge-arch` review of the screen (3 findings, 2 fixed, 1 no-change) | ✅ Done |
| Part 2 up for review (PR #14, stacked on #13) | ✅ Merged |
| Supabase re-sync (skills changed the content hash) | ⬜ Owed (not blocking; app builds from local pinned data) |

## Sequencing notes

- T11 lands first because the decode engine (T03–T05, T09) and the screens (T01, T02,
  T06–T08) all read the snapshot read model it produces.
- T16 is a two-PR stack: the pure logic + data (PR #13) first, then the screen (PR #14)
  on top, so each stays a clean, reviewable change. PR #14 retargets to `main` once #13
  merges.
- `judge-arch` and the architecture gate run before any item here is called done.
- Branch protection comes last, once the full gate set is stable, so the checks become
  merge-blocking without churn while the gates are still being added.

## Still open for MVP 1

- **T13 — OWASP `/api/decode` gate:** the dependency-scan gate is merged (PR #12, ADR-0030).
  The input-validation gate is built on `feat/t13-owasp-gate` (ADR-0035): the request rules
  are a pure `validateDecodeInput` domain check with 5 `@security` scenarios and a
  discriminating unit suite. It closes on merge. Per-IP rate limiting (a flood, not a single
  oversized request) is a noted follow-up, not in MVP1.
- **T03 AI half — grounded LLM recognizer:** needs an OpenRouter key in `.env`. Until then
  the app runs the keyword matcher and labels results a "basic read."
- **T12 — Eval accuracy gate:** the harness is merged, but model selection (running candidate
  models to pick one) needs the OpenRouter key and labeled fixtures, so that half has not run.
