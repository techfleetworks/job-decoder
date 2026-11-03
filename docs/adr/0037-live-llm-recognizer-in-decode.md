# ADR-0037: Run the grounded LLM recognizer live in /api/decode

- Status: Accepted
- Date: 2026-11-03
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0007](0007-grounded-llm-matching.md) (grounded LLM matching), [ADR-0006](0006-three-tier-architecture.md) (three tiers), [ADR-0036](0036-llm-provider-routing-us-pin.md) (US-provider pin), [ADR-0035](0035-decode-input-validation-gate.md) (input validation).

## Context

The decode so far has run keyword-only in production. The LLM recognizer (ADR-0007) existed
only in the eval harness (`eval/lib/openrouter.mjs`), which proved the data flow and the
anti-corruption validation but never ran on the request path. This ADR brings that recognizer
into `/api/decode` so the live decode can recognize paraphrase the lexical matcher misses,
while the keyword path stays the floor.

The recognizer sends the untrusted posting to a third-party model, so three things must hold
at once: the model must never be able to add an item the framework does not define (including
via a prompt injection inside the posting); the key must stay server-only; and a model
failure must not fail the decode.

The structural question is where the pieces live under the three-tier boundary (ADR-0006).
The validation and prompt building are pure (no I/O), so they belong in the decode domain
where every other rule lives and where they can be tested with no network. The HTTP call, the
key, and the provider routing are impure and hold a secret, so they belong in a server-tier
gateway, next to the snapshot reader.

## Decision

Split the recognizer across the boundary and keep the model subordinate to the framework.

- **Pure parser in the domain** (`src/domain/decode/recognize.ts`): `buildRecognizerPrompt`
  and `parseRecognitions`. `parseRecognitions` is total and pure. It keeps a recognition only
  when its slug and type name a real framework item and any quote it carries is verbatim in
  the posting; everything else is dropped with a reason. It reads only `type`, `slug`, and
  `quote` from each returned item, so an extra field cannot bind. It never throws.
- **Server gateway** (`src/data/server/openrouter.ts`): `recognizeMatches(items, posting)`
  reads the key and config from the environment, calls the fixed OpenRouter endpoint with the
  ADR-0036 provider routing, and hands the model's raw content to the pure parser. It never
  throws: no key, a failed request, a non-ok status, a timeout, or garbled output all return
  no matches, so the decode degrades to the keyword-only basic read.
- **Route wiring** (`app/api/decode/route.ts`): the route calls `recognizeMatches` and passes
  the result into `decode` as `llmMatches`; the pure `decode` unions them with the keyword
  matches, stronger tier winning, sources merged (ADR-0007 seam, already present).

## Security and governance (owasp)

The surface is outbound HTTP to a third party carrying an untrusted posting. Threats and the
controls that hold them, each with its proof:

- **Prompt injection / hallucination (critical).** The model recognizes wording only and
  returns candidate slugs; every slug is validated against the framework and every quote
  against the posting. An injected instruction in the posting, or a made-up slug, is dropped.
  The structural guarantee is the allow-list validation in `parseRecognitions`, not the
  prompt wording. Proof: `@security` scenarios `recognizer-injected-slug` and
  `recognizer-fabricated-quote`, plus `recognize.test.ts`.
- **Mass assignment on the model's output (medium).** Only `type`, `slug`, and `quote` are
  read from a returned item; `duties` and `via` always come from the framework item. Proof:
  `@security` scenario `recognizer-extra-fields` and the matching unit test.
- **Error handling / DoS (medium).** The call has an 8s timeout and every failure path returns
  no matches (recover), so a slow or broken provider cannot hang or fail the decode. Proof:
  `@security` scenario `recognizer-garbled-output` and the gateway tests for reject/non-ok.
- **SSRF (structural).** The endpoint is a fixed constant; no part of the URL is user- or
  model-controlled. Proof: the gateway test asserts the exact URL. (Not a pure-code scenario,
  so it is covered by the unit assertion, not a `@security` Gherkin case.)
- **Secret handling (structural).** The key is read from `OPENROUTER_API_KEY` in the server
  tier only, passed in the `Authorization` header, and never logged (only the HTTP status is
  logged, never the response body or the posting). The architecture gate's browser-no-secret
  rule keeps the gateway out of the client bundle (ADR-0009).

## Consequences

- The live decode can recognize paraphrase the keyword matcher misses, and the keyword result
  stays the floor, so turning the recognizer off (no key) is a safe degrade, not an outage.
- The posting now leaves the server for a third-party provider on every decode when the key is
  set. That is the governance cost ADR-0036 addresses: the request is pinned to a US-based
  provider with data collection denied.
- **Honest limits:**
  - Accuracy is still unproven. T12 (a validated accuracy threshold) needs hand-labeled
    fixtures; this ADR ships the path, not a measured precision/recall.
  - The quote check accepts a verbatim substring (mirroring the eval harness), so it proves the
    quote came from the posting, not that it is a well-formed phrase. The slug allow-list, not
    the quote, is the primary guarantee.
  - There is no per-IP rate limit on `/api/decode` yet (noted in ADR-0035); a caller with the
    endpoint can drive LLM spend. Rate limiting is tracked as a follow-up, out of MVP1 scope.
  - A recognized match is carried at `tier: "exact"`, so on union with a weaker keyword match
    the receipt shows "exact"; the `via: ["llm"]` provenance records that it came from the
    model. A distinct tier for LLM recognitions (so the receipt never labels a paraphrase as a
    lexical exact) is a tracked follow-up, not an MVP1 blocker.

## Alternatives considered

- **Keep the recognizer in the eval harness only.** Rejected: the whole point of T03 is a live
  grounded recognizer; the harness proved the flow but never runs for a user.
- **Put the fetch in the decode domain.** Rejected: it would break domain purity (ADR-0006),
  make the validation untestable without a network, and the architecture gate would fail it.
- **Fail the decode when the LLM is unavailable.** Rejected: the keyword path is a correct,
  useful result on its own, so a model outage should degrade quality, not deny the answer.
