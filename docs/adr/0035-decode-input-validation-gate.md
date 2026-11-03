# ADR-0035: Decode input validation as a pure, tested domain check

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0009](0009-security-resilience-quality-gates.md) (quality gates), [ADR-0028](0028-decode-engine-and-route.md) (decode engine and route).

## Context

`POST /api/decode` is the one public entry point that takes untrusted input: a JSON body
with a `title` and a `posting` (T13). The route already checked the input, but the rules
lived inline in the route handler, mixed with the HTTP plumbing. That had two problems:
the rules could only be exercised by faking a request, and a security control with no test
of its own is easy to weaken without anyone noticing.

An OWASP threat model of the surface (entry point: the JSON body; assets: service
availability and honest error messages; trust boundary: the public HTTP edge) ranks the
threats as: oversized input exhausting the matcher (Denial of Service, high); malformed or
mistyped input reaching the matcher (Input Validation, high); and a crafted body binding
unexpected fields (Mass Assignment, medium). The matcher is O(units x items) and runs the
whole posting, so an unbounded posting is the main availability risk; it uses no
user-supplied regular expression, so there is no catastrophic-backtracking (ReDoS) path.

## Decision

Extract the request rules into a pure domain function, `validateDecodeInput(body: unknown)`
in `src/domain/decode/validate.ts`, and have the route call it. The function owns a
server-side allow-list, applied before any decoding runs:

- the body must be a plain JSON object (not null, not an array);
- only `title` and `posting` are ever read, and both must be text, so a crafted body cannot
  bind any other field (Mass Assignment);
- each has a maximum length (`MAX_TITLE` 200, `MAX_POSTING` 50,000), checked before the
  posting is trimmed, so an oversized request is turned away before the matcher runs
  (Denial of Service);
- the posting must not be blank after trimming.

It returns a discriminated result carrying the HTTP status and message on failure (400 for
a bad shape, wrong type, or empty posting; 413 for too long) and the trimmed values on
success. The route turns the request into a parsed body and formats the response; the
domain owns the decision. The posting is trimmed once and used as-is, not re-decoded
downstream.

## Security and verification (owasp, verifiable-quality-gates, bdd-comprehensive-testing)

- Five executable `@security` scenarios in `features/security/decode-input.feature` run over
  the pure validator in CI (oversized, wrong-type, non-object, blank, extra-fields), tagged
  to the OWASP sheets they defend. They are blocking checks through the BDD gate suite.
- A discriminating Vitest suite (`src/domain/decode/validate.test.ts`) asserts the exact
  rejection reason and status for each bad input, the at-limit boundary, the trim, and that
  extra fields (including `__proto__`) never bind.
- **The real guarantee:** the server-side allow-list rule set, enforced before any business
  logic and never delegated to the client, is what makes every request that breaks the
  contract safe. The scenarios prove individual attacks are turned away; the rule set is the
  guarantee.

## Consequences

- The rules are testable without a request and enforced in one place, so a future change
  that weakens them fails a test.
- **Honest limits:**
  - Validation reduces bad data; it is not a stand-in for the rest. There is no SQL,
    template, or shell sink on this path (the matcher is pure in-memory over the snapshot),
    so there is nothing to parameterize or encode here, but that is a property of the path,
    not a general exemption.
  - There is no per-IP rate limit in MVP1; the length caps bound a single request, not a
    flood. Platform-level rate limiting is deferred and noted as a follow-up.

## Alternatives considered

- **Leave the rules inline in the route.** Rejected: they could only be tested through a
  faked request, and the security control had no test of its own, so it could be weakened
  silently.
- **Validate with a schema library (zod).** Rejected for MVP1: two string fields with length
  bounds do not justify a new runtime dependency; a hand-written allow-list is small, pure,
  and fully tested. Revisit if the request grows more fields or nested structure.
- **Trim before the length check.** Rejected: a huge whitespace-only posting would then slip
  past the cap as "empty" instead of being rejected as too large, so the cap is applied to
  the raw length first.
