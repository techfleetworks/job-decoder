import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import HowItWorks from "@/components/HowItWorks";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("HowItWorks", () => {
  it("renders the trigger with no accessibility violations", async () => {
    const { container } = renderWithTheme(<HowItWorks />);
    expect(screen.getByRole("button", { name: /how it works/i })).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("opens an accessible, named dialog with the numbered steps and closes it", async () => {
    renderWithTheme(<HowItWorks />);
    await userEvent.click(screen.getByRole("button", { name: /how it works/i }));
    const dialog = screen.getByRole("dialog", { name: /how hat check reads a posting/i });
    expect(within(dialog).getByRole("list")).toBeInTheDocument();
    // The verdict bands are shown too (E3), sourced from BANDS.
    expect(within(dialog).getByText(/Strong at 60%/)).toBeInTheDocument();
    const results = await axe(dialog);
    expect(results.violations).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
  });
});
