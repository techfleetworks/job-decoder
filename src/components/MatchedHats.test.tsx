import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import MatchedHats from "@/components/MatchedHats";
import type { Match, ScoredHat } from "@/domain/decode/types";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const covered: ScoredHat[] = [
  {
    slug: "ux-design",
    name: "UX Design",
    description: "Shapes the experience.",
    score: 0.5,
    scoreWhole: 50,
    level: "full",
    detail: { activities: ["Wireframing"], deliverables: ["Design System"], tools: ["Figma"] },
  },
  { slug: "ux-research", name: "UX Research", description: "Talks to users.", score: 0.12, scoreWhole: 12, level: "partial" },
];
const matched: Match[] = [
  { slug: "wireframing", type: "activity", label: "Wireframing", tier: "exact", term: "wireframes", via: ["keyword"], duties: ["ux-design"] },
  { slug: "usability-testing", type: "activity", label: "Usability testing", tier: "similar", term: "user testing", via: ["keyword"], duties: ["ux-research"] },
];

describe("MatchedHats", () => {
  it("renders each hat as a card with a share pill and a reference line, no a11y violations", async () => {
    const { container } = renderWithTheme(<MatchedHats covered={covered} matched={matched} />);
    expect(screen.getByRole("heading", { name: "UX Design" })).toBeInTheDocument();
    expect(screen.getByText("Full · 50%")).toBeInTheDocument();
    expect(screen.getByText("Partial · 12%")).toBeInTheDocument();
    // The rephrased reference line attributes the share to the hat itself (T17).
    expect(
      screen.getByText(/The posting references 50% of UX Design's work responsibilities/),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /filter hats by match type/i })).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("filters the visible hat cards by match type, with hat counts on the chips", async () => {
    const user = userEvent.setup();
    renderWithTheme(<MatchedHats covered={covered} matched={matched} />);
    expect(screen.getByRole("button", { name: /^all 2$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "UX Design" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "UX Research" })).toBeInTheDocument();
    // No covered hat has an alias match, so that chip is disabled.
    expect(screen.getByRole("button", { name: /a known phrasing 0/i })).toBeDisabled();
    // Exact-wording shows only the hat with an exact match; the similar-only hat disappears.
    await user.click(screen.getByRole("button", { name: /exact wording 1/i }));
    expect(screen.getByRole("heading", { name: "UX Design" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "UX Research" })).not.toBeInTheDocument();
  });
});
