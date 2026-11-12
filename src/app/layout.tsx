import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
import '@/components/Modals/Modals.css';

const clerkAppearance = {
  layout: {
    logoImageUrl: "/logo.svg",
    logoLinkUrl: "/",
    logoPlacement: "inside" as const,
  },
  variables: {
    colorPrimary: "#bd91ff",
    colorBackground: "#171321",
    colorForeground: "#f3effa",
    colorMutedForeground: "#aaa2bb",
    colorInput: "#100d18",
    colorInputForeground: "#f3effa",
    colorDanger: "#ff7b87",
    colorNeutral: "#c9c0d8",
    fontFamily: '"DM Sans", sans-serif',
    borderRadius: "0.75rem",
  },
  elements: {
    card: {
      backgroundColor: "#171321",
      border: "1px solid rgba(190, 165, 250, 0.2)",
      boxShadow: "0 24px 80px rgba(0, 0, 0, 0.4)",
    },
    headerTitle: { color: "#f3effa" },
    headerSubtitle: { color: "#aaa2bb" },
    formFieldLabel: { color: "#e8e1f5" },
    formFieldInput: {
      backgroundColor: "#100d18",
      border: "1px solid rgba(190, 165, 250, 0.24)",
      color: "#f3effa",
    },
    formButtonPrimary: {
      backgroundColor: "#bd91ff",
      color: "#100d18",
    },
    footerActionLink: { color: "#bd91ff" },
    footerActionText: { color: "#aaa2bb" },
    dividerText: { color: "#aaa2bb" },
    socialButtonsBlockButton: {
      backgroundColor: "#211a30",
      border: "1px solid rgba(190, 165, 250, 0.24)",
      color: "#f3effa",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/projects"
      signUpFallbackRedirectUrl="/projects"
    >
      <html lang="en">
        <body>
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
