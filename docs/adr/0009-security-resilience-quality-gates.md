# ADR-0009: Security, resilience, and quality gates (the "structurally safe" model)

- Status: Accepted (2026-10-31)
- Deciders: Morgan (mdenner@techfleet.org)
- Relates to: [ADR-0003](0003-mechanical-architecture-gate.md) (the gate this extends), [ADR-0006](0006-three-tier-architecture.md), [ADR-0007](0007-grounded-llm-matching.md), [ADR-0008](0008-framework-data-model-integrity.md)

## Context

The ask was to make the app "impossible to fail, break, or get hacked." No system
achieves that, and this app has two irreducible exposures: the pasted posting
leaves the device to a third party (OpenRouter) once that step was chosen, and no
gate proves the absence of all bugs or vulnerabilities. So this ADR records the
strongest honest version: **failure is contained, security is layered, and a whole
class of regression is caught by construction.** Each guarantee names what makes it
true and what it does not cover. The controls are `documented` here; they reach
`proven` only when the code and the CI gates exist (per verifiable-quality-gates).

## Decision

### Part A: Resilience (contain failure; recover, retry, or report)

- Every out-of-process call (OpenRouter, Supabase) has a timeout and a per-request
  budget. No unbounded wait.
- OpenRouter failure or timeout: retry once, then fall back to the deterministic
  rule-based matcher (ADR-0007) and label the result. The person always gets a
  grounded answer; the app degrades, it never crashes.
- **Fail closed on cost and data.** If the spend or rate check cannot run, deny the
  LLM call and serve the rule-based result. A failure must never spend money or
  skip a safety check by accident.
- The build reads the published framework version from Supabase; if Supabase is
  paused or unreachable, the build fails loudly rather than shipping an empty
  snapshot. Runbook: resume the project, redeploy.
- **Single writer:** only the server writes Supabase; the browser never does. No
  write contention, so no locking logic to get wrong.

### Part B: Security (OWASP threat model, step 4 security-decision record)

**Surface.** Entry points: `/api/decode` (posting in), the browser, the build job.
Assets: the OpenRouter key, the Supabase service key, framework-data integrity, and
the spend. Trust boundaries: browser to server, server to OpenRouter, server to
Supabase. Data flow: posting to server to OpenRouter.

**Threats, ranked, each with a countermeasure and the OWASP sheet it draws on:**

| Threat | Rank | Countermeasure | Sheet |
|---|---|---|---|
| Prompt injection via the pasted posting | High | Posting delimited as untrusted; system rule forbids following instructions in it; output schema-constrained; model output never reflected into an executable sink | LLM Prompt Injection Prevention |
| Model fabricates a hat or a quote | High | Every hat validated against the loaded framework; the quote must occur verbatim in the posting; invalid dropped and counted | (grounding, ADR-0007) |
| Secret exposure (key leaks) | High | Keys only in Vercel env, never in the client bundle, never logged; anon key read-only, service key server-only; rotation | Secrets Management |
| SSRF from the server | Medium | Egress allowlist = OpenRouter and Supabase only; no user-controlled URLs | Server Side Request Forgery Prevention |
| XSS when rendering the posting or model output | Medium | Render as text, never HTML; strict Content-Security-Policy; Subresource Integrity; secure headers | XSS Prevention, Content Security Policy |
| Cost abuse / denial of service | Medium | Posting length cap; rate limit per hashed IP + daily cap (fail-closed); hard OpenRouter spend cap | Denial of Service |
| Sensitive-info disclosure to the third party | Medium | Send only the posting + resolved function, never identity or profile; provider no-training setting on; never log the posting; tell the person at submit | User Privacy Protection |
| Vulnerable or malicious dependency | Medium | Pinned deps, `npm audit` + scan in CI, SBOM, reproducible snapshot with checksum | Vulnerable Dependency Management |

**Accepted / eliminated by design:** no accounts means no auth, session, or
access-control surface (eliminated). The one object-reference risk is the decode
cache; it is keyed by a content hash with no user identifier, so there is nothing
to enumerate (mitigated).

**Each countermeasure ships an executable `@security` BDD scenario** in the shared
feature index (via bdd-comprehensive-testing), wired into CI. Until those scenarios
exist and run, each control is `documented`, not `proven`.

### Part C: Quality gates (regression caught by construction)

- **Architecture gate (ADR-0003), extended** with tier rules: the browser may not
  import the database client or any secret; tier-1 components hold no business
  rules; data access only through the data-source modules; links resolved only
  through the typed (entity, slug) resolver (ADR-0008).
- **Every check fails closed and has a committed discriminating test:** no-op the
  check and its test must go red (verifiable-quality-gates). A green check means the
  guard works, not just that it ran.
- **Coverage + mutation gates** on the domain logic (classification, scoring,
  validation, resolution).
- **BDD acceptance scenarios** for every in-scope use case (ADR-0005) and every
  `@security` control, blocking in CI.
- **Accuracy gate (instantiates the long-open ADR-010 need).** A labeled set of
  real postings with expected hat sets; precision and recall measured for the three
  sets; an agreed threshold must pass before release and on every change to the
  matcher or the prompt. Without this, "accurate" is unmeasured; this gate is what
  lets the word be used.
- **Dependency scan + SBOM** in CI.

## Consequences

- A class of failure (unhandled outage, runaway spend, secret in the browser,
  screen touching the database, fabricated hat, injected instruction, a check gone
  blind, an accuracy regression) becomes caught by construction once these gates
  exist.
- The residual is stated, not hidden: the correctness of the chosen OWASP sheets
  and scenarios is judgment (caught by judge-arch), the absence of all bugs is not
  provable, and the posting's exposure to OpenRouter is real and only minimized.
- Everything here is `documented` today. It becomes `proven` as the code and CI
  land, each gate with its discriminating test.

## Alternatives considered

- **Claim "impossible to fail or hack."** Rejected: false, and it is the exact
  overclaim the skeptical audit exists to stop.
- **Rely on review instead of gates.** Rejected: unproven checks rot; a gate with a
  discrimination test does not.
