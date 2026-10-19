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
- **Services / domain** (`src/services`, `src/domain` — added as phases land) —
  own the decisions: framework-data loading, slug resolution, the job-description
  matching engine, fit scoring, local persistence. UI calls these; these never
  import React or touch the DOM.
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
  (No such logic exists yet; this rule guards Phases 1+.)

- **Local storage goes through one service.** When persistence lands, every read
  and write of user data goes through a single storage owner, not scattered
  `localStorage` calls.

- **The data is read-only.** Never fork or change the framework data's meaning.
  When the data does not cover something, say so; do not guess.

## Pending (tracked, not yet built)

- Mechanical architecture gate (`npm run check:architecture`) and CI wiring.
- BDD feature index and CI test gate.
- These become required as soon as Phase 1 adds business logic to review.
