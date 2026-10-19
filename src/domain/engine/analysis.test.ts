import { describe, expect, it } from "vitest";
import { buildFrameworkData } from "../framework/builder";
import { getRecord } from "../framework/resolver";
import { ENTITY } from "../framework/types";
import { analyzePosting } from "./analysis";
import { fixtureDatasets, fixtureManifest } from "../../test/fixtures/framework";

const data = buildFrameworkData(fixtureManifest, fixtureDatasets);
const uxDesigner = getRecord(data, ENTITY.jobFunctions, "ux-designer")!;

describe("analyzePosting", () => {
  it("splits standard hats into matched and expected-but-missing", () => {
    const result = analyzePosting(
      data,
      uxDesigner,
      "wireframing and prototype creation",
    );
    expect(result.matched.map((h) => h.slug)).toEqual([
      "ux-user-experience-design",
    ]);
    // "missing-duty" is standard for the title but not described (and not in the dataset).
    expect(result.expectedMissing.map((h) => h.slug)).toContain("missing-duty");
    expect(result.nonStandard).toEqual([]);
  });

  it("flags described hats that are not standard for the title", () => {
    const result = analyzePosting(
      data,
      uxDesigner,
      "wireframing, prototype creation, and software development",
    );
    expect(result.matched.map((h) => h.slug)).toContain(
      "ux-user-experience-design",
    );
    expect(result.nonStandard.map((h) => h.slug)).toContain(
      "software-development",
    );
  });

  it("keeps the triggering phrases on a matched hat", () => {
    const result = analyzePosting(
      data,
      uxDesigner,
      "wireframing and prototype creation",
    );
    expect(result.matched[0].matchedPhrases).toEqual(
      expect.arrayContaining(["Wireframing", "Prototype Creation"]),
    );
  });

  it("names an expected-but-missing hat even when its record is absent", () => {
    const result = analyzePosting(data, uxDesigner, "software development");
    const missing = result.expectedMissing.find((h) => h.slug === "missing-duty");
    expect(missing?.name).toBe("A Duty Not In The Dataset");
  });

  it("gives a partial verdict when some but not all standard hats are described", () => {
    const result = analyzePosting(
      data,
      uxDesigner,
      "wireframing and prototype creation",
    );
    expect(result.verdict.level).toBe("partial");
    expect(result.verdict.coverageRatio).toBeCloseTo(0.5);
  });

  it("gives a mismatch verdict when no standard hat is described", () => {
    const result = analyzePosting(data, uxDesigner, "software development only");
    expect(result.matched).toEqual([]);
    expect(result.verdict.level).toBe("mismatch");
    expect(result.nonStandard.map((h) => h.slug)).toContain(
      "software-development",
    );
  });
});
