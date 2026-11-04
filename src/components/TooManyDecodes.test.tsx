import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import TooManyDecodes from "@/components/TooManyDecodes";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("TooManyDecodes", () => {
  it("names the limit, shows the message, and goes back, with no a11y violations", async () => {
    const onBack = vi.fn();
    const { container } = renderWithTheme(
      <TooManyDecodes message="You have run too many decodes." onBack={onBack} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: /too many decodes/i })).toBeInTheDocument();
    expect(screen.getByText(/You have run too many decodes\./)).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /back to the form/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
