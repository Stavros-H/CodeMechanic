'use client';

// ============================================================================
// Studio Chrome — shared header + tab row for the three studio views
// (Pixel & Hitbox Studio, Mechanics & AI Rules, Level & Wave Painter)
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/store/useGameStore';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type StudioTabId = 'art' | 'rules' | 'level';

type StudioChromeProps = {
  active: StudioTabId;
};

type StudioTab = {
  id: StudioTabId;
  href: string;
  label: string;
};

const STUDIO_TABS: StudioTab[] = [
  { id: 'art', href: '/art', label: 'Pixel & Hitbox Studio' },
  { id: 'rules', href: '/rules', label: 'Mechanics & AI Rules' },
  { id: 'level', href: '/level', label: 'Level & Wave Painter' },
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export default function StudioChrome({ active }: StudioChromeProps) {
  const currentProject = useGameStore((state) => state.currentProject);
  const isDirty = useGameStore((state) => state.isDirty);
  const isAuthenticated = useGameStore((state) => state.isAuthenticated);
  const setCurrentProject = useGameStore((state) => state.setCurrentProject);
  const { navigateTo } = useGuardedNavigation();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const project = useGameStore.getState().currentProject;
    if (!project) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        console.error(result?.error ?? 'The project could not be saved.');
        return;
      }
      setCurrentProject(result.project);
    } catch {
      console.error(
        'The project could not be saved. Check your connection and try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="studio-header">
        <div className="studio-header-left">
          <button className="control-btn" onClick={() => navigateTo('/')}>
            ← Back to Hub
          </button>
          <span className="studio-project-name">
            Project: {currentProject?.title ?? 'Untitled Project'}
            {isDirty && (
              <span
                className="unsaved-flag"
                title="This project has unsaved changes"
              >
                *
              </span>
            )}
          </span>
        </div>
        <div className="studio-header-right">
          {isAuthenticated ? (
            <button
              className="btn btn-small btn-primary"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            <Link className="btn btn-small btn-primary" href="/sign-up">
              Sign Up to Save
            </Link>
          )}
          <button
            className="btn btn-small btn-ghost"
            onClick={() =>
              navigateTo(`/play/${currentProject?.id ?? 'draft'}`)
            }
          >
            ▶ Playtest
          </button>
        </div>
      </header>
      <nav className="studio-tabs">
        {STUDIO_TABS.map((tab) =>
          tab.id === active ? (
            <span key={tab.id} className="studio-tab active">
              {tab.label}
            </span>
          ) : (
            <Link key={tab.id} className="studio-tab" href={tab.href}>
              {tab.label}
            </Link>
          )
        )}
      </nav>
    </>
  );
}
