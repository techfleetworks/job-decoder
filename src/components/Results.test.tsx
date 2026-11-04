import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import Results from "@/components/Results";
import type { DecodeResult } from "@/domain/decode/types";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const covered: DecodeResult = {
  functionSlug: "ux-designer",
  functionName: "UX Designer",
  covered: [{ slug: "ux-design", name: "UX Design", description: "Shapes the experience.", score: 1, scoreWhole: 100, level: "full" }],
  missing: [{ slug: "ux-research", name: "UX Research", description: "", score: 0, scoreWhole: 0, level: "none" }],
  nonStandard: [{ slug: "product-mgmt", name: "Product Management", score: 1, scoreWhole: 100, level: "full" }],
  matched: [
    { slug: "wireframing", type: "activity", label: "Wireframing", tier: "exact", term: "wireframing", via: ["keyword"], duties: ["ux-design"] },
  ],
  pct: 0.5,
  pctWhole: 50,
  verdict: "partial",
  standardCount: 2,
  coverage: [],
  linesAudited: 3,
  linesMatched: 1,
  unplaced: [1, 2],
};

const notCovered: DecodeResult = {
  functionSlug: null,
  functionName: null,
  covered: [],
  missing: [],
  nonStandard: [],
  matched: [],
  pct: 0,
  pctWhole: 0,
  verdict: "not-covered",
  standardCount: 0,
  coverage: [],
  linesAudited: 2,
  linesMatched: 0,
  unplaced: [0, 1],
};

describe("Results", () => {
  it("shows the verdict, the first step, the basic-read note, and no accessibility violations", async () => {
    const { container } = renderWithTheme(<Results result={covered} onStartOver={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/partly fits the title/i);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/title fit/i);
    // Step 1 shows the match-level counts (T17 / ADR-0039), labeled in words not color.
    expect(screen.getByText("Hats covered")).toBeInTheDocument();
    expect(screen.getByText("Hidden hats")).toBeInTheDocument();
    expect(screen.getByText("Extra hats")).toBeInTheDocument();
    expect(screen.getByText(/basic read/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("reports a not-covered title honestly and never guesses", () => {
    renderWithTheme(<Results result={notCovered} onStartOver={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/do not cover this title/i);
    expect(screen.getByText(/will not guess/i)).toBeInTheDocument();
  });
});
