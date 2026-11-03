# Hat Check — MVP 1 release board

This is the living release tracker for MVP 1 of Hat Check (the Job Decoder). It is
updated on every push, so the status here always reflects what is merged and what is in
flight. Status values are Done, In progress, and To do.

The ticket numbers below match the Notion backlog (Backlog — Hat Check). An earlier
version of this board used a different shorthand; it has been realigned.

Last updated: 2026-11-03 (T03 live recognizer on `feat/t03-live-recognizer` (PR #19,
ADR-0037): the grounded LLM recognizer now runs in `/api/decode`, a pure validator in the
decode domain plus a server gateway, with the validated matches unioned into the keyword
result and a keyword-only degrade when the key is absent. Five `@security` scenarios,
discriminating unit suites, and a fresh-context `judge-arch` review (one real finding, a
slug-alone resolution, fixed). This PR also re-applies the DeepSeek V4.1 Flash default that
was lost from the PR #18 merge, so code, docs, and eval agree. Merged earlier: OpenRouter
plumbing + US-provider pin (PR #18, ADR-0036). T12 still needs labeled fixtures; T14 manual
WCAG pass is the last MVP item.)

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
| T03 | Match wording (keyword + AI recognizer) | Decode engine | 🟢 In progress — keyword matcher done (PR #9); OpenRouter plumbing + US pin merged (PR #18, ADR-0036); live recognizer in `/api/decode` up for review (PR #19, ADR-0037), keyword + validated-LLM union with a keyword-only degrade; merges once reviewed and the key is set |
| T04 | Responsible roll-up | Decode engine | ✅ Done (PR #9) |
| T05 | Classify + verdict bands | Decode engine | ✅ Done (PR #9) |
| T06 | Results stepper (covered / missed / added hats) | Screens | ✅ Done (PR #11) |
| T07 | Receipt + unplaced lines per hat | Screens | ✅ Done (PR #11) |
| T08 | How-it-works (the 16 steps) | Screens | ✅ Done (PR #11) |
| T09 | AI-unavailable fallback ("basic read" label) | Decode engine | ✅ Done (PR #9) |
| T12 | Eval accuracy gate (threshold + labels) | Quality gates | ⏸️ Blocked — harness merged; OpenRouter plumbing + US pin merged (PR #18) and the live recognizer is up (PR #19), so a model run is unblocked once the key is set; a validated threshold still needs labeled fixtures |
| T13 | Security / OWASP scenarios + gate | Quality gates | ✅ Done — dependency-scan gate (PR #12, ADR-0030) and `/api/decode` input-validation gate (PR #17, ADR-0035, pure `validateDecodeInput` + 5 `@security` scenarios) both merged; per-IP rate limiting is a noted follow-up |
| T14 | Accessibility (WCAG / axe gate) | Quality gates | 🟢 In progress — axe coverage for all components merged (PR #16); manual WCAG 2.2 AA pass done (PR #20, ADR-0038): keyboard + a11y-tree audit on the live site, conformance record committed, 4 focus/announcement findings fixed; one audio screen-reader pass is the remaining human step |
| T15 | Licensing (attribution + license gate) | Quality gates | 🟢 In progress — inline CC BY credit added to the Prep screen on `feat/a11y-licensing-gaps`; closes on merge |
| T16 | Resume & application prep | Screens | ✅ Done (PR #13 + PR #14 merged) |
| — | Branch protection on `main` (CI checks block merge) | Infra | ✅ Done |

Tally: 13 tickets done (T01, T02, T04–T11, T13, T15, T16) plus the foundation/infra rows;
2 in progress (T03 AI half, live recognizer up for review in PR #19; T14 manual WCAG pass,
sequenced last); 1 blocked (T12 model selection, unblocked once the key is set but a
validated threshold still needs labeled fixtures). T14's manual WCAG 2.2 AA pass is the last
MVP item.

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
