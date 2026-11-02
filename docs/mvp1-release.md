# Hat Check — MVP 1 release board

This is the living release tracker for MVP 1 of Hat Check (the Job Decoder). It is
updated on every push, so the status here always reflects what is merged and what is in
flight. Status values are Done, In progress, and To do.

Last updated: 2026-11-02 (T11 data tier complete, PR open for review).

## Release items

| Ticket | Work | Area | Status |
|---|---|---|---|
| — | Decisions of record: ADRs 0001–0026 | Foundation | ✅ Done |
| — | Eval harness (matching validated, model selection) | Foundation | ✅ Done |
| T10 | Next.js 14 + Material UI three-tier scaffold | Platform | ✅ Done |
| — | Architecture gate (mechanical + `judge-arch`) | Platform | ✅ Done |
| — | BDD harness + gates wired into CI | Quality | ✅ Done |
| — | CI pipeline (arch, lint, types, tests, BDD, build) | Infra | ✅ Done |
| — | Vercel deploy — production live | Infra | ✅ Done |
| — | PR stack merged, `main` on Next.js | Infra | ✅ Done |
| T11 | Supabase data tier + snapshot pipeline | Data | 🟢 In review (PR open, all gates + judge-arch green) |
| T03 | Text extraction (port eval `text`) | Decode engine | ⬜ To do |
| T04 | Keyword matcher (line-scoped, alias tiers) | Decode engine | ⬜ To do |
| T05 | Grounded LLM recognizer (OpenRouter, quotes) | Decode engine | ⬜ To do |
| T09 | Scoring + verdict bands | Decode engine | ⬜ To do |
| T01 | Input screen (title + posting) | Screens | ⬜ To do |
| T02 | Title resolution (covered / not-covered / ambiguous) | Screens | ⬜ To do |
| T06 | Results stepper (covered / missed / added hats) | Screens | ⬜ To do |
| T07 | Receipt + evidence per hat | Screens | ⬜ To do |
| T08 | How-it-works (the 17 steps) | Screens | ⬜ To do |
| T16 | Resume & application prep | Screens | ⬜ To do |
| T12 | Eval accuracy gate (threshold + labels still open) | Quality gates | ⬜ To do |
| T13 | Dependency-scan gate | Quality gates | ⬜ To do |
| T14 | OWASP secure-coding scenarios + gate | Quality gates | ⬜ To do |
| T15 | WCAG axe gate + licensing gate | Quality gates | ⬜ To do |
| — | Branch protection (make checks merge-blocking) | Infra | ⬜ To do |

Tally: 8 done, 1 in review (T11), 14 to do.

## T11 sub-progress

| Piece | Status |
|---|---|
| `spf_release` + `spf_record` schema + RLS migration | ✅ Done |
| Shared relation logic (extracted, eval reuses it) | ✅ Done |
| Entity manifest + pinned SHA | ✅ Done |
| Integrity gate (ADR-0008 rules, fail-closed) | ✅ Done |
| Read-model derivation (slices, item index, titles) | ✅ Done |
| Release sources (Supabase + local) | ✅ Done |
| Sync + snapshot entry scripts + npm wiring | ✅ Done |
| Tests + @security BDD + ADR-0027 | ✅ Done |
| `judge-arch` fresh-context review (4 findings, all fixed) | ✅ Done |
| PR open, awaiting merge | 🟡 In review |

## Sequencing notes

- T11 lands first because the decode engine (T03–T09) and the screens (T01, T02,
  T06–T08) all read the snapshot read model it produces.
- `judge-arch` and the architecture gate run before any item here is called done.
- Branch protection comes last, once the full gate set is stable, so the checks become
  merge-blocking without churn while the gates are still being added.
