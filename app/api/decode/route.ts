// Tier 2: the decode route. It turns the HTTP request into plain data, calls the pure
// decode domain, and turns the result back into a response. It holds no business rules of
// its own (those live in src/domain/decode) and no secrets. It reads the framework only
// through the snapshot reader, never the database (ADR-0006).
//
// The body is untrusted input. The route parses it, then hands it to the domain's
// validateDecodeInput for the server-side rules (type, bounds, non-empty) before doing any
// work (owasp Input Validation). On failure it reports; it never returns a half result.
//
// The LLM recognizer runs server-side through the openrouter gateway and only ever sharpens
// the keyword result: its matches are validated against the framework and unioned in by the
// pure decode domain (ADR-0007, ADR-0037). When it is off or unavailable the gateway returns
// no matches, so the decode is still the keyword-only "basic read".

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildPrepGuide, decode, resolveTitle, validateDecodeInput } from "@/domain/decode";
import { recognizeMatches } from "@/data/server/openrouter";
import {
  loadDuties,
  loadDutyNames,
  loadItems,
  loadSkills,
  loadSlice,
  loadTitles,
  SnapshotMissingError,
} from "@/data/server/snapshot";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with a title and a posting." },
      { status: 400 },
    );
  }

  // Validate the untrusted body against the server-side rules before any work runs. The
  // rules live in the decode domain (validateDecodeInput), so they are tested on their own
  // and enforced in one place (ADR-0035, owasp Input Validation).
  const check = validateDecodeInput(body);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }
  const { title, posting } = check.value;

  try {
    const fnSlug = resolveTitle(loadTitles(), title);
    const slice = fnSlug ? loadSlice(fnSlug) : null;
    const items = loadItems();
    const llmMatches = await recognizeMatches(items, posting);
    const result = decode({ posting, items, slice, dutyNames: loadDutyNames(), llmMatches });
    const prepGuide = buildPrepGuide(result, { duties: loadDuties(), skills: loadSkills(), items });
    return NextResponse.json({ ...result, prepGuide });
  } catch (err) {
    // The snapshot not being present is the one expected operational failure, so report
    // it as unavailable. Anything else is logged on the server and returned as a generic
    // error, so no internal detail reaches the client.
    const dataMissing = err instanceof SnapshotMissingError;
    const message = err instanceof Error ? err.message : "decode failed";
    console.error(`/api/decode failed: ${message}`);
    return NextResponse.json(
      {
        error: dataMissing
          ? "The framework data is not available yet. Try again shortly."
          : "Something went wrong while decoding the posting.",
      },
      { status: dataMissing ? 503 : 500 },
    );
  }
}
