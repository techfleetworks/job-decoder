// Server-side input validation for the decode route. The route (tier 2) turns the HTTP
// request into a parsed body and hands it here; this module owns the rules for what a valid
// decode request is, so the rules are testable without a request and enforced in one place
// (ADR-0035, owasp Input Validation). It is pure: no request, no response, no I/O.
//
// The rules are an allow-list, applied before any decoding runs:
//  - the body must be a plain JSON object (not null, not an array);
//  - only `title` and `posting` are ever read, and both must be text (owasp Mass
//    Assignment: a crafted body cannot bind any other field);
//  - each has a maximum length, checked before the posting is trimmed, so an oversized
//    request is turned away before the matcher does any work (owasp Denial of Service);
//  - the posting must not be blank after trimming.
// The posting is trimmed once here and used as-is downstream; it is not decoded or
// re-processed again (owasp: decode once, then validate the exact value you will use).

export const MAX_TITLE = 200;
// The posting cap is 20,000 characters: the product limit shown in the prototype (T17 /
// ADR-0041), which the input screen counts down against. It is also the server-side DoS cap,
// so the one constant is the single source of truth for both the field and the validator.
export const MAX_POSTING = 20_000;

/** Why a decode request was rejected. Lets callers and tests assert the exact rule. */
export type DecodeInputReason = "not-object" | "wrong-type" | "too-long" | "empty-posting";

export type DecodeInputCheck =
  | { ok: true; value: { title: string; posting: string } }
  | { ok: false; status: number; error: string; reason: DecodeInputReason };

export function validateDecodeInput(body: unknown): DecodeInputCheck {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      error: "Send a JSON object with a title and a posting.",
      reason: "not-object",
    };
  }

  // Allow-list: read only the two intended fields. Any other field on the body is never
  // looked at, so a crafted request cannot bind to anything else.
  const { title, posting } = body as { title?: unknown; posting?: unknown };

  if (typeof title !== "string" || typeof posting !== "string") {
    return {
      ok: false,
      status: 400,
      error: "Both title and posting are required, and both must be text.",
      reason: "wrong-type",
    };
  }

  // Bound the length before trimming, so a huge whitespace-only posting is rejected as too
  // large rather than slipping past as "empty".
  if (title.length > MAX_TITLE || posting.length > MAX_POSTING) {
    return {
      ok: false,
      status: 413,
      error: "The title or posting is too long.",
      reason: "too-long",
    };
  }

  const cleanPosting = posting.trim();
  if (!cleanPosting) {
    return { ok: false, status: 400, error: "The posting is empty.", reason: "empty-posting" };
  }

  return { ok: true, value: { title, posting: cleanPosting } };
}
