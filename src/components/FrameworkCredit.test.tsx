import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import FrameworkCredit from "./FrameworkCredit";
import { FRAMEWORK_ATTRIBUTION } from "@/content/licensing";

describe("FrameworkCredit", () => {
  it("shows the exact CC BY 4.0 credit line linking to the framework source", () => {
    render(<FrameworkCredit />);
    const link = screen.getByRole("link", {
      name: FRAMEWORK_ATTRIBUTION.creditLine,
    });
    expect(link).toHaveAttribute("href", FRAMEWORK_ATTRIBUTION.sourceUrl);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FrameworkCredit />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
