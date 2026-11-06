import type { ReactElement } from "react";
import { forwardRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// The decode client is mocked so the test controls when (and whether) the request resolves.
const { decodeMock } = vi.hoisted(() => ({ decodeMock: vi.fn() }));
vi.mock("@/data/decodeClient", () => ({ decodePosting: decodeMock }));

import DecodeFlow from "@/components/DecodeFlow";

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

/** A promise whose resolver is exposed, to hold a decode "in flight" during a test. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

async function submitAPosting(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/job title/i), "UX Designer");
  await user.type(screen.getByLabelText(/job posting/i), "We need wireframes.");
  await user.click(screen.getByRole("button", { name: /decode this posting/i }));
}

afterEach(() => {
  decodeMock.mockReset();
  sessionStorage.clear();
});

describe("DecodeFlow", () => {
  it("renders the input screen with no accessibility violations", async () => {
    const { container } = renderWithTheme(<DecodeFlow />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /hat check/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /license and attribution/i })).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("shows the Reading screen while a decode is in flight", async () => {
    decodeMock.mockReturnValue(deferred().promise); // never resolves: stays "reading"
    const user = userEvent.setup();
    renderWithTheme(<DecodeFlow />);
    await submitAPosting(user);
    expect(screen.getByRole("heading", { level: 1, name: /reading the posting/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/job posting/i)).not.toBeInTheDocument();
  });

  it("returns to the form with the title and posting preserved when the decode is cancelled", async () => {
    decodeMock.mockReturnValue(deferred().promise);
    const user = userEvent.setup();
    renderWithTheme(<DecodeFlow />);
    await submitAPosting(user);
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByRole("heading", { level: 1, name: /hat check/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/job title/i) as HTMLInputElement).value).toBe("UX Designer");
    expect((screen.getByLabelText(/job posting/i) as HTMLInputElement).value).toBe("We need wireframes.");
  });

  it("never lands a cancelled decode on the screen even if the request resolves after cancel", async () => {
    const d = deferred<{ ok: true; result: unknown }>();
    decodeMock.mockReturnValue(d.promise);
    const user = userEvent.setup();
    renderWithTheme(<DecodeFlow />);
    await submitAPosting(user);
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // The in-flight request resolves late with a would-be result; the cancel must win.
    d.resolve({ ok: true, result: { verdict: "strong", pctWhole: 80, prepGuide: null } });
    await waitFor(() => expect(screen.getByLabelText(/job title/i)).toBeInTheDocument());
    expect(screen.queryByText(/fits the title well/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /reading the posting/i })).not.toBeInTheDocument();
  });
});
