import { describe, expect, it } from "vitest";
import { HOW_IT_WORKS } from "@/content/howItWorks";

describe("how-it-works steps", () => {
  it("has all 16 steps from ADR-0018, each non-empty", () => {
    expect(HOW_IT_WORKS).toHaveLength(16);
    for (const step of HOW_IT_WORKS) {
      expect(step.trim().length).toBeGreaterThan(0);
    }
  });
});
