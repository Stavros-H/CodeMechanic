import type { Metadata } from "next";
import "./globals.css";
import "./views.css";
import AppShell from './AppShell';

// ============================================================================
// Metadata
// ============================================================================

export const metadata: Metadata = {
  title: "CodeMechanic - Zero-Setup 2D Game Creation Sandbox",
  description:
    "Design custom pixel-art sprites, define hitbox masks, configure physics and economy parameters, and instantly playtest and share your creations.",
};

// ============================================================================
// Root Layout Component
// ============================================================================

// Import component CSS files
import '@/components/Navbar/Navbar.css';
import '@/components/Auth/AuthModal.css';
import '@/components/Modals/Modals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
