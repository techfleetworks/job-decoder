# Hat Check — "ready for testing" skeptical audit (2026-11-04)

Scope: prove, with re-runnable evidence, that every Hat Check backlog ticket moved to **Testing**
was formally developed and pushed; and assess whether (a) the designs match current MVP 1
functionality and (b) the app matches the designs. Follows the `skeptical-audit` evidence discipline.

Repo state at audit: `main` @ `aca06d1dfbbc0bfa63815bb7cde396576e827eb7`.

Honest note up front: moving the 16 tickets to "Testing" was a **board action taken on request**, not
a verification. This audit is the verification, run after the fact.

## Evidence ledger — "developed and pushed" + "ready for testing"

| Claim | State | Source (re-runnable) | Limitation (not checked) |
|---|---|---|---|
| Every Testing ticket maps to a merged PR | observed | `gh pr list --state merged` → T01–T08 #9/#10/#11, T03–T09 #9, T10 #5/#8, T11 #7, T13 #12/#17, T14 #16/#20, T15 #16, T16 #13/#14, BDD #6, T-prop (T05/T06) #22, T12 fixtures #21 | PR titles/branches read as the ticket mapping; not every line diff re-reviewed |
| CI passed on `main` | observed | `gh run list --branch main` → `CI` and `enterprise-gates` both `completed/success` @ `aca06d1` | — |
| The merge of the last change passed the required checks | observed | `gh pr checks 22` → `verify` pass (1m46s), all 12 enterprise gates pass, Vercel deploy pass | older merges spot-checked, not all |
| Full gate suite is green now on `main` | observed | local run, exit 0: `check:architecture, lint, typecheck, test:run, check:gherkin, check:bdd-tags, check:bdd-coverage, test:bdd, check:bdd-executed, check:snapshot-integrity, check:dependencies, build` all PASS | run on this machine; Node v24.17.0 |
| Unit tests pass | observed | `npx vitest run` → 18 files, **113/113 passed** | coverage of each Testing ticket's branch not separately measured |
| BDD scenarios execute as blocking checks | observed | `test:bdd` (cucumber strict) PASS; 35 scenarios, 0 `@wip`; guarded by `check:gherkin`, `check:bdd-tags`, `check:bdd-coverage`, `check:bdd-executed` | — |
| T12 accuracy is now measurable (unblocked) | observed | `node --env-file=.env eval/run.mjs --fixtures eval/fixtures.labeled.json` exit 0 → overall **P 94% / R 90% / F1 92%**; hat-level **28/30 (93%)** | 8 labeled fixtures only; selection threshold is **Morgan's decision**, not set |

### Conformance vs adequacy
- **Tickets conform** to "developed + pushed + CI-green": observed across the board.
- **Adequacy for QA** differs per ticket (below): two carry a real open step.

### Per-ticket readiness
- T01–T11, T16: developed, pushed, CI-green, covered by tests/BDD. **Ready.**
- T13 (security): gates merged (#12, #17). Per-IP rate limiting is **out of MVP1 scope** (decided 2026-11-04). **Ready.**
- T14 (accessibility): code merged (#16, #20). One **audio screen-reader pass** remains — a human step. **Ready to test, with that caveat.**
- T15 (licensing): credit UI in `main` (`FrameworkCredit.tsx`, `licensing.ts`). **Ready.**
- T12 (eval/model): harness + fixtures merged; live accuracy now observed (above). **Decision owed** (threshold), not code.

## Design questions

### Q1 — Do the designs match MVP 1 functionality now? **No — partial (observed).**
- `observed`: the Figma prototype (`get_metadata` on file `HvbMGxsYUXHCJmt0pv8bg3`, page `9:210`) Results flow uses the
  **pre-ADR-0039 three-set model**: stat tiles "Matched hats / Expected but missing / Not standard", and
  filter chips by match **type** (Exact/Alias/Similar). No per-hat share, no full/partial grouping.
- `documented`: current functionality (ADR-0039; Epics & Features, 2026-11-04) groups hats by match **level**
  (full ≥25%, partial >0 & <25%), shows per-hat share, excludes tools.
- So the designs cover all MVP 1 *flows* (input, decode, results, trust, fallback, prep, license) but the
  **results grouping and per-hat scoring presentation lag ADR-0039**. Foundations (Epic 2) and
  eval/security/a11y (Epic 3.1–3.3) are non-visual and not expected as prototype frames.
- Tracked and being fixed under ticket **T17** (created 2026-11-04).

### Q2 — Does the app match the designs? **No (observed).**
- `observed`: `src/components/Results.tsx` renders a plain MUI `MobileStepper` (dots + Next/Back, line 184)
  and `Typography` lists. It implements **none** of the Figma's high-fidelity affordances (verdict gauge,
  stat tiles, filter chips, hat cards with Evidence/Why/What-it-takes accordions).
- `inferred` (from the two observations): the app and designs disagree in **both** directions — the app is
  **ahead on functionality** (Results.tsx already implements ADR-0039 full/partial + share, lines 81–96) and
  **behind on visual fidelity**.
- Tracked under the open **Design-fidelity pass** ticket.

## Open gaps (the `not-assessed` / decision rows, restated)
1. **T12 threshold** — accuracy measured; the model-selection threshold is Morgan's to set.
2. **T14 audio screen-reader pass** — the one remaining manual a11y step.
3. **Designs lag ADR-0039** — T17 (in progress: desktop "matched" frame updated to level+share pills; tablet,
   mobile, verdict stat tiles, and basic-read variants still to propagate).
4. **App lags designs** — the Design-fidelity pass ticket (do after T17 so it targets a correct prototype).

No summary line beyond this: 7 observed claims, 2 decisions owed, 2 design gaps tracked as tickets.
