# ADR-0028: The decode engine and the /api/decode route

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0006](0006-three-tier-architecture.md) (three tiers), [ADR-0018](0018-mvp1-business-logic.md) (business logic), [ADR-0021](0021-responsible-rollup.md) (Responsible roll-up), [ADR-0022](0022-supabase-jsonb-sliced-snapshot.md) (snapshot read model), [ADR-0025](0025-match-all-items-ai-matches-need-quotes.md) (match all items).

## Context

The eval harness (`eval/`) validated the matching approach and the roll-up in build-time
JavaScript. The app needs that logic at request time, in the typed tiers: a pure domain,
a data-source reader, and the `/api/decode` route. This ADR records how the decode engine
was built (tickets T03 to T09, the keyword path) and the decisions that port left open.

## Decision

**The decode logic is a pure TypeScript domain** (`src/domain/decode`): text helpers, the
line-scoped keyword matcher (exact, then reviewed alias, then similar), the union of
sources, and the classification and verdict. It takes already-loaded data in and returns a
result. It has no fetch, no file reads, no `request` or `response`, so it runs and tests
without a browser or a server.

**The route is a thin tier-2 adapter** (`app/api/decode/route.ts`): it validates the
request, reads the snapshot through the data layer, calls the domain, and returns the
result. It holds no business rules and no secrets.

**Reads come from the built snapshot, never the database** (`src/data/server/snapshot.ts`).
The reader loads the title index, the shared item index, the duty-name index, and one
function slice from `public/snapshot`, which the build step generates. Each item already
carries its aliases and its roll-up duties, so the request path does no joining.

**The snapshot is built from the local pinned data at build time** (`prebuild` runs
`build:snapshot:local`), so the app deploys and runs with no database credentials. The
Supabase read path (ADR-0022) stays the source of record for updating the data without a
code change, and switching the build to it is a matter of setting credentials and changing
the build command. The build also adds a `duties.json` index so a non-standard hat can be
named.

**Title resolution never guesses** (ADR-0008, ADR-0012): an unknown title returns
`not-covered` with the lines still audited, not a made-up function.

## Pattern choice (pattern-selector)

- **Layered** with a **pure domain** (Fowler's Domain Model as plain functions) behind a
  thin **Service Layer** (the route). Forces resolved: the decision logic is testable and
  reusable without HTTP, and the four-questions dependency rule holds (tier 1 to tier 2 to
  domain, never the reverse).
- Rejected: putting the matcher in the route (untestable without a request, and the next
  caller would copy it); a runtime database read per request (ADR-0022 rejected it).

## Security (owasp-secure-coding)

- The posting is untrusted input. The route checks that title and posting are strings and
  bounds their length before any work, so a huge body cannot tie up the matcher.
- No secret is read in tier 1 or the domain. The route reads no database and no key.
- On failure the route reports: a missing snapshot is a 503, a bad body is a 400, and any
  other error is logged on the server and returned as a generic 500, so no internal detail
  reaches the client.

## Consequences

- The decode runs entirely from static files, so it is fast and has no database on the hot
  path, keeping the cost posture from ADR-0006 and ADR-0022.
- **Honest limits:**
  - The matcher and text helpers now exist in two places: the eval harness (`.mjs`,
    build-time) and the app domain (`.ts`, request-time). They carry the same algorithm.
    This is a deliberate split because the two run in different places; the accuracy gate
    (T12) will run the eval fixtures so the two cannot drift silently.
  - The grounded LLM recognizer (T05, ADR-0007) is not built here. The domain already
    unions an LLM match list in, so it lights up when that recognizer lands; until then the
    result is the keyword read.
  - Matching accuracy is not measured yet (no labeled fixtures); that is T12. What is proven
    now is line-accountability (every posting line is matched or unplaced) and the
    classification and verdict logic.
  - The route reads `public/snapshot` with the filesystem, and `next.config.mjs` traces
    those files into the function bundle. That path is exercised by the route test and will
    be confirmed on Vercel when the screens (T01, T02, T06 to T08) call the route.

## Alternatives considered

- **Call the route from the eval, or share one JavaScript matcher across both.** Rejected:
  it would break the pure-TypeScript domain and the typecheck, and couple the app to the
  build-time harness.
- **Read the snapshot over HTTP from the CDN at request time.** Workable, but a filesystem
  read with file tracing avoids a network hop and an absolute-URL dependency. Revisit if the
  function bundle size becomes a concern.
