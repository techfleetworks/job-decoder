# ADR-0031: Zero-downtime schema evolution and index safety

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0022](0022-supabase-jsonb-sliced-snapshot.md) (CQRS data tier), [ADR-0027](0027-data-tier-pipeline-and-release-sources.md) (pipeline and release sources).

## Context

The data tier will keep changing as the product grows. Today `spf_release` and `spf_record`
are small, but a future migration may add a column or an index to a table that already holds
data and is being written by the sync step (or by a feature we have not built yet). A naive
migration that builds an index non-concurrently, or rewrites a table in place, takes an
`ACCESS EXCLUSIVE` lock that blocks writes for the whole operation. On a small table that is
invisible; on a populated table under traffic it is an outage. We want future migrations to be
safe by construction, not safe by whoever reviews them remembering the rule.

The `migration-safety` gate (installed from the enterprise skills, owned by
`release-deployment-safety`) already flags non-concurrent index builds. It flagged the two index
builds in the initial migration, which are in fact safe (they run once, on empty tables), so we
also need a stated, honest way to mark that exemption rather than turning the gate off.

## Decision

- **Expand and contract for every schema change.** Add the new structure, backfill, switch
  reads then writes, and only then remove the old, each as its own forward migration. Never a
  destructive in-place rewrite.
- **Concurrent index operations on populated tables.** Any index created on, or dropped from, a
  table that already holds data under write traffic uses `CREATE INDEX CONCURRENTLY` or
  `DROP INDEX CONCURRENTLY`, in a migration that runs **outside** a transaction. Supabase wraps
  a migration in a transaction by default, and `CONCURRENTLY` is illegal inside one, so such a
  change is its own dedicated, non-transactional migration.
- **The initial migration is the one sanctioned exemption.** `0001` creates empty tables and
  their indexes in a single run on a fresh database, so the lock is on nothing and `CONCURRENTLY`
  is both impossible (it cannot run in the create transaction) and pointless. Its two index
  builds carry an inline `-- migration-safety:ignore <reason>` naming exactly that. This is the
  only case where a non-concurrent build is allowed, and it is annotated per statement, never a
  blanket waiver.
- **Migrations are forward-only and immutable once applied.** A change to an applied migration is
  a new migration, never an edit to history (for example `0002` drops a redundant index rather
  than editing `0001`).
- **Confirmation.** `scripts/ci/check-migration-safety.mjs` runs in CI and at pre-push and fails
  any non-concurrent index build, table rewrite, or unsafe pattern that is not an annotated,
  reasoned per-statement exemption.

## Consequences

- No migration can lock a populated table at scale without a reviewed, written reason. The rule
  is enforced mechanically, so it survives the reviewer not noticing.
- **Honest limits:**
  - A `CONCURRENTLY` build cannot share a transaction, so a failure mid-build can leave an
    `INVALID` index that the next run must detect and drop before rebuilding. The convention
    needs an `IF EXISTS` / drop-invalid step for those migrations.
  - The gate checks the *pattern* (non-concurrent build, rewrite), not whether a specific change
    is semantically safe. Choosing the right expand/contract sequence stays a judgment call.
  - The initial-migration exemption is a real suppression. It is recorded on the statement with a
    reason, so it is visible and auditable, but it is still a case the gate is told to allow.

## Alternatives considered

- **No written convention, rely on review.** Rejected: the drift returns the first time a
  reviewer misses a non-concurrent build, which is exactly what the gate exists to prevent.
- **Suppress `migration-safety` for the whole repo.** Rejected: that hides every future real
  risk, not just the safe initial build. The bar is per-statement, reasoned exemptions.
- **Edit the initial migration to drop the redundant index and reset the database.** Rejected:
  production already holds the applied schema and data; forward-only history is safer and is the
  model the rest of the tier already uses.
