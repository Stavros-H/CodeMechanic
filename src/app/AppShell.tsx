'use client';

import type { ReactNode, MouseEvent } from 'react';
import { Navbar, AuthModal, SaveModal } from '@/components';
import { useGameStore } from '@/store/useGameStore';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

export default function AppShell({ children }: { children: ReactNode }) {
  const { continueNavigation, handleNavigationClick } = useUnsavedChangesGuard();
  const {
    isSaveModalOpen,
    setIsSaveModalOpen,
    markClean,
    clearProject,
  } = useGameStore();

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

  return (
    <div onClickCapture={(event: MouseEvent<HTMLDivElement>) => handleNavigationClick(event)}>
      <Navbar />
      <main>{children}</main>
      <AuthModal />
      {isSaveModalOpen && (
        <SaveModal
          onSave={handleSaveAndContinue}
          onDiscard={handleDiscardChanges}
          onCancel={() => setIsSaveModalOpen(false)}
        />
      )}
    </div>
  );
}
