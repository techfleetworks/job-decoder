import { describe, expect, it } from "vitest";
import { buildRecognizerPrompt, parseRecognitions } from "./recognize";
import type { SnapshotItem } from "./types";

const items: SnapshotItem[] = [
  { slug: "wireframing", type: "activity", label: "Wireframing", aliases: [], duties: ["ux-design"] },
  {
    slug: "prototype-creation",
    type: "activity",
    label: "Prototype Creation",
    aliases: [],
    duties: ["ux-design"],
  },
];

const posting = "You will build wireframes and a clickable prototype for new features.";

function content(matches: unknown): string {
  return JSON.stringify({ matches });
}

describe("buildRecognizerPrompt", () => {
  it("lists every candidate and fences the posting as data", () => {
    const { system, user } = buildRecognizerPrompt(items, posting);
    expect(system).toContain("recognize wording only");
    expect(user).toContain("activity\twireframing\tWireframing");
    expect(user).toContain("prototype-creation");
    // The posting sits between the data markers, not merged into the instructions.
    expect(user).toContain("<<<POSTING");
    expect(user).toContain(posting);
  });
});

describe("parseRecognitions", () => {
  it("keeps a valid recognition, tagged via llm, carrying its quote", () => {
    const { matches, dropped } = parseRecognitions(
      items,
      posting,
      content([{ type: "activity", slug: "wireframing", quote: "build wireframes" }]),
    );
    expect(dropped).toHaveLength(0);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      slug: "wireframing",
      type: "activity",
      label: "Wireframing",
      tier: "exact",
      term: "Wireframing",
      via: ["llm"],
      duties: ["ux-design"],
      quote: "build wireframes",
    });
  });

  it("drops a slug that is not in the framework (hallucinated or injected)", () => {
    const { matches, dropped } = parseRecognitions(
      items,
      posting,
      content([{ type: "activity", slug: "grant-admin-access", quote: "build wireframes" }]),
    );
    expect(matches).toHaveLength(0);
    expect(dropped).toEqual([
      { slug: "grant-admin-access", type: "activity", reason: "slug-not-in-framework" },
    ]);
  });

  it("drops a real slug whose quote is not verbatim in the posting (fabricated evidence)", () => {
    const { matches, dropped } = parseRecognitions(
      items,
      posting,
      content([{ type: "activity", slug: "wireframing", quote: "lead the entire design org" }]),
    );
    expect(matches).toHaveLength(0);
    expect(dropped).toEqual([
      { slug: "wireframing", type: "activity", reason: "quote-not-verbatim" },
    ]);
  });

  it("keeps a recognition with no quote (the quote is optional evidence)", () => {
    const { matches } = parseRecognitions(
      items,
      posting,
      content([{ type: "activity", slug: "wireframing" }]),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]!.quote).toBeUndefined();
  });

  it("deduplicates a slug the model returned twice", () => {
    const { matches } = parseRecognitions(
      items,
      posting,
      content([
        { type: "activity", slug: "wireframing", quote: "build wireframes" },
        { type: "activity", slug: "wireframing", quote: "wireframes" },
      ]),
    );
    expect(matches).toHaveLength(1);
  });

  it("reads only type, slug, and quote; an extra field on the item cannot bind", () => {
    const { matches } = parseRecognitions(
      items,
      posting,
      content([
        { type: "activity", slug: "wireframing", quote: "build wireframes", duties: ["cfo"], via: ["forged"] },
      ]),
    );
    // The duties and via come from the framework item, never from the model's payload.
    expect(matches[0]!.duties).toEqual(["ux-design"]);
    expect(matches[0]!.via).toEqual(["llm"]);
  });

  it("drops a real slug under the wrong type, never resolving by slug alone", () => {
    // decisions.md forbids resolving a framework link by slug alone (slugs collide across
    // entities), so a real slug paired with the wrong type is not a match.
    const { matches, dropped } = parseRecognitions(
      items,
      posting,
      content([{ type: "tool", slug: "wireframing", quote: "build wireframes" }]),
    );
    expect(matches).toHaveLength(0);
    expect(dropped).toEqual([{ slug: "wireframing", type: "tool", reason: "slug-not-in-framework" }]);
  });

  it("returns no matches and a no-json drop when the model returns prose, without throwing", () => {
    const { matches, dropped } = parseRecognitions(items, posting, "I could not find anything useful.");
    expect(matches).toHaveLength(0);
    expect(dropped).toEqual([{ reason: "no-json" }]);
  });

  it("extracts the JSON object when the model wraps it in prose", () => {
    const { matches } = parseRecognitions(
      items,
      posting,
      'Here you go: {"matches":[{"type":"activity","slug":"wireframing","quote":"build wireframes"}]} done.',
    );
    expect(matches).toHaveLength(1);
  });

  it("ignores a non-array matches field instead of crashing", () => {
    const { matches, dropped } = parseRecognitions(items, posting, JSON.stringify({ matches: "nope" }));
    expect(matches).toHaveLength(0);
    expect(dropped).toHaveLength(0);
  });
});
