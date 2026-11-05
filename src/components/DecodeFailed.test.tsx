import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import DecodeFailed from "@/components/DecodeFailed";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("DecodeFailed", () => {
  it("shows the failure, offers Try again, and has no a11y violations", async () => {
    const onRetry = vi.fn();
    const { container } = renderWithTheme(
      <DecodeFailed message="Something went wrong while decoding the posting." onRetry={onRetry} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: /decode failed/i })).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong while decoding/)).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
