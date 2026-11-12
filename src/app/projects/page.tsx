'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useGameStore } from '@/store/useGameStore';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';
import type { Project } from '@/schemas/projectSchemas';

// ============================================================================
// My Projects Page
// ============================================================================

export default function MyProjects() {
  const { navigateTo } = useGuardedNavigation();
  const { setActiveTab } = useGameStore();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('hub');
  }, [setActiveTab]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    let isCurrent = true;

    fetch('/api/projects')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Could not load projects.');
        return result.projects as Project[];
      })
      .then((items) => {
        if (isCurrent) {
          setProjects(items);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoadError(error instanceof Error ? error.message : 'Could not load projects.');
        }
      })
      .finally(() => {
        if (isCurrent) setLoadedRequest(`${userId}:${loadAttempt}`);
      });

    return () => {
      isCurrent = false;
    };
  }, [isLoaded, isSignedIn, userId, loadAttempt]);

  const isLoadingProjects =
    !isLoaded ||
    (Boolean(isSignedIn) && loadedRequest !== `${userId}:${loadAttempt}`);

  return (
    <>
      {/* My Projects Content */}
      <div className="view-container view-projects">
        <section className="projects-header">
          <div className="header-content">
            <h1>My Projects</h1>
            <p>Manage your game creations</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigateTo('/studio/art')}
          >
            <span className="btn-icon">+</span>
            <span>Create New Project</span>
          </button>
        </section>

        {isLoadingProjects ? (
          <section className="empty-state" aria-live="polite">
            <p>Loading your projects…</p>
          </section>
        ) : !isSignedIn ? (
          <section className="empty-state">
            <span className="empty-icon">🔐</span>
            <h2>Sign in to view your projects</h2>
            <p>Your saved games will appear here after you sign in.</p>
            <Link className="btn btn-primary" href="/sign-in">Sign In</Link>
          </section>
        ) : loadError ? (
          <section className="empty-state" role="alert">
            <h2>Projects could not load</h2>
            <p>{loadError}</p>
            <button className="btn btn-secondary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
              Try Again
            </button>
          </section>
        ) : projects.length > 0 ? (
          <section className="projects-list">
            {projects.map((project) => (
              <div key={project.id} className="project-item">
                <div className="project-thumbnail">
                  <span className="thumbnail-placeholder">🎮</span>
                </div>
                <div className="project-details">
                  <h3>{project.title}</h3>
                  <div className="project-meta">
                    <span className="meta-genre">{project.genre}</span>
                    <span className="meta-date">
                      Updated {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'just now'}
                    </span>
                  </div>
                </div>
                <div className="project-actions">
                  <button
                    className="action-btn"
                    onClick={() => navigateTo(`/play/${project.id}`)}
                  >
                    Play
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigateTo(`/studio/art?edit=${project.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigateTo(`/studio/rules?edit=${project.id}`)}
                  >
                    Configure
                  </button>
                  {project.is_published ? (
                    <span className="status-badge published">Published</span>
                  ) : (
                    <button className="action-btn publish">Publish</button>
                  )}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <span className="empty-icon">📂</span>
            <h2>No Projects Yet</h2>
            <p>Create your first game project to get started!</p>
            <button
              className="btn btn-primary"
              onClick={() => navigateTo('/studio/art')}
            >
              <span className="btn-icon">+</span>
              <span>Create New Project</span>
            </button>
          </section>
        )}
      </div>
    </>
  );
}
