import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import Reading from "@/components/Reading";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Reading", () => {
  it("shows the reading heading, a polite progress status, and Cancel, with focus on the heading and no a11y violations", async () => {
    const { container } = renderWithTheme(<Reading onCancel={() => {}} />);
    const heading = screen.getByRole("heading", { level: 1, name: /reading the posting/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveFocus();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/reading the posting against the framework/i);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("switches to the still-working message after the slow threshold", () => {
    vi.useFakeTimers();
    try {
      renderWithTheme(<Reading onCancel={() => {}} />);
      expect(screen.getByRole("status")).toHaveTextContent(/reading the posting against the framework/i);
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(screen.getByRole("status")).toHaveTextContent(/still working/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<Reading onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
