# ADR-0033: Data-tier scalability and index discipline

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0022](0022-supabase-jsonb-sliced-snapshot.md) (CQRS data tier), [ADR-0027](0027-data-tier-pipeline-and-release-sources.md) (pipeline), [ADR-0031](0031-zero-downtime-schema-evolution.md) (schema evolution).

## Context

The data tier holds the framework as the write side of the CQRS split. It has to stay cheap to
write and correct to read as releases accumulate over time. Reviewing the initial schema against
how it is actually queried surfaced a redundant index, which is the kind of cost that is
invisible at a few hundred rows and real as the data grows.

The read path reads `spf_record` filtered by `release_id` alone
(`pipeline/lib/release-source.mjs`), then slices by entity in the build step. The table's primary
key is `(release_id, entity, slug)`, which Postgres backs with a btree index. A btree on
`(release_id, entity, slug)` already serves any query on its left prefix: `release_id`, or
`(release_id, entity)`. The separate `spf_record_entity_idx` on `(release_id, entity)` therefore
serves no query the primary key does not, and only adds work to every insert and storage to every
release.

## Decision

- **User scale does not reach the database.** The database is written only by the sync step (a
  bulk insert per release) and read only by the build step; both are low-concurrency and
  scheduled, never per user request (ADR-0022, ADR-0032). So the database's scaling concern is
  write cost per sync and storage per release, not query throughput.
- **Every index is justified by a real query and must not duplicate the primary key's left
  prefix.** `spf_record_entity_idx` is redundant with the `(release_id, entity, slug)` primary
  key and is dropped in migration `0002`. The partial unique index `spf_release_one_published`
  is kept: it enforces the "exactly one published release" invariant and serves the
  published-release lookup, which no other index covers, so it earns its write cost.
- **New indexes follow ADR-0031** for safe creation and removal on a populated table.
- **Confirmation.** The redundancy is visible in the schema itself (the primary key versus the
  secondary index) and is removed by migration `0002`. There is no mechanical "redundant index"
  gate yet, so catching the next one stays a review item (see honest limits).

## Consequences

- Every `spf_record` insert maintains one fewer index, so write cost and storage per release
  drop, and the index set now matches the real access paths.
- **Honest limits:**
  - Dropping `spf_record_entity_idx` is only free because the primary key covers the read path's
    `release_id` filter. A future query that filtered `spf_record` by `entity` *without*
    `release_id` would need a new index, but that is not an access pattern the build uses.
  - No gate detects a redundant index, so this discipline is enforced by review, not mechanically.
    If this recurs, the follow-up is a fitness check that compares each secondary index against
    the primary key's left prefix.

## Alternatives considered

- **Keep `spf_record_entity_idx`.** Rejected: it is redundant with the primary key and is pure
  write and storage cost that grows with every release.
- **Suppress the `migration-safety` flag on the record index and keep it.** Rejected: that would
  silence the gate while leaving the real cost in place. We remove the cost instead, and keep a
  suppression only for the `spf_release` unique index, which is not redundant and is genuinely
  safe to build as written.
- **Replace the primary key with `(release_id, entity)` and a separate unique constraint on
  slug.** Rejected: the `(release_id, entity, slug)` key is the integrity rule from ADR-0008
  (resolve by entity and slug, never slug alone) and already serves the read path; changing it
  would weaken the constraint to save an index that simply should not exist.
