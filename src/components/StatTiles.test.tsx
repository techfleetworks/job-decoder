import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import StatTiles from "@/components/StatTiles";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("StatTiles", () => {
  it("renders each count with its label and has no a11y violations", async () => {
    const counts = [
      { label: "Hats covered", count: 2 },
      { label: "Hidden hats", count: 1 },
      { label: "Extra hats", count: 0 },
    ];
    const { container } = renderWithTheme(<StatTiles counts={counts} />);
    expect(screen.getByRole("list", { name: /hat counts/i })).toBeInTheDocument();
    expect(screen.getByText("Hats covered")).toBeInTheDocument();
    expect(screen.getByText("Hidden hats")).toBeInTheDocument();
    expect(screen.getByText("Extra hats")).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
