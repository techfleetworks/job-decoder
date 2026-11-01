# Architecture review: Next.js + MUI three-tier scaffold (T10)

- Date: 2026-11-01
- Change: `feat/nextjs-mui-scaffold` (base `feat/foundation-consolidate`, PR #5)
- Standard: `decisions.md`, ADR-0006, ADR-0009, ADR-0011, ADR-0013, ADR-0026
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **PASS** (1 low finding, 2 info limitations, none blocking)

## Scope

Replaces the Phase 0 to 2 React and Vite client-only app with the three-tier
scaffold: `app/` (layout, ThemeRegistry, landing page, about page, the
`/api/decode` stub), `src/theme/theme.ts`, `src/components/FrameworkCredit`, the
architecture gate extended to the tier rules with its discriminating test, the CI
workflow, and `vercel.json`. The old app, its config, and the superseded on-device
engine are removed.

## What the review confirmed

- No tier-1 (client) file holds a secret or imports the Supabase client. The
  reviewer re-ran the gate against planted violations and each was flagged, while
  the same secret placed in the server-tier route was correctly not flagged.
- The Material UI theme (`src/theme/theme.ts`) is the single owner of color, and
  components use no literal colors.
- The CC BY 4.0 credit is single-owned in `src/content/licensing.ts` and rendered
  only through `FrameworkCredit`.
- The decode route is a thin stub that defers all logic to later tickets, which is
  correct for a scaffold. There is no business logic or data layer yet, so the
  domain-purity and data-ownership checks are mostly not applicable in this PR.
- No empty or swallowed catches. The one catch in the gate test reports.

## Findings

- **F1 (low, ownership):** the `no-literal-color` rule catches hex and
  `rgb`/`rgba`/`hsl`/`hsla` colors but not CSS named colors such as
  `rebeccapurple`. No component in the scaffold uses one. This is documented as a
  limitation in the gate header and tracked in the `decisions.md` pending list. It
  is not mechanized yet because a naive check would also flag Material UI theme
  tokens such as `color="primary"`; the planned fix is a CSS-named-color allowlist
  with its own discriminating test.
- **F2 (info):** the hex regex could, in theory, match a hex-like anchor href such
  as `#abc`. None exists in this change. Noted in the gate header.
- **F3 (info):** secret and DB-client detection is import- and `process.env`-shaped,
  so a dynamic import or a lowercased env name would slip. This is consistent with
  ADR-0009's layered, not absolute, stance, and the client bundle cannot reach a
  server-only env at runtime in any case.

## Verification

Main session on this branch: architecture gate PASS, `next lint` clean,
`tsc --noEmit` clean, 13 of 13 Vitest tests pass, and `next build` succeeds
(6 pages). The machine-readable record is appended to `docs/arch-reviews/log.jsonl`.
