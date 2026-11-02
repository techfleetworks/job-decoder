# ADR-0022: Supabase JSONB plus sliced snapshot data model

- Status: Accepted
- Date: 2026-11-01
- Deciders: Morgan (mdenner@techfleet.org)
- Supersedes: the normalized-table storage shape in ADR-0008 (0008's integrity rules still hold).
- Builds on: ADR-0006 (three-tier).

Note: ADRs 0005 through 0018 live on branch `docs/adr-0005-mvp1-scope`, not yet merged, so they are referenced here by number.

## Context

The framework is small and read-mostly: about 250 records (roughly 2 MB of JSON) that must serve reads to many users at near-zero cost, with the database off the request hot path. A fully normalized relational schema (ADR-0008's original shape) adds many tables and joins to model data that is already clean, nested JSON and that the app only ever reads one slice of at a time.

## Decision

Store the framework in Supabase as **versioned JSONB**, and serve reads from a **built snapshot**, not the database.

- `spf_release`: one row per synced version (upstream commit SHA, status, content hash, record counts); exactly one row is "published".
- `spf_record`: one row per framework record, keyed by `(release, entity, slug)`, with `name` and the record itself in a `data jsonb` column. This makes the "resolve by (entity, slug)" rule from ADR-0008 a real primary key and sidesteps the 183 cross-entity slug collisions.
- At build time, tier-2 code reads the published release and derives the **read model**: a small title index plus one snapshot slice per job function (its hats, and each hat's activities, deliverables, and tools, with the RACI links and plain-language fields). These static files go on the CDN.
- The browser and the decode route read the CDN slices. Nothing queries Supabase at request time. This is CQRS: the JSONB tables are the write side (source of record), the snapshot slices are the read model.
- RLS stays on for every table; only the server's service-role key writes; the browser has no key.

The translator table (ADR-0020) is a separate build-time data artifact, versioned in the repo, not in Supabase.

**Amendment (2026-11-01):** each slice also carries the name and Skill Type of every skill its hats and activities reference, so resume and application prep (ADR-0024) can split technical from interpersonal skills without a database call. The build fails if a referenced skill has no Skill Type. Verified at the pinned commit 636635a: all 115 skills are typed (92 Technical, 23 Interpersonal) and every duty skill link resolves.

**Amendment (2026-11-01, ADR-0025):** the read model also includes a shared index of every activity, deliverable, and tool, because the matcher compares a posting against all framework items, not only the resolved job function's. The per-function slices still carry each function's standard hats for classification. The build also publishes the reviewed translator aliases (ADR-0020) and reads the title override list (ADR-0012), failing on a missing or stale row. So the statement above that "the only query the app needs is 'give me this job function's slice'" no longer holds; the app needs the slice and the shared item index.

## Consequences

- Reads are cheap, fast, and scale: a static CDN serves them, the database is off the hot path, so the "$0 at scale" posture holds.
- JSONB keeps each record verbatim and avoids a brittle many-table schema for a small read-mostly dataset; adding a framework field does not require a migration.
- ADR-0008's integrity rules still apply and are enforced at build: resolve by (entity, slug), one owner per fact, exclude the degenerate `everyone` duty, pin by commit and stamp every result. The build fails closed when data breaks them.
- **Honest limit:** JSONB is less queryable than normalized tables. That is acceptable because the only query the app needs is "give me this job function's slice," and that is answered at build time, not per request.

## Alternatives considered

- **Normalized tables (ADR-0008 original):** more tables and joins, and a migration for every schema change, to model data that is already clean nested JSON and only ever read one slice at a time. Rejected for this read-mostly set.
- **No database, bundle the JSON:** simplest, but loses versioning, the integrity gate, and a single published source of record. Rejected.
