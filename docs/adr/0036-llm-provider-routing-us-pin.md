# ADR-0036: Pin the LLM to US-based providers with data collection denied

- Status: Accepted
- Date: 2026-11-02
- Deciders: Morgan (mdenner@techfleet.org)
- Builds on: [ADR-0007](0007-grounded-llm-matching.md) (grounded LLM matching), [ADR-0019](0019-eval-harness-for-model-selection.md) (eval harness).

## Context

The grounded LLM step (ADR-0007) sends the job posting to a third-party model through
OpenRouter. The on-device keyword path keeps the posting on the client; the LLM path does
not, so where the posting is processed, and whether a provider may retain or train on it,
is a real governance question for an app whose identity is privacy.

Morgan chose to start with a DeepSeek open-weight chat model (it is strong and cheap) but
requires a US provider. DeepSeek the company is based in China; its models are open-weight
and are also hosted by US-based inference companies. OpenRouter's provider routing can
restrict which provider serves a request.

What OpenRouter's provider routing can enforce, confirmed from its docs (retrieved
2026-11-02): `only` restricts the request to a list of provider slugs; `allow_fallbacks:
false` stops it using any provider outside that list; `data_collection: "deny"` restricts
routing to providers that do not store or train on the data. What it does not expose is a
provider's datacenter country.

## Decision

Route the OpenRouter request with a `provider` object:

- `data_collection: "deny"` always, so a provider that would retain or train on the posting
  is never used.
- `only: <allow-list>` and `allow_fallbacks: false` when an allow-list is configured, so the
  request only reaches a named US-based provider, or fails (and the decode falls back to the
  keyword-only "basic read"). It never silently routes elsewhere.

The model and the allow-list are configured by environment variable (`OPENROUTER_MODEL`,
`OPENROUTER_PROVIDERS`), defaulting to `deepseek/deepseek-chat-v3.1` and `deepinfra`.
`deepinfra` is a US company and a confirmed OpenRouter slug; other US providers (Together,
Fireworks) can be added once their exact slug is confirmed on the model's OpenRouter page.
The endpoint stays fixed (no user-controlled URL, no SSRF) and the key is read from the
environment and never logged (ADR-0007). This ADR covers the eval harness now; the live
`/api/decode` recognizer will consume the same config when it lands (T03).

## Security and governance (owasp, compliance-data-lifecycle)

- Data minimization: `data_collection: "deny"` keeps the posting from being retained or used
  for training by the provider.
- Fail-closed: a wrong or unavailable provider slug makes the call fail rather than route to
  an unlisted provider, and the decode degrades to keyword-only, so a misconfiguration never
  sends the posting somewhere outside the allow-list.
- The LLM remains a recognizer only: everything it returns is validated against the
  framework (slug must exist, quote must be verbatim), so a provider or a prompt-injected
  posting cannot change the result (ADR-0007).

## Consequences

- The posting is sent only to a US-based provider company that denies data collection, or
  not at all.
- **Honest limits:**
  - OpenRouter does not expose a provider's datacenter country, so this pins to US-based
    provider *companies*, not a *guaranteed US datacenter*. If a hard datacenter-region
    guarantee is ever required, the path is to call a US provider directly (Together,
    Fireworks) or a region-pinned cloud model (Bedrock, Azure), superseding the OpenRouter
    choice.
  - The allow-list slugs must be kept correct; a stale slug fails closed (no LLM) rather
    than routing unsafely, which is the intended direction.

## Alternatives considered

- **DeepSeek with no provider pin.** Rejected: the posting could be processed by DeepSeek's
  own (China) infrastructure, which does not meet the US requirement.
- **A US-origin model (OpenAI, Anthropic, Google).** Viable and avoids the China-origin
  question, at higher cost; kept as the fallback if DeepSeek accuracy or routing proves
  unsatisfactory. The config is model-agnostic, so switching is an env change.
- **Call a US provider's API directly instead of OpenRouter.** Deferred: it would give a
  documented region but drops OpenRouter's model flexibility and re-does the gateway. Revisit
  only if a hard datacenter guarantee becomes a requirement.
