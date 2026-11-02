# Hat Check — MVP 1 release board

This is the living release tracker for MVP 1 of Hat Check (the Job Decoder). It is
updated on every push, so the status here always reflects what is merged and what is in
flight. Status values are Done, In progress, and To do.

Last updated: 2026-11-02 (decode engine merged to main via PR #9; result screens up for main in PR #11; T10 and T11 done).

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
| T11 | Supabase data tier + snapshot pipeline | Data | ✅ Done (merged PR #7) |
| T03 | Text extraction (port eval `text`) | Decode engine | ✅ Done (merged PR #9) |
| T04 | Keyword matcher (line-scoped, alias tiers) | Decode engine | ✅ Done (merged PR #9) |
| T05 | Grounded LLM recognizer (OpenRouter, quotes) | Decode engine | ⬜ To do (needs OpenRouter key) |
| T09 | Scoring + verdict bands | Decode engine | ✅ Done (merged PR #9) |
| T01 | Input screen (title + posting) | Screens | 🟢 In review (PR #11 → main) |
| T02 | Title resolution (covered / not-covered) | Screens | 🟢 In review (PR #11 → main) |
| T06 | Results stepper (covered / missed / added hats) | Screens | 🟢 In review (PR #11 → main) |
| T07 | Receipt + evidence per hat | Screens | 🟢 In review (PR #11 → main) |
| T08 | How-it-works (the 16 steps) | Screens | 🟢 In review (PR #11 → main) |
| T16 | Resume & application prep | Screens | ⬜ To do |
| T12 | Eval accuracy gate (threshold + labels still open) | Quality gates | ⬜ To do |
| T13 | Dependency-scan gate | Quality gates | ⬜ To do |
| T14 | OWASP secure-coding scenarios + gate | Quality gates | ⬜ To do |
| T15 | WCAG axe gate + licensing gate | Quality gates | ⬜ To do |
| — | Branch protection on `main` (CI checks block merge) | Infra | ✅ Done |

Tally: 13 done, 5 in review (result screens, PR #11), 6 to do.

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
| Merged to main (PR #7) | ✅ Done |
| Supabase migration applied (tables live) | ✅ Done |
| Data load: 250 records synced; snapshot round-trips from Supabase | ✅ Done |

## Sequencing notes

- T11 lands first because the decode engine (T03–T09) and the screens (T01, T02,
  T06–T08) all read the snapshot read model it produces.
- `judge-arch` and the architecture gate run before any item here is called done.
- Branch protection comes last, once the full gate set is stable, so the checks become
  merge-blocking without churn while the gates are still being added.
