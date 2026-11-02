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
