// Tier-1 client call to the decode route. The browser never talks to the database or the
// AI directly; it calls /api/decode (tier 2), which owns that. This wrapper turns a failed
// request into a typed, plain-language message instead of throwing into the UI.

import type { DecodeResult } from "@/domain/decode/types";
import type { PrepGuide } from "@/domain/decode";

/** The decode response includes the prep guide (null when the title is not covered). */
export type DecodeResultWithPrep = DecodeResult & { prepGuide: PrepGuide | null };

/** Why a decode failed, so the UI can show the right screen (rate-limited gets its own). */
export type DecodeFailReason = "rate-limited" | "error";

export type DecodeResponse =
  | { ok: true; result: DecodeResultWithPrep }
  | { ok: false; error: string; reason: DecodeFailReason };

export async function decodePosting(title: string, posting: string): Promise<DecodeResponse> {
  try {
    const res = await fetch("/api/decode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, posting }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      // A 429 is the rate limiter; the UI shows the "too many decodes" screen for it.
      const reason: DecodeFailReason = res.status === 429 ? "rate-limited" : "error";
      return {
        ok: false,
        error: body.error ?? "The decode did not work. Please try again.",
        reason,
      };
    }
    return { ok: true, result: (await res.json()) as DecodeResultWithPrep };
  } catch {
    return {
      ok: false,
      error: "We could not reach the decoder. Check your connection and try again.",
      reason: "error",
    };
  }
}
