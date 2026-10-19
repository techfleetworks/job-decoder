import { describe, expect, it } from "vitest";
import { buildFrameworkData } from "../framework/builder";
import { buildDutyEvidence } from "./evidence";
import { fixtureDatasets, fixtureManifest } from "../../test/fixtures/framework";

const data = buildFrameworkData(fixtureManifest, fixtureDatasets);

describe("buildDutyEvidence", () => {
  it("includes the duty name and its task labels as phrases", () => {
    const evidence = buildDutyEvidence(data);
    const ux = evidence.get("ux-user-experience-design")!;
    const phrases = ux.map((e) => e.phrase);
    expect(phrases).toContain("ux user experience design"); // from the duty name
    expect(phrases).toContain("wireframing");
    expect(phrases).toContain("prototype creation");
  });

  it("de-duplicates phrases and records their source", () => {
    const evidence = buildDutyEvidence(data);
    const ux = evidence.get("ux-user-experience-design")!;
    const seen = new Set(ux.map((e) => e.phrase));
    expect(seen.size).toBe(ux.length);
    expect(ux.find((e) => e.phrase === "wireframing")?.source).toBe(
      "Responsible Tasks",
    );
  });

  it("pulls phrases from every evidence field, pinning the field-name constants", () => {
    const ux = buildDutyEvidence(data).get("ux-user-experience-design")!;
    const sourceOf = (label: string) =>
      ux.find((e) => e.label === label)?.source;
    expect(sourceOf("User Interviews")).toBe("Activities");
    expect(sourceOf("Design System")).toBe("Responsible Deliverables");
    expect(sourceOf("Visual Design")).toBe("Skills Required For the Duty");
    expect(sourceOf("Figma")).toBe("Unique Required Tools");
  });
});
