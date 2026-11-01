# ADR-0006: Three-tier architecture on Vercel + Supabase, with an OpenRouter step

- Status: Accepted (2026-10-31). **Supersedes [ADR-0001](0001-static-spa-no-backend-local-only.md).**
- Deciders: Morgan (mdenner@techfleet.org)
- Relates to: [ADR-0005](0005-mvp1-scope-job-not-candidate.md) (scope), [ADR-0007](0007-grounded-llm-matching.md) (matching), [ADR-0009](0009-security-resilience-quality-gates.md) (hardening)

## Context

ADR-0001 chose a static, client-only SPA with no backend and the promise that no
user data ever leaves the device. Two decisions since then reverse its premises:

1. Morgan chose an **LLM step via OpenRouter** for matching (ADR-0007). The
   OpenRouter key must never reach the browser, and the pasted posting must be
   sent somewhere to be analyzed. That requires server-side code.
2. Morgan set the target at very high traffic and chose **Vercel + Supabase**.

The class material frames this as the standard **three-tier** shape and states
the governing rule: "never let the screen talk to the database directly," and
"tier 2 is the server code; plan where your app's rules will live."

So ADR-0001's "no backend, nothing leaves the device" no longer holds and must be
replaced, not quietly contradicted.

## Decision

Build as three tiers, each with one job, each reached only through the tier above
it.

- **Tier 1, the screens.** Next.js + Material UI, delivered as pre-built static
  assets on Vercel's CDN. The screen collects the title and posting, shows the
  result, and saves the scan on the device. It never calls Supabase and never
  holds a secret.
- **Tier 2, the server code on Vercel.** The one place the app's rules and all
  secrets live. It runs the decode route (`/api/decode`) that holds the
  OpenRouter key and owns the Hat Check logic (ADR-0007), and a build-time step
  that reads the published framework version from Supabase and emits the snapshot.
  It is the only tier that talks to Supabase or OpenRouter.
- **Tier 3, the database on Supabase (Postgres).** Public framework data only (no
  user data, ADR-0005). Row-level security on, nothing public, only the
  server's service-role key writes.

User data (saved scans) stays on the device in the browser, by local storage. The
only user content that leaves the device is the pasted posting, sent to tier 2 and
on to OpenRouter, and only after the person is told at submit (ADR-0005, ADR-0009).

**The business rules do not depend on the screen or the transport.** The Hat Check
domain logic is pure TypeScript; the route adapts an HTTP request into plain data,
calls the domain, and returns plain data. This keeps the four-questions dependency
rule: tier 1 depends inward on tier 2, never the reverse.

## Consequences

- The privacy claim changes honestly from "nothing leaves your device" to "no
  account; your saved work stays on your device; the posting you submit is sent to
  our server and an AI service to analyze, and we tell you before you submit."
  ADR-0009 minimizes what is sent and bounds who can see it; it cannot make a
  third party we do not control risk-free.
- Cost now has a server component (OpenRouter calls, Morgan is paying). ADR-0009
  bounds it with a hard spend cap and fail-closed limits.
- A whole class of client-only failure (secret in the browser, screen touching the
  database) becomes impossible to merge once the architecture gate (ADR-0003,
  extended in ADR-0009) checks tier boundaries. That gate is the structural part,
  and it is `proven` only when the new code and CI exist; today it is the design.

## Alternatives considered

- **Keep client-only, bring-your-own OpenRouter key.** No server, but every user
  must paste their own paid key, which is unusable for a class demo and still
  sends the posting off-device. Rejected.
- **Two-tier (browser talks straight to Supabase).** The class material rejects
  this; it would put a key or broad database access in the browser. Rejected.
