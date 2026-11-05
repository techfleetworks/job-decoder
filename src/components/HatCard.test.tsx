import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import HatCard from "@/components/HatCard";
import type { Match } from "@/domain/decode/types";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const evidence: Match[] = [
  { slug: "wireframing", type: "activity", label: "Wireframing", tier: "exact", term: "wireframes", via: ["keyword"], duties: ["ux-design"] },
];

describe("HatCard", () => {
  it("shows the share pill, reference line, match counts, and styled evidence, with no a11y violations", async () => {
    const { container } = renderWithTheme(
      <HatCard
        name="UX Design"
        level="full"
        scoreWhole={50}
        description="Shapes the experience."
        detail={{ activities: ["Wireframing"], deliverables: [], tools: ["Figma"] }}
        evidence={evidence}
      />,
    );
    expect(screen.getByText("Full · 50%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "UX Design" })).toBeInTheDocument();
    expect(
      screen.getByText(/The posting references 50% of UX Design's work responsibilities/),
    ).toBeInTheDocument();
    expect(screen.getByText("1 exact match")).toBeInTheDocument();
    expect(screen.getByText(/Matches the activity Wireframing\. Exact match\./)).toBeInTheDocument();
    expect(screen.getByText(/“wireframes”/)).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
