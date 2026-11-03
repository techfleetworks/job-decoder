import type { ReactElement } from "react";
import { forwardRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";

// next/link needs no router to render an anchor here; mock it to a ref-forwarding anchor so the
// flow renders in isolation (MUI Link passes a ref through its `component`).
vi.mock("next/link", () => ({
  default: forwardRef<HTMLAnchorElement, { children: React.ReactNode; href: string }>(
    function MockLink({ children, href }, ref) {
      return (
        <a ref={ref} href={typeof href === "string" ? href : "#"}>
          {children}
        </a>
      );
    },
  ),
}));

import DecodeFlow from "@/components/DecodeFlow";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("DecodeFlow", () => {
  it("renders the input screen with no accessibility violations", async () => {
    const { container } = renderWithTheme(<DecodeFlow />);
    expect(screen.getByRole("heading", { level: 1, name: /hat check/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /license and attribution/i })).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
