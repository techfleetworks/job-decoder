import { describe, expect, it } from "vitest";
import { normalize, phraseInText, tokenCount } from "./text";

describe("normalize", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalize("  Wire-framing!!  ")).toBe("wire framing");
    expect(normalize("UI/UX")).toBe("ui ux");
  });
});

describe("tokenCount", () => {
  it("counts whitespace-separated tokens, 0 for empty", () => {
    expect(tokenCount("information architecture")).toBe(2);
    expect(tokenCount("coding")).toBe(1);
    expect(tokenCount("")).toBe(0);
  });
});

describe("phraseInText", () => {
  const text = normalize("We do wireframing and information architecture daily");

  it("matches a phrase on token boundaries", () => {
    expect(phraseInText("wireframing", text)).toBe(true);
    expect(phraseInText("information architecture", text)).toBe(true);
  });

  it("does not match across non-adjacent tokens or inside a word", () => {
    expect(phraseInText("wireframing architecture", text)).toBe(false);
    expect(phraseInText("wire", text)).toBe(false); // not a sub-word match
  });

  it("never matches an empty phrase", () => {
    expect(phraseInText("", text)).toBe(false);
  });
});
