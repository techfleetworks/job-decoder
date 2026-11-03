# Hat Check — MVP 1 release board

This is the living release tracker for MVP 1 of Hat Check (the Job Decoder). It is
updated on every push, so the status here always reflects what is merged and what is in
flight. Status values are Done, In progress, and To do.

The ticket numbers below match the Notion backlog (Backlog — Hat Check). An earlier
version of this board used a different shorthand; it has been realigned.

Last updated: 2026-11-03 (T12 hand-labeled eval fixtures on `feat/t12-labeled-fixtures`
(PR #21): `eval/fixtures.labeled.json`, a strong-match posting for eight of the eleven
covered job functions (ui-designer, ux-writer, agile-coach not yet covered) plus a
title-fit mismatch and a not-covered title, labeled by hand from the framework.
Keyword-only baseline observed at overall P 97% / R 37% (the low recall is the point: the
postings paraphrase the work the LLM step exists to catch). The LLM accuracy and the
selection threshold are still open, pending the key and Morgan's decision. Merged since the
last update: T03 live recognizer (PR #19, ADR-0037) and the T14 manual WCAG 2.2 AA pass
(PR #20, ADR-0038), both now in `main`.)

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
| T03 | Match wording (keyword + AI recognizer) | Decode engine | ✅ Done — keyword matcher (PR #9); OpenRouter plumbing + US pin (PR #18, ADR-0036); live recognizer in `/api/decode` merged (PR #19, ADR-0037), keyword + validated-LLM union with a keyword-only degrade; runs live once the key is set |
| T04 | Responsible roll-up | Decode engine | ✅ Done (PR #9) |
| T05 | Classify + verdict bands | Decode engine | ✅ Done (PR #9) |
| T06 | Results stepper (covered / missed / added hats) | Screens | ✅ Done (PR #11) |
| T07 | Receipt + unplaced lines per hat | Screens | ✅ Done (PR #11) |
| T08 | How-it-works (the 16 steps) | Screens | ✅ Done (PR #11) |
| T09 | AI-unavailable fallback ("basic read" label) | Decode engine | ✅ Done (PR #9) |
| T12 | Eval accuracy gate (threshold + labels) | Quality gates | 🟢 In progress — harness merged; hand-labeled starter fixtures added (PR #21), keyword baseline measured (overall P 97% / R 37%); a model run against the labels is unblocked once the key is set, and the selection threshold is Morgan's decision |
| T13 | Security / OWASP scenarios + gate | Quality gates | ✅ Done — dependency-scan gate (PR #12, ADR-0030) and `/api/decode` input-validation gate (PR #17, ADR-0035, pure `validateDecodeInput` + 5 `@security` scenarios) both merged; per-IP rate limiting is a noted follow-up |
| T14 | Accessibility (WCAG / axe gate) | Quality gates | ✅ Done — axe coverage for all components (PR #16); manual WCAG 2.2 AA pass merged (PR #20, ADR-0038): keyboard + a11y-tree audit on the live site, conformance record committed, 4 focus/announcement findings fixed; one audio screen-reader pass is the remaining human step |
| T15 | Licensing (attribution + license gate) | Quality gates | 🟢 In progress — inline CC BY credit added to the Prep screen on `feat/a11y-licensing-gaps`; closes on merge |
| T16 | Resume & application prep | Screens | ✅ Done (PR #13 + PR #14 merged) |
| — | Branch protection on `main` (CI checks block merge) | Infra | ✅ Done |

Tally: 15 tickets done (T01–T11, T13, T14, T15, T16) plus the foundation/infra rows;
1 in progress (T12 model selection: labeled fixtures and the keyword baseline are in,
PR #21; the live model run needs the key and the threshold is Morgan's decision). With T03
and T14 merged, T12 is the only open MVP ticket, and it is unblocked for a model run once
`OPENROUTER_API_KEY` is set.

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

- **T03 AI half — grounded LLM recognizer:** the OpenRouter plumbing and US-provider pin are
  ready (PR #18, ADR-0036). What remains is the live recognizer in `/api/decode` (the next
  PR) and the key in `.env` / Vercel. Until the key is set the app runs the keyword matcher
  and labels results a "basic read."
- **T12 — Eval accuracy gate:** the harness is merged and the OpenRouter pin is ready, so a
  model run is unblocked once the key is set; a validated threshold still needs hand-labeled
  fixtures.
- **T14 — manual WCAG 2.2 AA pass:** the last MVP item, by decision. Keyboard, screen reader,
  contrast, and the 2.2-specific criteria on the live site; axe coverage is already in CI.

Resolved since the last board: **T13** (both the dependency-scan gate, PR #12, and the
`/api/decode` input-validation gate, PR #17, are merged; per-IP rate limiting is a noted
follow-up). Per-IP rate limiting is a flood defense, not a single-request one, and is out of
MVP1 scope.
