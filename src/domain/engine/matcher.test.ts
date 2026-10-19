import { describe, expect, it } from "vitest";
import { buildFrameworkData } from "../framework/builder";
import { matchJobDescription } from "./matcher";
import { fixtureDatasets, fixtureManifest } from "../../test/fixtures/framework";

const data = buildFrameworkData(fixtureManifest, fixtureDatasets);

describe("matchJobDescription", () => {
  it("describes a duty whose evidence phrases appear in the text", () => {
    const described = matchJobDescription(
      data,
      "You will own wireframing and prototype creation for our product.",
    );
    const ux = described.find((d) => d.slug === "ux-user-experience-design");
    expect(ux).toBeDefined();
    expect(ux?.matchedPhrases).toEqual(
      expect.arrayContaining(["Wireframing", "Prototype Creation"]),
    );
  });

  it("ignores a single generic-word hit below the score threshold", () => {
    // "coding" alone is one token (score 1) < default minScore 2.
    expect(matchJobDescription(data, "some coding here")).toEqual([]);
  });

  it("describes a duty when a multi-word phrase matches", () => {
    const described = matchJobDescription(data, "strong software development skills");
    expect(described.map((d) => d.slug)).toContain("software-development");
  });

  it("returns nothing for empty text", () => {
    expect(matchJobDescription(data, "   ")).toEqual([]);
  });

  it("sorts stronger matches first", () => {
    const described = matchJobDescription(
      data,
      "wireframing, prototype creation, ux user experience design, and software development",
    );
    expect(described.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < described.length; i += 1) {
      expect(described[i - 1].score).toBeGreaterThanOrEqual(described[i].score);
    }
  });

  it("respects a custom minScore", () => {
    const described = matchJobDescription(data, "some coding here", { minScore: 1 });
    expect(described.map((d) => d.slug)).toContain("software-development");
  });
});
