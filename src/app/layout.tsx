import type { Metadata } from "next";
import "./globals.css";
import "./views.css";
import { Navbar, AuthModal, SaveModal } from '@/components';
import { useGameStore } from '@/store/useGameStore';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

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
  const { continueNavigation } = useUnsavedChangesGuard();
  const {
    isSaveModalOpen,
    setIsSaveModalOpen,
    markClean,
    clearProject,
  } = useGameStore();

  // Handle save modal actions
  const handleSaveAndContinue = () => {
    markClean();
    setIsSaveModalOpen(false);
    continueNavigation(true);
  };

  const handleDiscardChanges = () => {
    clearProject();
    setIsSaveModalOpen(false);
    continueNavigation(false);
  };

  const handleCancel = () => {
    setIsSaveModalOpen(false);
  };

  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        
        {/* Modals */}
        <AuthModal />
        {isSaveModalOpen && (
          <SaveModal
            onSave={handleSaveAndContinue}
            onDiscard={handleDiscardChanges}
            onCancel={handleCancel}
          />
        )}
      </body>
    </html>
  );
}
