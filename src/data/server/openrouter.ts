// Server-side gateway for the OpenRouter LLM recognizer (ADR-0007, ADR-0036, ADR-0037).
//
// This is the one impure edge of the recognizer: it reads the key from the environment,
// calls the fixed OpenRouter endpoint, and hands the model's raw content to the pure parser
// in the decode domain. It lives under /server/ because it does I/O and holds a secret; the
// browser never imports it and never sees the key (ADR-0009, enforced by the architecture
// gate's browser-no-secret rule).
//
// It never throws to the caller. When the key is absent, the request fails, or the model
// returns nothing usable, it returns no matches, so the decode degrades to the keyword-only
// "basic read" rather than erroring (recover). The model is a recognizer only: everything it
// returns is validated against the framework before use, so a provider or a prompt-injected
// posting cannot change the result. The endpoint is a fixed constant, so there is no
// user-controlled URL (no SSRF). The key and the posting are never logged.
//
// Provider routing (ADR-0036): the posting goes to a third party, so the request is pinned to
// a US-based provider allow-list with no fallback and data_collection denied. Honest limit:
// OpenRouter does not expose a provider's datacenter country, so this pins to US-based
// provider companies, not a guaranteed US datacenter.

import { buildRecognizerPrompt, parseRecognitions } from "@/domain/decode";
import type { Match, SnapshotItem } from "@/domain/decode/types";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash-1017";
const DEFAULT_PROVIDERS = "deepinfra";
// The request path degrades to keyword-only, so the LLM is given a short budget rather than
// stalling the decode (the repo's 8s recognizer-timeout rule).
const TIMEOUT_MS = 8000;

interface ProviderRouting {
  data_collection: "deny";
  only?: string[];
  allow_fallbacks?: boolean;
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// The US-based provider allow-list, pinned with no fallback, and data collection always
// denied. With no allow-list configured, data collection is still denied (ADR-0036).
function providerRouting(providers: string[]): ProviderRouting {
  const routing: ProviderRouting = { data_collection: "deny" };
  if (providers.length > 0) {
    routing.only = providers;
    routing.allow_fallbacks = false;
  }
  return routing;
}

// Recognize framework items in the posting with the LLM, or return [] when the recognizer is
// off or unavailable. Reads config from the environment so the same choice drives the eval
// harness and the app (.env.example, ADR-0036). Never throws.
export async function recognizeMatches(items: SnapshotItem[], posting: string): Promise<Match[]> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!apiKey) return []; // recognizer not configured: keyword-only basic read

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const providers = splitList(process.env.OPENROUTER_PROVIDERS || DEFAULT_PROVIDERS);
  const { system, user } = buildRecognizerPrompt(items, posting);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
        provider: providerRouting(providers),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      // Report the status, never the body (it can echo the posting) or the key.
      console.error(`recognizer: OpenRouter HTTP ${res.status}; using keyword-only`);
      return [];
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content ?? "";
    return parseRecognitions(items, posting, content).matches;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(`recognizer: OpenRouter call failed (${reason}); using keyword-only`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
