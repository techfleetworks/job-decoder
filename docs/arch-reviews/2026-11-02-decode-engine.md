# Architecture review: decode engine and /api/decode route (T03 to T09)

- Date: 2026-11-02
- Change: `feat/decode-engine` (base `main`)
- Standard: `decisions.md`, ADR-0006, ADR-0018, ADR-0021, ADR-0022, ADR-0028
- Review context: fresh (general-purpose subagent, not the authoring context)
- Verdict: **3 findings (1 med, 2 low)**; F1 and F2 fixed in this change, F3 tracked

## Scope

The keyword decode path: the pure TypeScript domain (`src/domain/decode` — text, matcher,
classifier, orchestrator), the server snapshot reader (`src/data/server/snapshot.ts`), the
`/api/decode` route, and the snapshot derivation's new duty-name index. 10 code files
reviewed against the four questions, every cell verdicted with evidence; the grep battery
was run.

## What the review confirmed

- The decode domain is pure: the grep battery found no `fetch`, storage, DOM, `request`,
  `response`, React, or `next`/data/server imports anywhere in `src/domain/decode` (the one
  hit was a comment). Business rules live in the domain, not the route.
- The route is a thin adapter: it validates the posting's type and bounds its length
  (200 / 50,000) before any work, reads once through the snapshot reader, calls the domain,
  and returns the result. It holds no secrets and reads no database.
- Dependency direction is inward only (route to domain and data; domain imports nothing
  outward). No reverse dependency.
- The snapshot reader throws on a missing file rather than returning empty, and the build
  writes the read model with one owner per fact (items stored once, referenced by slug).

## Findings

- **F1 (med, error-handling):** the route chose a retryable 503 versus a generic 500 by a
  substring match on the thrown error message, so rewording the message would silently turn
  "data not ready" into a 500 and break any monitor or client keyed on 503. **Fixed:** the
  data layer now throws a typed `SnapshotMissingError` and the route checks `instanceof`, so
  the contract is a type, not prose.
- **F2 (low, boundary):** `splitUnits` was exported from `text.ts` but `match.ts` re-inlined
  the same split regex, leaving the real rule in two places. **Fixed:** `match.ts` now
  imports and calls `splitUnits`.
- **F3 (low, data-ownership):** the matcher and text helpers exist in three runtimes (the
  app's TypeScript domain and the two eval `.mjs` copies). The behavior is aligned today and
  the split is the deliberate ADR-0028 decision (a shared matcher would break the pure-TS
  domain), but the drift guard, the T12 accuracy gate that runs the eval fixtures against the
  app, is not built yet. **No code change**; tracked as T12 so the eval is not treated as the
  app's accuracy proof until that gate exists.

## Verification

After the F1 and F2 fixes: `tsc --noEmit` clean, the decode Vitest suite passes (13 cases),
the architecture gate passes, and the BDD suite runs the TypeScript decode scenarios green
under the tsx loader. The machine-readable record is appended to `docs/arch-reviews/log.jsonl`.

## Limitation

Matching accuracy is not measured here (no labeled fixtures); that is T12. What is proven is
line-accountability, the classification and verdict logic, and the route's input handling.
The route's filesystem read of `public/snapshot` is traced into the function bundle and
exercised by the route test; it is confirmed on Vercel when the screens call the route.
