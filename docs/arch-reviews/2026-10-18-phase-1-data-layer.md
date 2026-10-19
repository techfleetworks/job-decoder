# Architecture review — Phase 1 data layer

- Date: 2026-10-18
- Change: branch `feat/phase-1-data-layer` (base `feat/phase-0-foundation`)
- Scope: framework loader, slug resolver, builder, validation, coverage
  (not-covered handler), the localStorage owner, the mechanical arch gate + CI,
  and tests.
- Standard: [decisions.md](../../decisions.md),
  [ADR-0002](../adr/0002-framework-data-layer.md),
  [ADR-0003](../adr/0003-mechanical-architecture-gate.md)
- Review context: fresh (general-purpose subagent, separate from the authoring
  context)

## Verdict

Fresh-context judge-arch returned **2 findings; both are now resolved** with
re-runnable evidence. The in-code four-question matrix was clean on the first
pass — both findings were about gate completeness and one error-handling edge,
not the core design.

Grep battery (observed clean): domain layer is pure (no `fetch`/`localStorage`/
`window`/`document`); `localStorage` appears only in `services/storage/localStore.ts`;
`fetch` as a dependency appears only in `services/framework/loader.ts`; no
empty/no-op catches.

## Findings and resolutions

### F-1 (medium) — mechanical gate was absent

Phase 1 adds the first business logic, which by `decisions.md` and the global
rules makes the mechanical gate required *with this change* (not a follow-up, not
self-waivable).

**Resolved:** built `scripts/check-architecture.mjs` (`npm run check:architecture`)
enforcing domain purity and the `localStorage`/`fetch` single-owner rules; wired
into CI (`.github/workflows/ci.yml`); added a discriminating test
(`src/test/architecture-gate.test.ts`) that proves the gate detects planted
violations; recorded in [ADR-0003](../adr/0003-mechanical-architecture-gate.md).
Gate run: **PASS**.

### F-2 (low) — malformed live manifest masked by stale cache

A manifest that was valid JSON but the wrong shape threw a `validation` error
*inside* the network catch, so a warm cache silently served stale data instead of
surfacing the integrity problem.

**Resolved:** the manifest fetch is now split from its validation. A transport or
parse failure may fall back to cache (offline resilience); a **validation** failure
propagates. New test: *"does not mask a malformed live manifest with a warm cache"*
asserts the error surfaces with `kind: "validation"`.

## Verification (main session)

- `npm run check:architecture` → **PASS**
- `tsc -b` + `vite build` → clean
- `npm run test:run` → **43/43 passing**, including the 6 gate-discrimination
  tests, the warm-cache validation test, and 0 axe accessibility violations.

## Limitation

Both findings were fixed and verified via the mechanical gate and new tests. A
second full fresh-context pass over the fixed tree was not run; a confirmatory
re-review is available on request.
