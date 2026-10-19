import { describe, expect, it } from "vitest";
import { buildFrameworkData } from "./builder";
import {
  getAssociatedDuties,
  getPrimaryName,
  getRecord,
  getRefs,
  listRecords,
  resolveRefs,
} from "./resolver";
import { ENTITY } from "./types";
import { fixtureDatasets, fixtureManifest } from "../../test/fixtures/framework";

const data = buildFrameworkData(fixtureManifest, fixtureDatasets);

describe("framework resolver", () => {
  it("indexes records by slug", () => {
    const jf = getRecord(data, ENTITY.jobFunctions, "ux-designer");
    expect(jf?.id).toBe(1);
    expect(getRecord(data, ENTITY.jobFunctions, "nope")).toBeUndefined();
  });

  it("reads the display name from the manifest primary field", () => {
    const jf = getRecord(data, ENTITY.jobFunctions, "ux-designer")!;
    expect(getPrimaryName(data, ENTITY.jobFunctions, jf)).toBe("UX Designer");
  });

  it("reads relationship fields as clean SlugRef arrays", () => {
    const duty = getRecord(data, ENTITY.duties, "ux-user-experience-design")!;
    const tasks = getRefs(duty, "Responsible Tasks");
    expect(tasks.map((t) => t.slug)).toEqual(["wireframing", "prototype-creation"]);
    // A non-array / missing field yields an empty list, not a throw.
    expect(getRefs(duty, "No Such Field")).toEqual([]);
  });

  it("resolves associated duties by slug, keeping the label when a slug is missing", () => {
    const jf = getRecord(data, ENTITY.jobFunctions, "ux-designer")!;
    const duties = getAssociatedDuties(data, jf);
    expect(duties).toHaveLength(2);

    const resolved = duties.find((d) => d.slug === "ux-user-experience-design")!;
    expect(resolved.record?.id).toBe(1);

    // The reference to a duty not present in the dataset keeps its label but has no record.
    const missing = duties.find((d) => d.slug === "missing-duty")!;
    expect(missing.record).toBeUndefined();
    expect(missing.label).toBe("A Duty Not In The Dataset");
  });

  it("resolveRefs maps across entities by slug", () => {
    const jf = getRecord(data, ENTITY.jobFunctions, "ux-designer")!;
    const refs = getRefs(jf, "Associated Duties");
    const resolved = resolveRefs(data, ENTITY.duties, refs);
    expect(resolved[0].record?.slug).toBe("ux-user-experience-design");
  });

  it("lists all records for an entity", () => {
    expect(listRecords(data, ENTITY.jobFunctions).map((r) => r.slug)).toEqual([
      "ux-designer",
      "software-engineer",
    ]);
    expect(listRecords(data, "does-not-exist")).toEqual([]);
  });
});
