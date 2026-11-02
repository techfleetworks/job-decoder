# Architecture decisions and boundaries

This file is the quick reference for how Hat Check (the Job Decoder app) is built.
It records the boundaries that reviews and the architecture gate check against. The
full rationale for each decision lives in `docs/adr/`.

## Intended shape (MVP 1)

Hat Check decodes one pasted job posting against the Tech Fleet Skills and Practices
Framework and explains the job, not the candidate
([ADR-0005](docs/adr/0005-mvp1-scope-job-not-candidate.md)). It is a three-tier app
([ADR-0006](docs/adr/0006-three-tier-architecture.md)), not the client-only app
described in the superseded [ADR-0001](docs/adr/0001-static-spa-no-backend-local-only.md)
and [ADR-0004](docs/adr/0004-on-device-matching-engine.md).

Three tiers, each reached only through the tier above it:

- **Tier 1, screens.** Next.js and Material UI, built to static assets served from
  Vercel's CDN. Collects the title and posting and steps through the result. Never
  calls the database, never holds a secret, holds no business rules.
- **Tier 2, server code.** The `/api/decode` route and the build-time snapshot step,
  running on Vercel. The only place secrets and business rules live. Holds the
  OpenRouter key, owns the Hat Check decode logic, and is the only tier that talks to
  Supabase or OpenRouter ([ADR-0007](docs/adr/0007-grounded-llm-matching.md)).
- **Tier 3, database.** Supabase Postgres, holding the framework data only, no user
  data. Row-level security is on for every table; only the server's service-role key
  writes ([ADR-0022](docs/adr/0022-supabase-jsonb-sliced-snapshot.md),
  [ADR-0008](docs/adr/0008-framework-data-model-integrity.md)).

The browser never connects to Supabase. The framework reaches the browser as a
read-only snapshot built at deploy time and served from the CDN. This is CQRS: the
JSONB tables are the write side, the snapshot slices are the read side.

Layers (Fowler), about how code is organized, not where it runs:

- **Presentation** (`app/`): screens and components. Format and display only. No
  business rules. Never reaches the data layer directly.
- **Domain** (`src/domain/`): pure logic over already-loaded data. Title resolution,
  matching, roll-up, classification, scoring, verdict, and resume and application
  prep. No `fetch`, no storage, no DOM, no React, no `request` or `response`. Runs
  and tests without a browser or a server.
- **Data source** (`src/data/`): all I/O. Reads the framework snapshot slice and the
  shared item index, resolves links by the typed (entity, slug) resolver
  ([ADR-0008](docs/adr/0008-framework-data-model-integrity.md)), calls OpenRouter and
  Supabase from the server tier only, and holds the current scan in HTML5
  `sessionStorage` on the client ([ADR-0011](docs/adr/0011-session-only-state.md)).
  The domain never reaches past this layer.
- **Content** (`src/content/`): single-owner static text such as licensing and
  attribution.

## Standing rules

These are the boundaries. The ones the gate can check are noted; the rest are review
rules until the gate covers them (see Current state).

- **Session-only state. No device save, no history**
  ([ADR-0011](docs/adr/0011-session-only-state.md)). The client keeps the current
  scan in `sessionStorage` for the life of the tab. No `localStorage`, no IndexedDB,
  no content cookies, no server-side user record.

  ```ts
  // ❌ never — persists across tabs and visits; forbidden
  localStorage.setItem("lastScan", JSON.stringify(result))

  // ✅ always — current scan only, cleared when the tab closes
  sessionStore.set("scan", result)
  ```

- **The browser never holds a secret or touches the database**
  ([ADR-0006](docs/adr/0006-three-tier-architecture.md),
  [ADR-0009](docs/adr/0009-security-resilience-quality-gates.md)). Tier-1 code may
  not import the Supabase client or read a server-only env var. Keys live only in
  Vercel server env, never in a client bundle, a response, or a log.

  ```ts
  // ❌ never — secret or DB client in browser code
  const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // ✅ always — the browser reads a CDN snapshot; only /api/decode reaches Supabase
  const slice = await loadSnapshotSlice(jobFunctionSlug)
  ```

- **Business rules live in the domain, reached through tier 2, not in screens or
  route handlers.** A route handler turns the HTTP request into plain data, calls a
  domain function, and turns the result back into a response. Matching, roll-up,
  scoring, and the verdict belong in `src/domain` and are callable without HTTP.

