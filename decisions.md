# Architecture decisions and boundaries

This file is the quick reference for how Job Decoder is built. It records the
boundaries that reviews (and the architecture gate) check against. Full
rationale for each significant decision lives in `docs/adr/`.

## Intended shape (MVP #1)

Static single-page app, no backend, all user data on-device. See
[ADR-0001](docs/adr/0001-static-spa-no-backend-local-only.md).

Layering, outer to inner:

- **Pages** (`src/pages`) — one per route. Compose components; hold no business
  rules and no direct data access.
- **Components** (`src/components`) and **app frame** (`src/app`) — presentation
  and layout only.
- **Services** (`src/services`) — own all browser I/O. `src/services/storage` is
  the single owner of `localStorage`; `src/services/framework/loader` is the single
  owner of network fetch. They may touch browser APIs; they never import React.
- **Domain** (`src/domain`) — pure logic over already-loaded data: slug resolution,
  coverage, and (later phases) the matching engine and fit scoring. No `fetch`, no
  `localStorage`, no DOM, no React. Runnable and testable without a browser.
- **Content** (`src/content`) — single-owner static text such as licensing and
  attribution.

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
