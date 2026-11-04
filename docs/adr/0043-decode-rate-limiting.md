# ADR-0043: Per-client rate limiting on the decode route

- Status: Accepted
- Date: 2026-11-04
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0035](0035-decode-input-validation-gate.md) (server-side input validation on the route), [ADR-0028](0028-decode-engine-and-route.md) (the decode route and domain), [ADR-0009](0009-security-resilience-quality-gates.md) (security and resilience gates).

## Context

`POST /api/decode` runs the decode domain and an upstream LLM call. It had no per-client cap,
so a flood of requests could exhaust decode/LLM capacity and run up cost (a denial-of-service
and a cost risk). The prototype's screen 20 ("Too many decodes") is the UI for exactly this
case. T13 left per-IP rate limiting as a follow-up; this is it.

## Decision

A per-client **fixed-window** rate limit in front of the route's work:

1. **Pure decision** (`src/domain/rateLimit.ts`): `decideRateLimit(count, config)` returns
   `{ allowed, remaining, retryAfterSeconds }` from the post-increment count. The cap is
   `DECODE_RATE_LIMIT` = 20 decodes / 10 minutes, tunable in one place. No clock, no store, no
   request — unit-tested on its own.
2. **Store port** (`src/data/server/rateLimitStore.ts`): `hit(key, windowSeconds) → count`.
   The route depends on the port, not the implementation. The default adapter is **in-memory**.
3. **The route** derives the client IP from the **platform-trusted** address (`x-real-ip` /
   Vercel's forwarded header, never the client-controlled left-most `x-forwarded-for` token, so
   the key cannot be rotated to dodge the cap), hashes it into the key, calls `hit`, and on
   `!allowed` returns **429** with a `Retry-After` header. If the store throws, the route stays
   available but **denies the LLM call** and serves the keyword-only result — the standing rule
   (decisions.md, ADR-0009: fail closed on the paid call when the rate check cannot run) — and
   logs, so a limiter outage never leaves the cost path uncapped.
4. **Privacy**: the raw IP is never stored. It is hashed (`sha256(salt:ip)`) and the key is
   ephemeral (it lives only for the window). No IP, raw or hashed, is written to the database,
   so there is no new personal-data schema column and no retention obligation beyond the window.
5. **UI**: a 429 becomes the client reason `rate-limited`, and `DecodeFlow` shows the
   `TooManyDecodes` screen (prototype 20).

## Security-decision record (OWASP threat modeling)

- **Surface**: entry `POST /api/decode`; asset = decode + paid LLM capacity; trust boundary =
  the untrusted client; data flow = request → limiter → decode.
- **Sheets selected**: Denial of Service; User Privacy Protection (the IP).
- **Threats (ranked)**: request flood → resource/cost exhaustion — **high**; storing client IPs
  → privacy exposure — **medium**.
- **Countermeasures**: the per-window cap (mitigate the flood); hashed, ephemeral, non-persisted
  key (mitigate the privacy exposure).
- **`@security` scenario**: `@usecase:decode-rate-limit` in `features/security/rate-limit.feature`
  — fills a client's window to the cap, proves the next request is rejected and a different
  client is still served. Runs in CI via `test:bdd`.
- **Real guarantee**: the structural cap in the route is what makes every over-limit request
  safe; the scenario checks the (limit + 1)th request is turned away.

## Consequences / honest limit

- The in-memory store is **per-process**. On serverless (Vercel) it enforces the cap only within
  a single warm instance, so **production durability needs a shared store** (e.g. Upstash Redis)
  behind the same `RateLimitStore` port — swap the adapter, not the route or the decision. This
  is the one remaining deploy-time step; the code, the 429 path, the screen, and the control's
  test are in place and regression-proof regardless.
- On a store error the route stays available but drops to the keyword-only decode (no LLM call),
  so the paid path is never uncapped even when the limiter is down — consistent with the repo's
  fail-closed-on-cost rule (decisions.md / ADR-0009), not in conflict with it.
- The key is the platform-trusted client IP, not the client's left-most `x-forwarded-for` token,
  so a flood cannot rotate the header to get a fresh bucket; `clientIp` has a discriminating test
  (a spoofed left-most token is ignored in favour of the trusted header).