- **The domain is pure.** `src/domain/**` must not reference `fetch`, `localStorage`,
  `sessionStorage`, `window`, `document`, React, `request`, or `response`. If it
  needs data, the data is passed in.

- **Resolve every framework link by (entity, slug), never slug alone**
  ([ADR-0008](docs/adr/0008-framework-data-model-integrity.md)). 183 slugs occur in
  more than one entity, so a slug by itself is ambiguous. All resolution goes through
  the typed resolver.

- **The framework is the single source of truth; the AI decides nothing**
  ([ADR-0010](docs/adr/0010-framework-source-of-truth.md)). Every hat, count, and
  verdict is computed from the framework. The LLM only recognizes which framework
  items a posting's wording describes and returns a verbatim quote. A proposal is
  dropped unless its item exists in the framework and its quote appears in the
  posting ([ADR-0014](docs/adr/0014-receipt-visible-misses-union-matching.md),
  [ADR-0025](docs/adr/0025-match-all-items-ai-matches-need-quotes.md)).

- **Attribution has one owner.** The CC BY 4.0 credit line lives only in
  `src/content/licensing.ts`. Every screen that shows framework data reads it from
  there.

  ```tsx
  // ❌ never — credit line hand-copied into a component
  <p>The Skills & Practices Framework by Tech Fleet, licensed under CC BY 4.0.</p>

  // ✅ always — read the single source
  <FrameworkCredit />
  ```

- **The data is read-only.** Never fork or change the framework's meaning. When it
  does not cover something, say so; do not guess.

- **Colors and type come from the Material UI theme, configured once**
  ([ADR-0013](docs/adr/0013-ui-design-system-and-rules.md)). No literal color in a
  component.

## Resilience and error handling

See [ADR-0009](docs/adr/0009-security-resilience-quality-gates.md).

- Every out-of-process call (OpenRouter, Supabase) has a timeout and a budget. The
  OpenRouter call times out at 8 seconds and is not retried in v1.
- An OpenRouter failure, timeout, invalid output, or a hit cost cap degrades to the
  keyword-only result, labeled "basic read." The decode never crashes.
- Fail closed on cost and data: if the spend or rate check cannot run, deny the LLM
  call and serve the keyword result. If Supabase is unreachable at build time, the
  build fails loudly rather than shipping an empty snapshot.
- Every `catch` recovers, retries, or reports. None is empty.

## Mechanical gate

`npm run check:architecture` (`scripts/check-architecture.mjs`,
[ADR-0003](docs/adr/0003-mechanical-architecture-gate.md)) enforces the boundaries
above and runs in CI with a discriminating test that proves it detects planted
violations ([ADR-0009](docs/adr/0009-security-resilience-quality-gates.md), Part C).

Rules the gate enforces (target): domain purity; session-only state (no
`localStorage` or IndexedDB in client code); the browser does not import the Supabase
client or read a secret; tier-1 holds no business rules; framework links resolve only
through the typed (entity, slug) resolver; no literal colors in components. Each rule
fails closed and has a test that goes red when the rule is turned into a no-op.

## Current state (migration in progress)

The decisions above are the target. The repository still contains the Phase 0 to 2
client-only React and Vite code (built under the superseded ADR-0001 and ADR-0004)
and its gate, which enforced the old client-only rules. The three-tier Next.js and
Material UI app, and the extended tier-aware gate, land in the app-platform work
(backlog T10). Until then, do not read the old `src/` layout or the old gate rules as
current; this file and the ADRs are the source of truth for the intended shape.

Built so far: the decisions of record (ADRs 0001 to 0025) and the eval harness
(`eval/`) that validated the matching approach and will choose the model.

## Pending (tracked, not yet built)

- The Next.js and Material UI three-tier app shell and the extended architecture gate
  (T10).
- The Supabase data tier and the build-time snapshot pipeline (T11).
- The decode engine ported from the eval harness into tier 2 (T03 to T09).
- The screens and the result stepper (T01, T02, T06 to T08) and resume and
  application prep (T16).
- The quality gates: a Gherkin BDD feature index wired into CI, coverage and mutation
  gates, the accessibility gates, the accuracy eval gate (threshold and labels still
  open), and dependency scanning (T12 to T15).
- Branch protection to make the CI checks merge-blocking.
