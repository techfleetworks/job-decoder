# ADR-0050: Switch the recognizer to a non-reasoning model (deepseek-chat-v3-0324 on gmicloud) to fit the interactive budget

- Status: Accepted
- Date: 2026-11-13
- Deciders: Morgan (mdenner@techfleet.org)
- Refines: [ADR-0036](0036-llm-provider-routing-us-pin.md) (the default model and US-provider allow-list it set). Builds on [ADR-0037](0037-live-llm-recognizer-in-decode.md) (live recognizer), [ADR-0047](0047-vocabulary-finds-meaning-confirms.md) (vocabulary and meaning), [ADR-0043](0043-decode-rate-limiting.md) (the 8s recognizer budget).
- Tracks ticket: recognizer-timeout fix. Resolves the parked T12 (model selection).

## Context

A live production check on 2026-11-12 found the recognizer was not contributing at all: two production decodes each ran ~8.5–9s and returned zero recognizer matches (the keyword-only "basic read"). Direct probing of the configured model, `deepseek/deepseek-v4.1-flash-1017` on `deepinfra`, measured ~50s per call (50.4s, then 49.5s). The gateway aborts at 8s (`TIMEOUT_MS`, ADR-0043), so every production decode was degrading to keyword-only, which silently disabled the ADR-0047 meaning-confirmation and the ADR-0049 multi-item recall for live users.

The root cause is the model class, not the key, prompt, or code: **all deepseek *flash* variants on OpenRouter are reasoning models.** A reasoning model generates a long hidden chain-of-thought before answering, which is exactly wrong for a recognizer that only needs structured extraction. The recognizer prompt is small (~3,100 tokens), so input size is not the bottleneck.

A head-to-head benchmark was run on the current labeled fixtures (`eval/fixtures.labeled.json`, one eval run each), pinned to US providers:

| Model | Reasoning? | ~Latency/call | Overall F1 | Activity F1 | Deliverable F1 | Hat-level | Neg leaks (of 2) | Provider |
|---|---|---|---|---|---|---|---|---|
| deepseek-v4.1-flash-1017 (prior default) | yes | ~50s | not re-run | — | — | — | — | deepinfra |
| deepseek-v4-flash-0731 | yes | ~41–57s | 93 | 91 | 94 | 92% | 1 | deepinfra |
| **deepseek-chat-v3-0324** | **no** | **~3.4–5s** | **92** | **91** | **91** | **94%** | 2 | gmicloud |
| gpt-4o-mini | no | ~2.4s | 88 | 85 | 89 | 86% | 2 | openai |

The reasoning model (deepseek-v4-flash-0731, F1 93) scored only ~1 point above the non-reasoning deepseek-chat (F1 92) while costing ~10x the latency, so the reasoning premium does not justify its latency. The non-reasoning deepseek captures deepseek-family accuracy (and the best hat-level, 94%) and fits the 8s budget. A reliability probe of deepseek-chat-v3-0324 on gmicloud (8 sequential calls) returned 8/8 success, 0 throttles, p50 3.8s / p90 4.9s, every call under 8s.

## Decision

1. **Default the recognizer to `deepseek/deepseek-chat-v3-0324` (a non-reasoning instruct model), pinned to provider `gmicloud`.** Change the default in both decode twins (ADR-0028): `src/data/server/openrouter.ts` (`DEFAULT_MODEL`, `DEFAULT_PROVIDERS`) and the eval harness (`eval/run.mjs`), plus `.env.example` and the eval README. The `OPENROUTER_MODEL` / `OPENROUTER_PROVIDERS` override mechanism (ADR-0036) is unchanged.

2. **Add `gmicloud` to the ADR-0036 US-provider allow-list.** GMI Cloud is a US company, headquartered in Mountain View, CA (verified 2026-11-13), so it meets the ADR-0036 "US-based provider company" rule with the same honest limit the ADR already states (US company, not a guaranteed US datacenter). `deepseek-chat-v3-0324` is served on OpenRouter only by `gmicloud` and `siliconflow`; siliconflow is a China company and is excluded, so gmicloud is the one permitted provider.

3. **Keep the 8s abort (`TIMEOUT_MS`, ADR-0043).** Measured p90 is 4.9s, comfortably inside 8s; a rare slow call still fails closed to the keyword-only read (ADR-0036). Revisit the budget only if monitoring shows a meaningful degrade rate.

## Consequences

- The production recognizer actually runs again: live decodes get the ADR-0047 meaning check and ADR-0049 multi-item recall instead of the keyword-only basic read, at ~3–5s.
- `data_collection: "deny"`, `only: ["gmicloud"]`, `allow_fallbacks: false` (ADR-0036) still hold, so the posting reaches only gmicloud (a US company that denies data collection) or the call fails closed.
- **Honest limits:**
  - **No in-allow-list fallback.** gmicloud is the *only* US provider serving this model id, and ADR-0036 forbids fallbacks, so a gmicloud outage or throttle degrades that decode to keyword-only. That is the intended fail-closed direction, but it is a single-provider dependency; if gmicloud reliability proves insufficient in production, the paths are to add another US provider that serves this model (none exists on OpenRouter today) or to accept the degrade.
  - **Single-run accuracy.** Each F1 above is one nondeterministic eval run on ~19 fixtures, so treat ±a few points as noise. The latency finding (reasoning ~50s vs non-reasoning ~4s) is robust and repeated; the accuracy *ranking* (both deepseek variants > gpt-4o-mini) is consistent across every metric but not multi-run averaged.
  - **Datacenter country** is still not exposed by OpenRouter (ADR-0036), so this remains a US-company pin, not a US-datacenter guarantee.
  - The 2 out-of-domain negative leaks (vs the reasoning model's 1) are the small precision cost of dropping reasoning; mechanism B (ADR-0047) and the verbatim-quote validation still bound what can be asserted.

## Alternatives considered

- **gpt-4o-mini on openai.** Viable and the most provider-certain option (OpenAI US infra, 0 errors in testing), but ~4 F1 and 8 hat-level points below deepseek-chat on the same fixtures. Kept as the ready fallback if gmicloud reliability disappoints.
- **Keep a deepseek reasoning flash model and raise the timeout / go async.** Rejected for now: ~40–57s per call is a poor decode UX and likely exceeds the serverless function budget; an async decode (background job + poll) is a real rework and the ~1 F1 it would buy over the non-reasoning deepseek does not justify it.
- **deepseek-chat-v3-0324 on siliconflow.** Rejected: siliconflow is a China company and fails the ADR-0036 US pin.
