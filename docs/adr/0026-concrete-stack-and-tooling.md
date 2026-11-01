# ADR-0026: Concrete stack and tooling for the three-tier app

- Status: Accepted
- Date: 2026-11-01
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: ADR-0006 (three-tier), ADR-0013 (Material UI), ADR-0003 and ADR-0009
  (the architecture gate and quality gates), ADR-0019 (the eval harness).

## Context

ADR-0006 and ADR-0013 chose a three-tier app on Next.js and Material UI, hosted on
Vercel, with Supabase for the framework data. Those decisions named the frameworks
but not the exact versions or the test and build tooling. We need those pinned so the
build is reproducible and so CI can run the same checks every time.

## Decision

- **App framework:** Next.js 14 (App Router), React 18. Static pages are built and
  served from Vercel's CDN; the `app/api/decode` route is the only server code.
- **Design system:** Material UI 5 with Emotion, wired for the App Router through
  `@mui/material-nextjs`. One theme in `src/theme/theme.ts` holds all colors and type
  (ADR-0013). Components read the theme; no color is typed into a component.
- **Language:** TypeScript in `strict` mode, with `noUncheckedIndexedAccess` on.
- **Unit and component tests:** Vitest with Testing Library and `jest-axe`.
- **Behavioral tests:** Cucumber.js, added in the next PR, so every ticket's Gherkin
  scenarios run as blocking CI checks. See ADR-0009 Part C and the BDD skill.
- **Linting:** `eslint-config-next`, run as its own CI step on Node 20. It is kept out
  of `next build` so the build does not depend on the lint runner.
- **Node:** version 20 in CI and on Vercel (`.nvmrc`, `engines`).
- **Hosting config:** `vercel.json` pins the framework to `nextjs` so the deploy does
  not depend on the dashboard preset.
- **Architecture gate:** `scripts/check-architecture.mjs` is extended to the tier
  rules (see Consequences), each with a test that fails when the rule is turned off.

## Consequences

- The build is reproducible: versions are pinned in `package-lock.json`, and CI, local
  dev, and Vercel all run Node 20.
- The old client-only React and Vite app (Phases 0 to 2) is removed in this change.
  Its pure logic is re-added later by porting the eval pipeline into tier 2
  (tickets T03 to T09), not by keeping the superseded on-device engine.
- The architecture gate now checks, with a discriminating test for each rule: domain
  purity; no `localStorage` or IndexedDB in client code (session-only state,
  ADR-0011); the browser does not import the Supabase client or read a server-only
  secret; and no literal colors in components. "Tier-1 holds no business rules" stays
  a review rule (judge-arch), since it is not reliably checkable by a text scan.
- Lint on very new local Node may fail, so it is a separate CI step rather than part
  of the build. This is an honest limit, not a reason to skip linting.

## Alternatives considered

- **Next.js 15 and React 19 with MUI 6 or 7.** Newer, but less settled with Material
  UI at the time of writing. Next 14 and MUI 5 is the safer, well-documented pairing.
- **Playwright or Jest instead of Vitest.** Vitest fits a Vite and TypeScript project,
  is fast, and pairs with Testing Library and `jest-axe`. End-to-end tooling can be
  added later for the few journeys that need a real browser.
