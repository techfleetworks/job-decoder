import { NextResponse } from "next/server";

/**
 * Tier-2 decode route (ADR-0006). This is a stub. The real pipeline is ported from
 * the eval harness in tickets T03 to T09: it holds the OpenRouter key, reads the
 * framework snapshot, runs the keyword and grounded-LLM match, rolls up to hats,
 * classifies the sets, and returns the result. Nothing secret ever reaches tier 1.
 */
export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "not_implemented",
      message: "The decode route is not built yet. See tickets T03 to T09.",
    },
    { status: 501 },
  );
}
