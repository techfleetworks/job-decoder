# Architecture review: multi-item per phrase (ADR-0049)

- Date: 2026-11-12
- Change: working tree on `feat/t24-vocab-meaning-confirm` — multi-item alias wiring + ADR-0049
- Standard: ADR-0020 (translator table is the alias source of truth), ADR-0028 (decode twins), ADR-0047 (mechanism B confidence), ADR-0048 (evidence-symmetric labels), ADR-0049 (this change), global four questions
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **PASS — 1 low-severity finding, resolved in this change**

## Scope

Adds "multi-item per phrase" alias data so one posting phrase maps to both an activity and a
deliverable. Five wires: `user stories`/`writing user stories`→`user-story-statements`;
`roadmapping`→`roadmap`; `journey mapping`/`customer journey mapping`→`user-journey-map`;
`storyboarding`→`storyboard`; `redlines`→`design-annotation`. No source code changed.

- `eval/aliases.json` — 5 leaf alias edits (2 appends, 3 new `deliverable:*` keys).
- `eval/translator-table.csv` — 7 new leaf deliverable rows (the source of truth, ADR-0020).
- `eval/fixtures.labeled.json` — 4 demonstrator fixtures + the gerund clause in `_labeling_rule`.
- `docs/adr/0049-multi-item-phrases-named-artifact-fixture-earns-wire.md` — the governance ADR.
- Resolution of the finding below: `scripts/check-alias-csv-parity.mjs` + `package.json` +
  `.github/workflows/ci.yml` (the parity gate, with a discrimination self-test).

## Review matrix (changed files × four questions)

| File | Boundary | Data ownership | Dependency direction | Error handling |
|---|---|---|---|---|
| `eval/aliases.json` | cleared — leaf alias lists only, the artifact `derive.mjs:61` consumes | **finding (F1)** → resolved | n/a — pure data, no imports | n/a — no code path |
| `eval/translator-table.csv` | cleared — human source doc in `eval/`, no runtime reads it | **finding (F1)** → resolved | n/a | n/a |
| `eval/fixtures.labeled.json` | cleared — ground truth in `eval/` | cleared — labels bound to posting via `deliverableEvidence`; `check:fixture-evidence` exit 0 | n/a | n/a |
| `ADR-0049` (governance doc) | cleared — documentation; claims match observed reality | cleared | n/a | n/a |

Confirmed in fresh context: only 4 files changed (no `.ts`/`.mjs`); `match.ts:102` /
`match.mjs:99` `confirmed: m.via.includes('llm')` unchanged (mechanism B intact); the single
phrase `roadmapping` yields both an activity and a deliverable match ("matched items: 2 (1 act,
1 del)"), proving no engine change is needed; snapshot reproducible (hash `a1f8fcfa87a99ff8`).

## Grep battery

No source code changed (`git status` → 4 data/doc files + the resolution's gate script), so the
dependency-direction battery is n/a for the matcher/domain paths. The added gate script
`scripts/check-alias-csv-parity.mjs` is a build-tool script (reads two files, no network, no
catch-and-swallow): boundary/dependency/error-handling cleared by read.

## Findings (1 LOW — resolved)

- **F1 — `aliases.json` ⇄ `translator-table.csv`: two hand-maintained sources, no reconciliation
  gate** (`@question:ownership` `@severity:low` `@file:eval/aliases.json`,
  `@file:eval/translator-table.csv`). The phrase→slug mapping lives in both files and was kept in
  sync by hand; ADR-0020 declares the CSV the single source of truth, but nothing mechanically
  validated `aliases.json` against it, so the status was aspirational. This change added 7 more
  hand-synced rows, enlarging the un-gated surface. No drift existed in the diff (all 250 leaf
  rows cross-checked, 0 drift). **Resolution: fixed** — `scripts/check-alias-csv-parity.mjs`
  fails closed unless every leaf alias in `aliases.json` has a matching `term,spf_entity,spf_slug`
  row in the CSV and vice versa; ships a `--self-test` that discriminates (a row or phrase present
  in only one file fails); wired into CI (`npm run check:alias-csv-parity`). The greppable catch
  is now a mechanical rule (the judge-arch ratchet), so the drift cannot recur silently.

## Over-/under-engineering

Cleared, exemplary. ADR-0049 explicitly rejects auto-expanding phrases across the SPF graph
(43/106 phrases fan out to 3+ deliverables → false positives) and binds every wire to a
failing-then-passing fixture. `database design → entity-relationship-diagrams` is correctly
rejected (names the activity, not the artifact). Right-sized, not speculative.

## Mechanical gate & verification

- `npm run check:architecture`: PASS.
- `npm run check:fixture-evidence` + `-- --self-test`: PASS (guard armed and discriminating).
- `npm run check:alias-csv-parity` + `-- --self-test`: PASS (0 drift; discriminates).
- `npm run check:snapshot-integrity`: PASS (reproducible hash, twins identical).
- `node eval/run.mjs --no-llm --fixtures eval/fixtures.labeled.json`: deterministic deliverable
  recall 71% → 77% (tp 25→30, fn 10→9), 0 new false positives; each demonstrator matches both its
  activity and deliverable.

## Limitation

The reviewer read the diff and ran the deterministic eval and gates; it did not run the LLM
recognizer. That is sound here: confirmed-precision is set only by mechanism B (unchanged), and
the out-of-domain negative fixtures contain none of the five wired phrases, so the wires add no
candidate there — confirmed-precision on negatives is unchanged by construction. The recall gain
is on-fixture (the phrases were chosen from these fixtures), not held-out generalization; ADR-0049
states this limit.
