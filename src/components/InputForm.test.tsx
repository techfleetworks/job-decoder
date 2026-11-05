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
    const { container } = renderWithTheme(<InputForm onSubmit={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Hat Check" })).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job posting/i)).toBeInTheDocument();
    expect(screen.getByText(/CC BY/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("submits the trimmed title and the posting", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<InputForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/job title/i), "  UX Designer  ");
    await userEvent.type(screen.getByLabelText(/job posting/i), "We do wireframing.");
    await userEvent.click(screen.getByRole("button", { name: /decode this posting/i }));
    expect(onSubmit).toHaveBeenCalledWith("UX Designer", "We do wireframing.");
  });

  it("does not submit when the fields are empty", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<InputForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /decode this posting/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not steal focus on first load", () => {
    renderWithTheme(<InputForm onSubmit={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Hat Check" })).not.toHaveFocus();
  });

  it("moves focus to the heading when returning to a fresh form (WCAG 2.4.3)", () => {
    renderWithTheme(<InputForm onSubmit={() => {}} autoFocusHeading />);
    expect(screen.getByRole("heading", { level: 1, name: "Hat Check" })).toHaveFocus();
  });

  it("counts the posting characters against the limit as you type (B1)", async () => {
    renderWithTheme(<InputForm onSubmit={() => {}} />);
    expect(screen.getByText("0 / 20,000 characters")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/job posting/i), "abcde");
    expect(screen.getByText("5 / 20,000 characters")).toBeInTheDocument();
  });

  it("seeds the fields from the initial title and posting (restore after cancel, T18)", () => {
    renderWithTheme(
      <InputForm onSubmit={() => {}} initialTitle="UX Designer" initialPosting="We need wireframes." />,
    );
    expect((screen.getByLabelText(/job title/i) as HTMLInputElement).value).toBe("UX Designer");
    expect((screen.getByLabelText(/job posting/i) as HTMLInputElement).value).toBe("We need wireframes.");
  });

  it("shows a top error summary when submitting an empty form (B2)", async () => {
    renderWithTheme(<InputForm onSubmit={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /decode this posting/i }));
    const summary = screen.getByRole("alert");
    expect(summary).toHaveTextContent(/fix these before decoding/i);
    expect(summary).toHaveTextContent("Enter the job title.");
    expect(summary).toHaveTextContent("Paste the job posting.");
  });
});
