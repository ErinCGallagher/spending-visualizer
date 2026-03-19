/** Root layout — wraps all pages. */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spending Visualizer",
  description: "Understand your budget",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
