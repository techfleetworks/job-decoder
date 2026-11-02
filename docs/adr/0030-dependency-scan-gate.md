# ADR-0030: The dependency-scan gate

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0009](0009-security-resilience-quality-gates.md) (quality gates).

## Context

The app ships third-party code, so a known vulnerability in a production dependency is a
real risk (T13). `npm audit` reports advisories, but run bare it either passes silently or
fails on everything, including dev-only tooling that never reaches users. We need a gate
that blocks real, shippable risk while letting a known, tracked advisory through on purpose.

A scan today finds two production high/critical advisories, `next` (critical) and `postcss`
(high). npm reports both are fixable only by upgrading Next from 14 to 16, a major upgrade
that cascades to React 19 and MUI 7 with breaking changes across the app. Morgan chose to
waive these with a review date and do that upgrade as its own later PR, rather than block
the gate on a disruptive upgrade now.

## Decision

`npm run check:dependencies` runs `npm audit --omit=dev` and fails the build on any
production high or critical advisory that is not explicitly waived with an unexpired review
date.

- **Production only.** Dev tooling (test runners, linters) is out of scope; it never ships
  to users. The gate scans what reaches the bundle.
- **Waivers are explicit, reasoned, and expiring.** `scripts/dependency-waivers.json` lists
  each accepted advisory by package, with a reason and a `reviewBy` date. A new advisory with
  no waiver fails. A waiver whose date has passed fails. So a waiver cannot quietly become
  permanent; it must be renewed or the advisory fixed.
- **Current waivers:** `next` and `postcss`, both pending the Next 16 upgrade, review by
  2026-12-15.
- It runs as a blocking CI step, so a new production high/critical advisory cannot merge.

## Security and verification (owasp, verifiable-quality-gates)

- The evaluation is a pure function (`evaluateAudit`) with a discriminating test that plants
  a clean report, an unwaived critical, a current waiver, and an expired waiver, and requires
  the gate to pass, fail, pass, and fail. If the detection stops working, the test goes red.

## Consequences

- A new vulnerable production dependency fails the build; the two known Next-chain advisories
  are accepted on purpose, visibly, with a date that forces a revisit.
- **Honest limits:**
  - Dev-tooling advisories (there are several high/critical in the vite/vitest/eslint chain)
    are reported by a plain `npm audit` but are not gated, because they do not ship. They are
    addressed by their own routine upgrades.
  - Moderate and low advisories are not gated; the bar is high and critical.
  - Waiving a critical is a real, if bounded, risk acceptance. It is recorded with a reason
    and a review date rather than hidden, and the Next 16 upgrade that clears it is tracked.

## Alternatives considered

- **Fail on every advisory, including dev.** Rejected: it would block on tooling that never
  ships and train people to ignore the gate.
- **Fix now by upgrading Next to 16.** Deferred by decision: a major upgrade cascading to
  React 19 and MUI 7 is its own PR, not a prerequisite for shipping the gate.
- **Report-only, never block.** Rejected: then a new critical could slip in unnoticed.
