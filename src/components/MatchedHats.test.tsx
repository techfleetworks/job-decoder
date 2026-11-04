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
  it("groups by level with pills and evidence, and has no a11y violations", async () => {
    const { container } = renderWithTheme(<MatchedHats covered={covered} matched={matched} />);
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText(/UX Design — 50% of its work named/)).toBeInTheDocument();
    expect(screen.getByText(/UX Research — 12% of its work named/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /filter evidence by match type/i })).toBeInTheDocument();
    // Each hat has a "Why it matters" panel; only the detailed hat has "What it takes".
    expect(screen.getAllByText("Why it matters")).toHaveLength(2);
    expect(screen.getByText("What it takes")).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("filters evidence by match type", async () => {
    const user = userEvent.setup();
    renderWithTheme(<MatchedHats covered={covered} matched={matched} />);
    // The exact-only filter keeps the UX Design quote and drops the similar UX Research quote.
    await user.click(screen.getByRole("button", { name: /exact wording 1/i }));
    expect(screen.getByText(/No matching quotes for this filter/)).toBeInTheDocument();
  });
});
