// Tier 2: the decode route. It turns the HTTP request into plain data, calls the pure
// decode domain, and turns the result back into a response. It holds no business rules of
// its own (those live in src/domain/decode) and no secrets. It reads the framework only
// through the snapshot reader, never the database (ADR-0006).
//
// The posting is untrusted input, so the route validates its type and bounds its length
// before doing any work (owasp). On failure it reports; it never returns a half result.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode, resolveTitle } from "@/domain/decode";
import {
  loadDutyNames,
  loadItems,
  loadSlice,
  loadTitles,
  SnapshotMissingError,
} from "@/data/server/snapshot";

const MAX_TITLE = 200;
const MAX_POSTING = 50_000;

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

  const { title, posting } = (body ?? {}) as { title?: unknown; posting?: unknown };
  if (typeof title !== "string" || typeof posting !== "string") {
    return NextResponse.json(
      { error: "Both title and posting are required, and both must be text." },
      { status: 400 },
    );
  }
  if (title.length > MAX_TITLE || posting.length > MAX_POSTING) {
    return NextResponse.json({ error: "The title or posting is too long." }, { status: 413 });
  }
  const cleanPosting = posting.trim();
  if (!cleanPosting) {
    return NextResponse.json({ error: "The posting is empty." }, { status: 400 });
  }

  try {
    const fnSlug = resolveTitle(loadTitles(), title);
    const slice = fnSlug ? loadSlice(fnSlug) : null;
    const result = decode({
      posting: cleanPosting,
      items: loadItems(),
      slice,
      dutyNames: loadDutyNames(),
    });
    return NextResponse.json(result);
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
