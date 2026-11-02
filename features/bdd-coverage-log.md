# BDD coverage log

Append-only. Each behavioral change adds a dated entry naming the change, the
scenarios added, updated, or removed with their audience, use case, and severity,
and the gate result that proved them. Never edit or delete a past entry; the
history is the receipt.

## 2026-11-01 — BDD harness and the architecture feature

- Change: `feat/bdd-harness` (the PR after T10). Stands up Cucumber.js in strict
  mode and the gate suite (`check-gherkin-valid`, `check-bdd-tags`,
  `check-bdd-coverage`, `check-bdd-executed`), wired into CI as blocking checks,
  plus the generated datastore (`features/bdd-index.json` and `features/INDEX.md`).
- Scenarios added. Feature "The architecture gate holds the tier boundaries"
  (`@audience:engineer`):
  - `gate-clean` (happy, functional, high)
  - `gate-secret` (permission, security, critical)
  - `gate-db-client` (permission, security, critical)
  - `gate-session-only` (negative, functional, high)
  - `gate-literal-color` (negative, functional, low)
  - `gate-server-secret-ok` (boundary, security, high)
- Gate result: `test:bdd` ran 6 scenarios and 17 steps, all passed;
  `check-gherkin-valid`, `check-bdd-tags`, `check-bdd-coverage`, and
  `check-bdd-executed` all PASS. The ticket feature files (T01 to T16) are added
  with their implementations in later PRs, each appending an entry here.

## 2026-11-02 — T11 framework data tier and snapshot build

- Change: `feat/data-tier` (T11). Adds the Supabase data tier (`spf_release` and
  `spf_record` JSONB, RLS on), the shared relation logic, the ADR-0008 integrity
  gate, and the build-time snapshot pipeline that derives the CDN read model.
- Scenarios added. Feature "The framework data tier and snapshot build"
  (`@audience:engineer`):
  - `snapshot-build` (happy, functional, high)
  - `integrity-dangling` (error, functional, critical)
  - `integrity-disagree` (error, functional, critical)
  - `content-hash-stable` (boundary, reliability, medium)
  - `framework-rls` (permission, security, critical)
- Gate result: `test:bdd` ran all scenarios green; `check-gherkin-valid`,
  `check-bdd-tags`, `check-bdd-coverage`, `check-bdd-executed`, and
  `check:snapshot-integrity` all PASS. The decode-engine and screen tickets add
  their own feature files and entries in later PRs.

## 2026-11-02 — T03 to T09 decode engine (keyword path)

- Change: `feat/decode-engine`. Ports the matcher and scoring into a pure TypeScript
  domain (`src/domain/decode`), adds the server snapshot reader (`src/data/server`) and
  the `/api/decode` route, and wires the snapshot into the build. The grounded LLM
  recognizer (T05) is a follow-up. BDD steps are now TypeScript, run under the tsx loader.
- Scenarios added. Feature "Decode a job posting into the hats it expects"
  (`@audience:job-seeker`):
  - `decode-covered` (happy, functional, high)
  - `decode-missing` (boundary, functional, high)
  - `decode-non-standard` (adverse, functional, medium)
  - `decode-not-covered` (negative, functional, high)
  - `decode-line-audit` (happy, reliability, medium)
- Gate result: `test:bdd` ran 16 scenarios and 49 steps green; `check-gherkin-valid`,
  `check-bdd-tags`, `check-bdd-coverage`, and `check-bdd-executed` all PASS. The route
  and domain also carry Vitest tests (13 cases).

## 2026-11-02 — T01, T02, T06 to T08 result screens (keyword flow)

- Change: `feat/screens` (stacked on the decode PR). The input screen, the result stepper,
  the receipt per hat, the how-it-works panel, and the session-only store, calling
  /api/decode through the client wrapper.
- Scenarios added. Feature "The result screen speaks plainly" (`@audience:job-seeker`):
  - `screen-strong-headline` (happy, functional, medium)
  - `screen-basic-read` (boundary, functional, medium)
  - `screen-not-covered` (negative, functional, high)
- Gate result: `test:bdd` ran 19 scenarios and 59 steps green; `check-gherkin-valid`,
  `check-bdd-tags`, `check-bdd-coverage`, and `check-bdd-executed` all PASS. The screens
  also carry Vitest component and jest-axe accessibility tests (9 cases).

## 2026-11-02 — T16 resume and application prep (logic and data)

- Change: `feat/resume-prep`. Adds the skills entity to the data tier and enriches the
  snapshot (per-hat skills, activities, deliverables, tools; a skills index with Skill Type;
  activity and deliverable detail), plus the pure `buildPrepGuide` the decode route returns.
  The prep screen is a follow-up PR.
- Scenarios added. Feature "Prepare your application from the hats" (`@audience:job-seeker`):
  - `prep-skills` (happy, functional, high)
  - `prep-outcomes` (happy, functional, medium)
  - `prep-ats-dedup` (boundary, functional, medium)
  - `prep-empty-set` (empty-overflow, functional, medium)
  - `prep-not-covered` (negative, functional, high)
  - `prep-traceable` (happy, functional, high)
- Gate result: `test:bdd` ran 25 scenarios green; `buildPrepGuide` has 9 Vitest unit tests;
  the integrity gate gained R4 (every referenced skill resolves and has a Skill Type) with a
  discriminating test; `check-gherkin-valid`, `check-bdd-tags`, `check-bdd-coverage`,
  `check-bdd-executed`, and `check:snapshot-integrity` all PASS.
