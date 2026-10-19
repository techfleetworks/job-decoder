# ADR-0002: Framework data layer — fetch, cache, resolve, and local storage

- Status: Accepted
- Date: 2026-10-18
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0001](0001-static-spa-no-backend-local-only.md)

## Context

Phase 1 is the foundation every feature reads from: load the open Skills &
Practices Framework data, resolve its relationships, store the user's own data on
their device, and answer honestly when a title or duty is not covered.

Observed data shape (from the live `manifest.json` and dataset files):

- The manifest lists entities: `{ entity, file, count, primaryField, targetField? }`.
- Every record has a numeric `id`, a string `slug`, a primary field (e.g.
  `"Job Function"`, `"Duty Name"`), relationship fields that are arrays of
  `{ slug, label }`, and some plain-text fields.
- Relationships reference other records by `slug` (not by display label).
- Job Functions carry `"Other Job Titles You May See in the World"` (a
  comma-separated string) used to map a real-world title to a Job Function.

## Decision

Two layers with a hard line between I/O and logic.

### Services (own all browser I/O — the only modules allowed to)

- **`src/services/storage` — the single owner of `localStorage`.** A typed,
  namespaced (`jobdecoder:v1:*`), versioned key-value store. Every read and write
  is wrapped in try/catch (storage throws in private mode or when full) and
  returns a typed result instead of throwing into callers. `clearAll()` removes
  every app key (satisfies "clear all my data"). All user data AND the framework
  cache go through this one owner; nothing else touches `localStorage`.
- **`src/services/framework/loader` — the gateway to the remote data.** Fetches
  the manifest and the needed entity files from the fixed framework origin only
  (allowlisted base URL, not a caller-supplied URL), with an `AbortController`
  timeout. Validates every payload's shape before trusting it. Caches a validated
  snapshot via the storage service, keyed by the manifest `version`; later visits
  read the cache (performance NFR: cached after first load). Reports failures as a
  typed `FrameworkLoadError` (network / parse / validation) — it never silently
  returns empty data.

### Domain (pure — no fetch, no localStorage, no DOM)

- **`src/domain/framework` — types + builder + slug resolver.** `buildFrameworkData`
  turns raw datasets into per-entity `Map<slug, record>` indexes. The resolver
  resolves `{ slug, label }` references to records **by slug**, falling back to the
  embedded `label` when a slug is missing from the dataset (honest, no invention).
- **`src/domain/coverage` — the not-covered handler.** Normalizes a typed title
  and matches it against Job Function names and their world-title aliases. Returns
  `covered` (with the Job Function) or `not-covered` (with the input) — never a
  guess. Also answers whether a given entity slug is present.

### Data loading strategy

Fetch at runtime from the framework origin, validate, cache in `localStorage` by
version, hold one in-memory copy per session. A **bundled snapshot** is a
documented future option (removes the first-load network dependency) but is out of
scope for Phase 1 to avoid bundle bloat; the loader takes an injectable fetch so a
bundled fallback can be added without changing callers.

## Pattern choice (pattern-selector)

- **Gateway** for the loader (one place that knows how to reach and validate the
  remote source) and **Repository** for storage (one place that owns local
  persistence). Forces resolved: a single source of truth for each I/O concern,
  and a pure domain that is testable without a browser or network.
- Rejected: scattering `fetch`/`localStorage` across components (fails data
  ownership and dependency direction); a heavyweight DI container or generic
  ORM-like abstraction (over-engineering for a read-only dataset and a handful of
  local keys).

## Security (owasp-secure-coding)

- Framework data is **untrusted external input**. The loader validates structure
  (array of objects, each with numeric `id` and string `slug`) and rejects
  malformed payloads rather than trusting them. Base URL is allowlisted; no
  caller-supplied URLs; no `eval`/dynamic code. Values are rendered through React
  (auto-escaped) in later phases.
- `localStorage` access is fully guarded (try/catch) and treats absence as empty,
  so a blocked/full/private-mode store degrades instead of crashing.

## Consequences

- The grep battery will see `fetch` in `loader` and `localStorage` in `storage`.
  That is **by design**: these two modules are the declared I/O owners (see
  `decisions.md`). The domain layer stays clean, which is where the dependency
  rule bites.
- No user data leaves the device; the only network call is a GET of public,
  read-only framework JSON.
- Data loss on cache clear is accepted (ADR-0001); no export/sync in MVP #1.
