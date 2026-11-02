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
