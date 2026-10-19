# ADR-0001: Static single-page app, no backend, local-only data

- Status: Accepted
- Date: 2026-10-18
- Deciders: Morgan (mdenner@techfleet.org)

## Context

Job Decoder (MVP #1) reads a pasted job description against the Tech Fleet
Skills & Practices Framework and shows the role responsibilities it expects.
The handoff requirements fix several constraints before any code is written:

- No accounts, no sign-up, no server-side user records. The app is fully usable
  on first visit.
- All user data (profile, pasted job descriptions, scans, notes) stays in the
  browser. Nothing leaves the device. "Your data never leaves your device" is a
  visible feature.
- Responsive web app on current Chrome, Safari, Firefox, Edge; usable at >= 360px
  with no horizontal scroll.
- WCAG 2.1 AA target; plain language at roughly a 7th-grade reading level.
- The framework data is open, served as static JSON over HTTPS, with no key.
- The app code ships under MIT; the framework data is CC BY 4.0 and attribution
  is required wherever the data is shown.

## Decision

Build a **static single-page application with no backend of our own**, deployed
as static files to a static host (for example GitHub Pages or Cloudflare Pages).

- **Framework and language:** React 18 with TypeScript, built by Vite.
  Rationale: the requirement is a rich, stateful, client-only UI; React + Vite
  is the conventional, well-supported fit, matches the Tech Fleet ecosystem, and
  keeps the whole app shippable as static assets.
- **Routing:** `react-router-dom` (client-side).
- **Styling:** plain CSS with design tokens (CSS custom properties), mobile-first,
  light and dark themes. No UI framework for MVP #1 to keep the bundle small and
  the markup semantic for accessibility.
- **Persistence (decided now, built in Phase 1):** the browser only, via a single
  storage service that owns all reads and writes. No cookies, no third-party
  storage, nothing sent off-device.
- **Framework data access (built in Phase 1):** fetch the open JSON (optionally
  from a bundled snapshot) and cache it client-side. The data is read-only; the
  app never forks or changes its meaning.
- **Testing:** Vitest + Testing Library for behavior, `jest-axe` for an
  accessibility baseline, wired so they can gate CI.

## Consequences

- No server means no server-side attack surface, no user database to breach, and
  the privacy promise holds by construction rather than by policy.
- Data loss is accepted for MVP #1 (clearing the browser clears the app); no
  export/import/sync is built yet.
- Any future need to match job descriptions with a **cloud** LLM would send user
  text off-device and would contradict this ADR; such a change requires a new ADR
  that revisits the privacy promise. On-device matching keeps this ADR intact.
- Static hosting constrains us to client-side routing with a history fallback
  (the host must serve `index.html` for unknown paths).

## Alternatives considered

- **Server-rendered app with accounts:** rejected. Directly contradicts the
  no-account, nothing-leaves-the-device requirements and adds operational burden
  with no MVP benefit.
- **Plain vanilla JS, no framework:** smaller, but harder for a build team to
  extend and test as the matching engine grows. Rejected for maintainability.
