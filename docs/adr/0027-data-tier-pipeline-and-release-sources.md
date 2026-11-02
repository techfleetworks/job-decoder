# ADR-0027: Data tier pipeline, release sources, and the integrity gate

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0022](0022-supabase-jsonb-sliced-snapshot.md) (JSONB plus sliced snapshot), [ADR-0008](0008-framework-data-model-integrity.md) (integrity rules), [ADR-0006](0006-three-tier-architecture.md) (three tiers).

## Context

ADR-0022 decided the data model (versioned JSONB on the write side, a built snapshot on
the read side). This ADR records how that was actually built in T11, and the decisions
that ADR-0022 did not pin down: where the build reads from, how the derivation is shared
with the eval harness, and how the integrity gate runs in CI without a database.

Two forces shaped it. First, the production build must read from the published Supabase
release (ADR-0022), but CI and local development often have no Supabase credentials, so
the pipeline still has to be runnable and testable without one. Second, the eval harness
(`eval/lib/framework.mjs`) already derives the same read model from the same framework
data, and a second copy of that logic would drift from the first.

## Decision

**A release comes from a source, and the same derivation runs over either source.** A
release is `{ upstreamSha, version, contentHash, entities }`. `localRelease()` reads the
pinned framework files committed in the repo; `supabaseRelease()` reads the one published
release from Supabase. Production builds from Supabase; CI and tests build from the local
source, so the whole pipeline, integrity gate included, runs with no database.

**The relationship logic has one owner.** The field resolvers and the read-model builder
live in `pipeline/lib/relations.mjs`. The eval harness now imports them, so the eval and
the production snapshot derive the read model the same way. There is no second copy.

**The integrity gate (ADR-0008) runs before any derivation and fails closed.** Two rules
fail the build: a read-model link that does not resolve by (entity, slug) (R1), and a
function and duty that disagree on their link (R2). One rule is reported, not failed:
`everyone` is excluded as a hat, and a duty no activity is Responsible for is kept as an
expected hat but cannot be matched (R3). Verified on the pinned commit `636635a`: zero
violations, with `everyone` the only R3 note. The two empty duties ADR-0008 recorded are
no longer empty in the current data, so R3 reports nothing else; the gate reports what it
finds rather than what was once true.

**The content hash is order-independent.** Records are sorted by (entity, slug) and keys
sorted before hashing, so the same data always pins to the same hash regardless of file
or key order, and a real field change always moves it.

**The Supabase snapshot is not wired into `next build` yet.** Nothing reads the snapshot
until the decode engine (T03 to T09) lands, and the live deploy has no Supabase
credentials, so adding a Supabase build step now would break production for no gain. The
production build command gains the snapshot step when the decode engine needs it and the
credentials exist. Until then, `check:snapshot-integrity` builds from local data in CI to
prove the pipeline on every PR.

## Pattern choice (pattern-selector)

- **Gateway** for each release source (one place that knows how to reach and read a
  source) and a **Pipeline** for the build (source, then integrity gate, then derive,
  then write). Forces resolved: the production path reads the real source of record while
  tests and CI run the same build over planted data, and the integrity gate sits at one
  choke point every build passes through.
- Rejected: building straight from Supabase with no source seam (untestable without a
  database, and no way to plant bad data for the gate's discriminating test); a second
  derivation in the pipeline separate from the eval's (two copies that drift).

## Security (owasp-secure-coding)

- Row-level security is on for `spf_release` and `spf_record`, with no policy for the
  anon or authenticated role, so both are deny-by-default. Only the server's service-role
  key, which bypasses RLS, reads or writes them. The browser never connects; it reads the
  CDN snapshot. A BDD scenario asserts RLS is on and no policy is granted.
- The service-role client is imported lazily and only in tier-2 build tooling, so it is
  never bundled into client code, and the architecture gate blocks a client import of it.
- Framework data is untrusted external input: the sync step resolves and requires each
  record's slug and name before insert and refuses malformed data, rather than writing it.

## Consequences

- The pipeline is provable on every PR without a database: `check:snapshot-integrity`
  builds from local data, and the discriminating tests plant a dangling link and a
  disagreement and require the build to fail.
- Adding the eval's dependency on `pipeline/lib/relations.mjs` means the production module
  is the single source of the derivation; a change there is caught by both the eval and
  the snapshot tests.
- **Honest limits:** the skill-type enrichment from ADR-0022's amendment is not built
  here, because the committed framework data has no skills entity; it lands with resume
  prep (T16) when skills data is synced. `supabaseRelease()` reads records in one query;
  the dataset (about 250 rows) is well under the client's default row cap, and the build
  fails closed on a record-count mismatch if that ever changes.

## Alternatives considered

- **Bundle the snapshot in the repo, skip Supabase.** Simpler, but loses the versioned
  single source of record ADR-0022 chose. Rejected.
- **Normalized tables instead of JSONB.** Rejected in ADR-0022; not reopened.
