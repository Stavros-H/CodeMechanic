import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeMechanic — Phase 1",
  description:
    "A preview of CodeMechanic's database, validation, and storage foundations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
