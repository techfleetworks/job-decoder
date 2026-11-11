# Hat Check — MVP 1 release board

This is the living release tracker for MVP 1 of Hat Check (the Job Decoder). It is
updated on every push, so the status here always reflects what is merged and what is in
flight. Status values are Done, In progress, and To do.

The ticket numbers below match the Notion backlog (Backlog — Hat Check). An earlier
version of this board used a different shorthand; it has been realigned.

Last updated: 2026-11-10 — MVP1 scope decision: T12's accuracy gate is parked and out of MVP1. CI stays deterministic only, with no LLM step and no accuracy threshold in any merge gate; the eval harness and labeled fixtures stay a run-on-demand tool. A full keyword + LLM eval on 2026-11-10 measured overall item F1 92% and hat-level 97% (single run), recorded for reference only. The remaining MVP1 bones are the OpenRouter production key on Vercel and merging the in-flight PRs.

Previously updated: 2026-11-04 — added the ADR-0039 proportional-scoring refactor as owed work
(T-prop-1 to T-prop-4), reopened T05 and T06 (the refactor changes how hats are classified
and shown), settled T15 to In progress, and updated the decisions row to ADR-0039. The refactor is now
built (classify + eval twins, the result screen, and eval hat-level accuracy; typecheck,
113 tests, and the arch gate green) and open in a PR.

Previously updated: 2026-11-03 (T12 hand-labeled eval fixtures on `feat/t12-labeled-fixtures`
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
| — | Decisions of record: ADRs 0001–0039 | Foundation | ✅ Done |
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
| T05 | Classify + verdict bands | Decode engine | ✅ Done (PR #9) · 🔁 Reopened by T-prop-1/T-prop-2 (ADR-0039): the boolean classify becomes a proportional per-hat score with full / partial / none, and the verdict moves to Formula D |
| T06 | Results stepper (covered / missed / added hats) | Screens | ✅ Done (PR #11) · 🔁 Reopened by T-prop-3 (ADR-0039): hats group by match level (full / partial), not the three covered / missed / added sets |
| T07 | Receipt + unplaced lines per hat | Screens | ✅ Done (PR #11) |
| T08 | How-it-works (the 16 steps) | Screens | ✅ Done (PR #11) |
| T09 | AI-unavailable fallback ("basic read" label) | Decode engine | ✅ Done (PR #9) |
| T12 | Eval harness + labeled fixtures (accuracy gate parked) | Quality gates | ⏸️ Parked — out of MVP1 scope. The eval harness and labeled fixtures (all 11 covered functions) are a run-on-demand tool, not a CI gate. A full keyword + LLM run on 2026-11-10 measured overall item F1 92% (P 95 / R 89) and hat-level 97% (36/37), single run with one 429 fallback; recorded for reference, not gating. Decision 2026-11-10: CI stays deterministic only, no LLM, no accuracy threshold in a merge gate; model-quality tracking is a later concern |
| T13 | Security / OWASP scenarios + gate | Quality gates | ✅ Done — dependency-scan gate (PR #12, ADR-0030) and `/api/decode` input-validation gate (PR #17, ADR-0035, pure `validateDecodeInput` + 5 `@security` scenarios) both merged; per-IP rate limiting is a noted follow-up |
| T14 | Accessibility (WCAG / axe gate) | Quality gates | ✅ Done — axe coverage for all components (PR #16); manual WCAG 2.2 AA pass merged (PR #20, ADR-0038): keyboard + a11y-tree audit on the live site, conformance record committed, 4 focus/announcement findings fixed; one audio screen-reader pass is the remaining human step |
| T15 | Licensing (attribution + license gate) | Quality gates | 🟢 In progress — inline CC BY credit added to the Prep screen on `feat/a11y-licensing-gaps`; closes on merge |
| T16 | Resume & application prep | Screens | ✅ Done (PR #13 + PR #14 merged) |
| T-prop-1 | Proportional per-hat score + full / partial / none; tools excluded; both decode twins | Decode engine | 🟢 In progress — built, in this PR |
| T-prop-2 | Result shape carries per-hat score + match level; title-fit via Formula D | Decode engine | 🟢 In progress — built, in this PR |
| T-prop-3 | Result screens group by match level | Screens | 🟢 In progress — built, in this PR |
| T-prop-4 | Eval scorer reads match levels; fixtures carry an expected level | Quality gates | 🟢 In progress — built, in this PR |
| — | Branch protection on `main` (CI checks block merge) | Infra | ✅ Done |

Tally: 14 MVP tickets done (T01–T11, T13, T14, T16) plus the foundation/infra rows;
1 in progress (T15 licensing — the CC BY credit on the Prep screen, closing on merge);
T12's accuracy gate is parked and out of MVP1 scope (the eval harness stays a run-on-demand
tool);
4 built and in review (T-prop-1 to T-prop-4, the ADR-0039 proportional-scoring refactor —
code, tests, and the arch gate are green in the PR; the reopened T05 and T06 are addressed
by it). The remaining MVP1 bones are the OpenRouter production key on Vercel and merging the
in-flight PRs.

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

- **T12 — Eval harness (accuracy gate parked, out of MVP1):** the harness and the labeled
  fixtures (all 11 covered functions) are a run-on-demand tool, not a CI gate. The 2026-11-10
  run measured overall item F1 92% and hat-level 97% (single run, recorded for reference).
  Decision: CI stays deterministic only, with no LLM step and no accuracy threshold in a merge
  gate. Model-quality tracking is a later concern, not MVP1.
- **T15 — licensing gate:** the inline CC BY credit is on the Prep screen
  (`feat/a11y-licensing-gaps`); closes on merge.
- **T-prop-1 to T-prop-4 — proportional scoring (ADR-0039):** the per-hat score becomes a
  share with full / partial / none match levels, tools stop conferring a hat, and the
  title-fit moves to Formula D. Nothing is built yet; it reopens T05 (classify/verdict) and
  T06 (results grouping). Whether tools still display as evidence is an open decision (owner
  Morgan).

Done since this section last listed them: **T03** (live grounded recognizer merged, PR #19,
ADR-0037) and **T14** (manual WCAG 2.2 AA pass merged, PR #20, ADR-0038).

Resolved since the last board: **T13** (both the dependency-scan gate, PR #12, and the
`/api/decode` input-validation gate, PR #17, are merged; per-IP rate limiting is a noted
follow-up). Per-IP rate limiting is a flood defense, not a single-request one, and is out of
MVP1 scope.
