import { describe, expect, it } from "vitest";
import { buildFrameworkData } from "../framework/builder";
import { getRecord } from "../framework/resolver";
import { ENTITY } from "../framework/types";
import { getDutyDetail } from "./dutyDetail";
import { fixtureDatasets, fixtureManifest } from "../../test/fixtures/framework";

const data = buildFrameworkData(fixtureManifest, fixtureDatasets);

describe("getDutyDetail", () => {
  it("reads every plain-language field, pinning the field-name constants", () => {
    const duty = getRecord(data, ENTITY.duties, "ux-user-experience-design")!;
    const detail = getDutyDetail(data, duty);
    expect(detail.name).toBe("UX (User Experience) Design");
    expect(detail.description).toBe("Shaping the end-to-end experience.");
    expect(detail.whyImportant).toBe("Because usable design drives adoption.");
    expect(detail.whatItTakes).toBe("Curiosity and iteration.");
    expect(detail.firstStep).toBe("Sketch a simple flow.");
  });

  it("returns empty strings for fields a record does not have", () => {
    // software-development has no plain-language fields in the fixture.
    const duty = getRecord(data, ENTITY.duties, "software-development")!;
    const detail = getDutyDetail(data, duty);
    expect(detail.whyImportant).toBe("");
    expect(detail.firstStep).toBe("");
  });
});
