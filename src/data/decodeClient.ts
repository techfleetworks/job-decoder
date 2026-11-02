// Tier-1 client call to the decode route. The browser never talks to the database or the
// AI directly; it calls /api/decode (tier 2), which owns that. This wrapper turns a failed
// request into a typed, plain-language message instead of throwing into the UI.

import type { DecodeResult } from "@/domain/decode/types";

export type DecodeResponse =
  | { ok: true; result: DecodeResult }
  | { ok: false; error: string };

export async function decodePosting(title: string, posting: string): Promise<DecodeResponse> {
  try {
    const res = await fetch("/api/decode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, posting }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        error: body.error ?? "The decode did not work. Please try again.",
      };
    }
    return { ok: true, result: (await res.json()) as DecodeResult };
  } catch {
    return {
      ok: false,
      error: "We could not reach the decoder. Check your connection and try again.",
    };
  }
}
