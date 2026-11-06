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

// A guide with one hat of each set (hidden -> matched -> non-standard) so the per-hat steps
// exercise ordering and every status pill.
const guide: PrepGuide = {
  technicalSkills: [
    {
      slug: "interaction-design",
      label: "Interaction Design",
      type: "Technical",
      hats: [{ slug: "ux-design", name: "UX Design", set: "matched", role: "needed" }],
      sourceField: "a posting-named activity",
      key: true,
    },
    {
      slug: "icon-design",
      label: "Icon Design",
      type: "Technical",
      hats: [{ slug: "graphic-design", name: "Graphic Design", set: "hidden", role: "foundational" }],
      sourceField: "Foundational Skills",
      key: true,
    },
  ],
  interpersonalSkills: [],
  activities: [
    { slug: "wireframing", label: "Wireframing", entity: "activity", hatSlug: "ux-design", hatSet: "matched", matched: true, quote: "create wireframes" },
    { slug: "icon-creation", label: "Icon and Logo Creation", entity: "activity", hatSlug: "graphic-design", hatSet: "hidden", matched: false },
    { slug: "front-end-coding", label: "Front-End Coding", entity: "activity", hatSlug: "development", hatSet: "non-standard", matched: true, quote: "write production React" },
  ],
  deliverables: [],
  outcomeTemplates: [
    { activitySlug: "wireframing", activityLabel: "Wireframing", hatSlug: "ux-design", hatSet: "matched", deliverableLabel: "Wireframes", template: "Wireframing ____, which resulted in Wireframes ____, so that ____.", hint: "shows the layout" },
  ],
  atsKeywords: [
    { group: "In the posting", keywords: ["create wireframes"] },
    { group: "Hats", keywords: ["UX Design", "Graphic Design", "Development"] },
    { group: "Tools", keywords: ["Figma"] },
    { group: "Activities", keywords: ["Wireframing"] },
    { group: "Skills", keywords: ["Interaction Design"] },
  ],
  coverLetterPoints: [
    { hatSlug: "graphic-design", hatName: "Graphic Design", hatSet: "hidden", text: "Design carries the brand.", deliverables: ["Logo and Brand Assets"] },
    { hatSlug: "ux-design", hatName: "UX Design", hatSet: "matched", text: "Design shapes the work.", deliverables: ["Wireframes"] },
    { hatSlug: "development", hatName: "Development", hatSet: "non-standard", text: "Ask how much is Development.", deliverables: ["App Code"] },
  ],
  interviewPoints: [
    { hatSlug: "graphic-design", hatName: "Graphic Design", hatSet: "hidden", text: "Be ready to discuss Graphic Design." },
    { hatSlug: "ux-design", hatName: "UX Design", hatSet: "matched", text: "Be ready to show Wireframes." },
    { hatSlug: "development", hatName: "Development", hatSet: "non-standard", text: "Ask how much of the role is Development (they named Front-End Coding)." },
  ],
};

async function toStep(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) await user.click(screen.getByRole("button", { name: /^next$/i }));
}

describe("PrepView", () => {
  it("leads with the ATS keywords chip sections, with no accessibility violations", async () => {
    const { container } = renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: /prepare your application/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/ats keywords/i);
    // The five prototype chip sections, including the "Key skills" rename of the Skills group.
    for (const section of ["In the posting", "Hats", "Tools", "Activities", "Key skills"]) {
      expect(screen.getByRole("heading", { level: 3, name: section })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /copy all keywords/i })).toBeInTheDocument();
    // The prep screen shows framework-derived data, so it must carry the CC BY credit line (T15).
    expect(screen.getByRole("link", { name: /licensed under cc by/i })).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("renders the Skills step as three sections", async () => {
    const user = userEvent.setup();
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    await toStep(user, 1);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^skills$/i);
    expect(screen.getByRole("heading", { level: 3, name: /named in the posting/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /by hat/i })).toBeInTheDocument();
  });

  it("titles the highlights step 'What to highlight' (T21)", async () => {
    const user = userEvent.setup();
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    await toStep(user, 2);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/what to highlight/i);
  });

  it("shows per-hat cards with a status pill, hidden hats first", async () => {
    const user = userEvent.setup();
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    await toStep(user, 2); // What to highlight
    const hatHeadings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    // Graphic Design (hidden) comes before UX Design (matched) and Development (non-standard).
    expect(hatHeadings.indexOf("Graphic Design")).toBeLessThan(hatHeadings.indexOf("UX Design"));
    expect(hatHeadings.indexOf("UX Design")).toBeLessThan(hatHeadings.indexOf("Development"));
    expect(screen.getByText("Expected but missing")).toBeInTheDocument();
    expect(screen.getByText("Matched")).toBeInTheDocument();
    expect(screen.getByText("Not standard")).toBeInTheDocument();
  });

  it("shows a non-standard cover card with the posting quote instead of deliverable chips", async () => {
    const user = userEvent.setup();
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    await toStep(user, 3); // Cover letter points
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/cover letter points/i);
    expect(screen.getByText(/write production react/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy all points/i })).toBeInTheDocument();
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

  it("moves focus to the heading on entry, so the new screen is announced (WCAG 2.4.3)", () => {
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: /prepare your application/i })).toHaveFocus();
  });

  it("announces the result of a copy in a live region (WCAG 4.1.3)", async () => {
    const user = userEvent.setup();
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    await user.click(screen.getByRole("button", { name: /copy all keywords/i }));
    expect(await screen.findByText(/copied to your clipboard/i)).toBeInTheDocument();
  });

  it("keeps no steps beyond the five and disables Next on the last", async () => {
    const user = userEvent.setup();
    renderWithTheme(<PrepView prepGuide={guide} basicRead={false} onBack={() => {}} />);
    await toStep(user, 4); // Interview points (last)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/interview points/i);
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });
});
