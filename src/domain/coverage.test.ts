import { describe, expect, it } from "vitest";
import { buildFrameworkData } from "./framework/builder";
import {
  getSupportedTitles,
  isEntityCovered,
  normalizeTitle,
  resolveTitle,
} from "./coverage";
import { ENTITY } from "./framework/types";
import { fixtureDatasets, fixtureManifest } from "../test/fixtures/framework";

const data = buildFrameworkData(fixtureManifest, fixtureDatasets);

describe("normalizeTitle", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeTitle("  UI/UX  Designer! ")).toBe("ui ux designer");
    expect(normalizeTitle("Software-Engineer")).toBe("software engineer");
  });
});

describe("getSupportedTitles", () => {
  it("lists every job function with its aliases", () => {
    const titles = getSupportedTitles(data);
    expect(titles.map((t) => t.name)).toEqual(["UX Designer", "Software Engineer"]);
    const ux = titles.find((t) => t.slug === "ux-designer")!;
    expect(ux.aliases).toContain("UI/UX Designer");
  });
});

describe("resolveTitle", () => {
  it("matches a supported title by its standard name", () => {
    const result = resolveTitle(data, "ux designer");
    expect(result.status).toBe("covered");
    if (result.status === "covered") {
      expect(result.jobFunction.slug).toBe("ux-designer");
      expect(result.matchedOn).toBe("name");
    }
  });

  it("matches a real-world alias (normalized)", () => {
    const result = resolveTitle(data, "UI/UX Designer");
    expect(result.status).toBe("covered");
    if (result.status === "covered") {
      expect(result.jobFunction.slug).toBe("ux-designer");
      expect(result.matchedOn).toBe("alias");
    }
  });

  it("reports not-covered for an unsupported title, never a guess", () => {
    const result = resolveTitle(data, "Data Scientist");
    expect(result.status).toBe("not-covered");
    if (result.status === "not-covered") {
      expect(result.input).toBe("Data Scientist");
    }
  });

  it("offers suggestions when the input shares words with a supported title", () => {
    const result = resolveTitle(data, "Senior Software Engineer II");
    expect(result.status).toBe("not-covered");
    if (result.status === "not-covered") {
      expect(result.suggestions.map((s) => s.slug)).toContain("software-engineer");
    }
  });

  it("treats empty input as not-covered with no suggestions", () => {
    const result = resolveTitle(data, "   ");
    expect(result.status).toBe("not-covered");
    if (result.status === "not-covered") {
      expect(result.suggestions).toEqual([]);
    }
  });
});

describe("isEntityCovered", () => {
  it("is true for a present slug and false otherwise", () => {
    expect(isEntityCovered(data, ENTITY.duties, "software-development")).toBe(true);
    expect(isEntityCovered(data, ENTITY.duties, "ghost")).toBe(false);
    expect(isEntityCovered(data, "missing-entity", "x")).toBe(false);
  });
});
