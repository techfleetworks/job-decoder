import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import PrepView from "@/components/PrepView";
import type { PrepGuide } from "@/domain/decode";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const guide: PrepGuide = {
  technicalSkills: [{ slug: "figma-skill", label: "Figma Skill", type: "Technical", hats: [{ slug: "ux-design", name: "UX Design", set: "matched" }], sourceField: "Foundational Skills", key: true }],
  interpersonalSkills: [{ slug: "collaboration", label: "Collaboration", type: "Interpersonal", hats: [{ slug: "ux-design", name: "UX Design", set: "matched" }], sourceField: "a posting-named activity", key: true }],
  activities: [{ slug: "wireframing", label: "Wireframing", entity: "activity", hatSlug: "ux-design", hatSet: "matched", matched: true, quote: "do wireframing" }],
  deliverables: [{ slug: "wireframes", label: "Wireframes", entity: "deliverable", hatSlug: "ux-design", hatSet: "matched", matched: false }],
  outcomeTemplates: [{ activitySlug: "wireframing", activityLabel: "Wireframing", hatSlug: "ux-design", hatSet: "matched", deliverableLabel: "Wireframes", template: "Wireframing ____, which resulted in Wireframes ____, so that ____.", hint: "shows the layout" }],
  atsKeywords: [{ group: "Hats", keywords: ["UX Design"] }, { group: "Skills", keywords: ["Figma Skill"] }],
  coverLetterPoints: [{ hatSlug: "ux-design", hatName: "UX Design", hatSet: "matched", text: "Design shapes the work.", deliverables: ["Wireframes"] }],
  interviewPoints: [{ hatSlug: "ux-design", hatName: "UX Design", hatSet: "matched", text: "Be ready to show Wireframes." }],
};

describe("PrepView", () => {
  it("renders the heading and first step with no accessibility violations", async () => {
    const { container } = renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: /prepare your application/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/skills for your resume/i);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("steps through to the ATS keywords", async () => {
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    const next = screen.getByRole("button", { name: /next/i });
    await userEvent.click(next); // activities
    await userEvent.click(next); // ATS keywords
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/ats keywords/i);
    expect(screen.getByRole("button", { name: /copy all keywords/i })).toBeInTheDocument();
  });

  it("shows the basic-read note when the decode was keyword-only", () => {
    renderWithTheme(<PrepView prepGuide={guide} basicRead onBack={() => {}} />);
    expect(screen.getByText(/basic read/i)).toBeInTheDocument();
  });

  it("goes back to the results", async () => {
    const onBack = vi.fn();
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /back to the results/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
