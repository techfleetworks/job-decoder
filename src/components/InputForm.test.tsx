import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import InputForm from "@/components/InputForm";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("InputForm", () => {
  it("renders the heading and labelled fields with no accessibility violations", async () => {
    const { container } = renderWithTheme(<InputForm onSubmit={() => {}} working={false} />);
    expect(screen.getByRole("heading", { level: 1, name: "Hat Check" })).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job posting/i)).toBeInTheDocument();
    expect(screen.getByText(/CC BY/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("submits the trimmed title and the posting", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<InputForm onSubmit={onSubmit} working={false} />);
    await userEvent.type(screen.getByLabelText(/job title/i), "  UX Designer  ");
    await userEvent.type(screen.getByLabelText(/job posting/i), "We do wireframing.");
    await userEvent.click(screen.getByRole("button", { name: /decode this posting/i }));
    expect(onSubmit).toHaveBeenCalledWith("UX Designer", "We do wireframing.");
  });

  it("does not submit when the fields are empty", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<InputForm onSubmit={onSubmit} working={false} />);
    await userEvent.click(screen.getByRole("button", { name: /decode this posting/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not steal focus on first load", () => {
    renderWithTheme(<InputForm onSubmit={() => {}} working={false} />);
    expect(screen.getByRole("heading", { level: 1, name: "Hat Check" })).not.toHaveFocus();
  });

  it("moves focus to the heading when returning to a fresh form (WCAG 2.4.3)", () => {
    renderWithTheme(<InputForm onSubmit={() => {}} working={false} autoFocusHeading />);
    expect(screen.getByRole("heading", { level: 1, name: "Hat Check" })).toHaveFocus();
  });
});
