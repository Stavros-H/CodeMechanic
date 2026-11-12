'use client';

import { useState, type ReactNode, type MouseEvent } from 'react';
import { Navbar, SaveModal } from '@/components';
import { ClerkProfileSync } from '@/components/Auth/ClerkProfileSync';
import { useGameStore } from '@/store/useGameStore';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

export default function AppShell({ children }: { children: ReactNode }) {
  const { continueNavigation, handleNavigationClick } = useUnsavedChangesGuard();
  const {
    isSaveModalOpen,
    setIsSaveModalOpen,
    clearProject,
  } = useGameStore();
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveAndContinue = async () => {
    setSaveError(null);
    const state = useGameStore.getState();

    if (state.currentProject && state.isAuthenticated) {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.currentProject),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setSaveError(result?.error ?? 'The project could not be saved.');
          return;
        }
        useGameStore.getState().setCurrentProject(result.project);
      } catch {
        setSaveError('The project could not be saved. Check your connection and try again.');
        return;
      }
    } else {
      useGameStore.getState().markClean();
    }

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
      <ClerkProfileSync />
      {isSaveModalOpen && (
        <SaveModal
          onSave={handleSaveAndContinue}
          onDiscard={handleDiscardChanges}
          onCancel={() => setIsSaveModalOpen(false)}
          error={saveError}
        />
      )}
    </div>
  );
}
