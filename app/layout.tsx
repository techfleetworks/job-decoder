import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import ThemeRegistry from "./ThemeRegistry";

export const metadata: Metadata = {
  title: "Hat Check",
  description:
    "Paste one job posting and see the responsibilities behind the title, grounded in the Tech Fleet Skills and Practices Framework.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
