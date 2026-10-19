import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { FRAMEWORK_ATTRIBUTION } from "../content/licensing";

function renderAbout() {
  return render(
    <MemoryRouter initialEntries={["/about"]}>
      <App />
    </MemoryRouter>,
  );
}

describe("AboutPage licensing", () => {
  it("shows the exact required CC BY 4.0 credit line", () => {
    renderAbout();
    // The credit line appears both here and in the footer; getAllByText covers both.
    const credits = screen.getAllByText(FRAMEWORK_ATTRIBUTION.creditLine);
    expect(credits.length).toBeGreaterThan(0);
  });

  it("names the app's MIT license", () => {
    renderAbout();
    expect(screen.getByText(/mit license/i)).toBeInTheDocument();
  });

  it("links to the framework source", () => {
    renderAbout();
    const links = screen.getAllByRole("link", {
      name: /skills & practices framework/i,
    });
    expect(links[0]).toHaveAttribute("href", FRAMEWORK_ATTRIBUTION.sourceUrl);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderAbout();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
