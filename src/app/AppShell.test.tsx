import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { App } from "../App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("exposes the primary landmarks", () => {
    renderAt("/");
    expect(screen.getByRole("banner")).toBeInTheDocument(); // <header>
    expect(
      screen.getByRole("navigation", { name: /primary/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // <footer>
  });

  it("offers a skip-to-content link that targets the main region", () => {
    renderAt("/");
    const skip = screen.getByRole("link", { name: /skip to main content/i });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("shows the privacy promise on every page", () => {
    renderAt("/");
    expect(
      screen.getByText(/your data stays on your device/i),
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations on the home page", async () => {
    const { container } = renderAt("/");
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
