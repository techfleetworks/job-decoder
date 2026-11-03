# ADR-0032: Request-path scalability (stateless reads of an immutable snapshot)

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0006](0006-three-tier-architecture.md) (three tiers), [ADR-0022](0022-supabase-jsonb-sliced-snapshot.md) (CQRS snapshot), [ADR-0011](0011-session-only-state.md) (session-only state), [ADR-0028](0028-decode-engine-and-route.md) (decode route).

## Context

As the number of users grows, the request path (the `/api/decode` route and the pages) has to
keep up without the database turning into a bottleneck or a single point of failure, and without
one request being able to burn unbounded CPU. We are deciding, and recording, what carries the
load at scale so later changes do not quietly break it.

## Decision

- **The request path never queries the database.** It reads the immutable, versioned JSON
  snapshot built at deploy time and served from the CDN (ADR-0022). This is `observed`, not just
  intended: a repo-wide search finds no Supabase client imported anywhere under `app/` or
  `src/data/`; every Supabase reference lives in `pipeline/` (the sync and build step). The
  architecture gate's `browser-no-db` and domain-purity rules hold this boundary.
- **Routes are stateless.** There is no server session and no shared mutable server state; what
  little client state exists is session-only, held in the browser tab (ADR-0011). So any instance
  can serve any request with no coordination, and the route scales horizontally by adding
  instances.
- **The snapshot is immutable per version.** A new version is a new build and deploy, never a
  mutation, so the snapshot is safe to cache at the edge with long lifetimes. User-read scale
  becomes CDN scale.
- **Per-request compute is bounded.** Decode is `O(posting lines x items)` over a fixed-size
  snapshot, and input is capped (title and posting length limits, ADR-0028), so no single request
  can consume unbounded CPU.
- **The AI recognizer is the one hot-path external dependency, and it degrades gracefully.** When
  the grounded LLM recognizer (T05) is enabled, it runs under a timeout with the keyword-only
  "basic read" fallback (ADR-0025, ADR-0009), so an upstream slowdown or outage degrades the
  result instead of blocking the request. Rate-limit and backpressure handling is a prerequisite
  before it is turned on at scale.

## Consequences

- User scale maps onto a CDN plus stateless compute, both trivially horizontal. The database is
  never on the hot path, so it is neither a throughput bottleneck nor a single point of failure:
  a database outage does not take the app down, it keeps serving the last built snapshot.
- **Honest limits:**
  - The snapshot is only as fresh as the last build. Framework updates need a rebuild and deploy,
    or the Supabase-source build (ADR-0027). Staleness is bounded by build cadence, by design.
  - The AI path adds latency and cost per request and is the part that genuinely needs load and
    failure testing before it is enabled; the bounded-but-not-free decode CPU is the cost to watch
    at very high QPS.

## Alternatives considered

- **Query Supabase on the request path.** Rejected: it couples user scale to database
  connections (serverless function fan-out exhausts a Postgres connection pool) and makes the
  database a single point of failure for every read.
- **Cache database results inside the route.** Rejected: that reinvents the snapshot one request
  at a time. The snapshot already is the read model, built once per version and shared by every
  instance.
