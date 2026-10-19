# ADR-0003: Mechanical architecture gate

- Status: Accepted
- Date: 2026-10-18
- Deciders: Morgan (mdenner@techfleet.org)
- Relates to: [ADR-0002](0002-framework-data-layer.md), `decisions.md`

## Context

Phase 1 introduced the first business logic and the first hard architectural
boundaries: a pure `domain/` layer, and two single-owner I/O seams
(`localStorage` only in the storage service, `fetch` only in the framework
loader). Until now those rules lived only as prose in `decisions.md` and were
checked only by human and judge review. A future change — a component reaching
for `localStorage` directly, or domain code importing `fetch` — would pass tests
and the type-checker and only be caught if a reviewer happened to notice.

The repo's own rule (global `CLAUDE.md`, `decisions.md`) is that when an
architectural change needs a mechanical gate and none exists, building it is part
of that change, not a follow-up, and it may not be self-waived as "trivial."

## Decision

Ship a dependency-free mechanical gate, `scripts/check-architecture.mjs`, run as
`npm run check:architecture`. It scans the source tree and fails on:

1. **Domain purity** — any file under `domain/` that references `fetch`,
   `localStorage`, `sessionStorage`, `window`, or `document`, or imports React.
2. **`localStorage` owner** — `localStorage` used outside
   `services/storage/localStore.ts`.
3. **`fetch` owner** — `fetch` used outside `services/framework/loader.ts`.
4. **Services avoid React** — no React import under `services/`.

Comments and string literals are stripped before matching, so prose that merely
mentions a term is not flagged. The gate runs in CI (`.github/workflows/ci.yml`)
next to the type-check, build, and tests.

**It is proven to detect** (verifiable-quality-gates): `src/test/architecture-gate.test.ts`
runs the real CLI against the live tree (must pass) and against planted
violations — domain `localStorage`, out-of-owner `fetch`, out-of-owner
`localStorage` (must each fail). If the gate is neutralized, those cases fail.

## Consequences

- The boundary rules are now enforced on every push, not only at review time.
- The check is intentionally simple (regex over comment/string-stripped source),
  so it is fast and has no dependencies, at the cost of not understanding full
  TypeScript semantics. An adversarial evasion (aliasing `globalThis` to dodge the
  match) is possible; that residual is covered by the judge-arch review, which is
  the other half of the gate.
- New boundaries get added here as they are introduced (the `arch-encode`
  approach), each with a discriminating test.

## Alternatives considered

- **Keep the rules as prose only:** rejected — unenforced rules rot the first time
  someone is in a hurry.
- **A full AST/ESLint custom rule:** more precise, but heavier (a lint plugin and
  its config) than the three boundaries warrant today. Revisit if the rule set
  grows or evasions appear.
