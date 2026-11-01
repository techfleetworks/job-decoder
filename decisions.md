# Architecture decisions and boundaries

This file is the quick reference for how Job Decoder is built. It records the
boundaries that reviews (and the architecture gate) check against. Full
rationale for each significant decision lives in `docs/adr/`.

## Intended shape (MVP #1)

**Superseded 2026-10-31: this is now a three-tier app, not client-only.** See
[ADR-0006](docs/adr/0006-three-tier-architecture.md) (three-tier),
[ADR-0007](docs/adr/0007-grounded-llm-matching.md) (OpenRouter matching with a
deterministic fallback), [ADR-0008](docs/adr/0008-framework-data-model-integrity.md)
(data integrity), [ADR-0009](docs/adr/0009-security-resilience-quality-gates.md)
(security, resilience, gates), and [ADR-0005](docs/adr/0005-mvp1-scope-job-not-candidate.md)
(scope). [ADR-0001](docs/adr/0001-static-spa-no-backend-local-only.md) and
[ADR-0004](docs/adr/0004-on-device-matching-engine.md) are superseded. MVP 1 decodes
one posting and explains the job, not the candidate (ADR-0005).

Three tiers, each reached only through the tier above it:

- **Tier 1, screens** (Next.js + Material UI, static on Vercel's CDN). Collect the
  title and posting, show the result, save the scan on the device. Never calls the
  database, never holds a secret, holds no business rules.
- **Tier 2, server code** (`/api/decode` and the build step, on Vercel). The only
  place secrets and business rules live. Holds the OpenRouter key; owns the Hat
  Check logic; the only tier that talks to Supabase or OpenRouter.
- **Tier 3, database** (Supabase Postgres). Public framework data only, no user
  data. Row-level security on; only the server's service-role key writes.

Layers (Fowler), which are about code organization, not where code runs:

- **Presentation** — screens and components. Format and display; no business rules;
  never talks to the data layer directly.
- **Domain** — pure business logic over already-loaded data: title resolution,
  matching, validation, classification, scoring, verdict, resume highlights. No
  `fetch`, no storage, no DOM, no React. Runnable and testable without a browser.
- **Data source** — all I/O: the framework snapshot read, the typed (entity, slug)
  resolver (ADR-0008), the decode route's calls to OpenRouter and Supabase, and the
  on-device store for saved scans. The domain never reaches past this layer.
- **Content** — single-owner static text such as licensing and attribution.

## Standing rules

- **Attribution has one owner.** The CC BY 4.0 credit line lives only in
  `src/content/licensing.ts`. Anywhere framework data is shown reads it from
  there; never hand-copy the credit line into a component.

  ```ts
  // ❌ never — credit line hand-copied into a component
  <p>The Skills & Practices Framework by Tech Fleet, licensed under CC BY 4.0.</p>

  // ✅ always — read the single source
  <p>{FRAMEWORK_ATTRIBUTION.creditLine}</p>
  ```

- **No business logic in pages or components.** Matching, scoring, and resolution
  belong in a service/domain module that another part of the app could call.

- **`localStorage` has one owner: `src/services/storage`.** Every read and write of
  user data OR the framework cache goes through it. No other module calls
  `localStorage`.

  ```ts
  // ❌ never — localStorage touched outside the storage service
  localStorage.setItem("profile", JSON.stringify(profile))

  // ✅ always — go through the single owner
  userStore.set("profile", profile)
  ```

- **Network fetch has one owner: `src/services/framework/loader`.** No other module
  calls `fetch`. It is the only gateway to the remote framework data.

- **The domain layer is pure.** `src/domain/**` must not reference `fetch`,
  `localStorage`, `window`, `document`, or React. If it needs data, it is passed in.

- **The data is read-only.** Never fork or change the framework data's meaning.
  When the data does not cover something, say so; do not guess (`src/domain/coverage`).

## Mechanical gate (live)

The boundary rules above are enforced by `npm run check:architecture`
(`scripts/check-architecture.mjs`, [ADR-0003](docs/adr/0003-mechanical-architecture-gate.md)):
domain purity, `localStorage` single-owner, and `fetch` single-owner. It runs in
CI (`.github/workflows/ci.yml`) alongside the type-check, build, and tests, and
has a discriminating test (`src/test/architecture-gate.test.ts`) that proves it
detects planted violations.

## Pending (tracked, not yet built)

- A formal Gherkin/BDD feature index (current behavior is covered by Vitest unit
  and component tests; add the BDD layer when the user-facing flows land).
- Branch protection to make the CI checks merge-blocking.
