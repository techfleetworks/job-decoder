import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import MatchGauge from "@/components/MatchGauge";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("MatchGauge", () => {
  it("states the percent in text and in an accessible label, and has no a11y violations", async () => {
    const { container } = renderWithTheme(<MatchGauge pct={50} caption="2 of 4 standard hats covered" />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /title fit 50 percent/i })).toBeInTheDocument();
    expect(screen.getByText("2 of 4 standard hats covered")).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("clamps out-of-range values", () => {
    renderWithTheme(<MatchGauge pct={140} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
