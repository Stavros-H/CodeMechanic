'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { AuthModal, SaveModal } from '@/components';

// ============================================================================
// My Projects Page
// ============================================================================

export default function MyProjects() {
  const router = useRouter();
  const { setActiveTab, isSaveModalOpen, setIsSaveModalOpen } = useGameStore();

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('hub');
  }, [setActiveTab]);

  // Sample user projects
  const projects = [
    {
      id: 'proj-1',
      title: 'My First Platformer',
      genre: 'Platformer',
      updatedAt: '2 days ago',
      isPublished: false,
    },
    {
      id: 'proj-2',
      title: 'Space Shooter',
      genre: 'Shooter',
      updatedAt: '1 week ago',
      isPublished: true,
    },
    {
      id: 'proj-3',
      title: 'Dungeon Crawler',
      genre: 'DungeonCrawler',
      updatedAt: '2 weeks ago',
      isPublished: false,
    },
  ];

  // Handle save and continue
  const handleSaveAndContinue = () => {
    setIsSaveModalOpen(false);
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setIsSaveModalOpen(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setIsSaveModalOpen(false);
  };

  return (
    <>
      {/* Modals */}
      <AuthModal />
      <SaveModal
        onSave={handleSaveAndContinue}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancel}
      />

      {/* My Projects Content */}
      <div className="view-container view-projects">
        <section className="projects-header">
          <div className="header-content">
            <h1>My Projects</h1>
            <p>Manage your game creations</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => router.push('/studio/art')}
          >
            <span className="btn-icon">+</span>
            <span>Create New Project</span>
          </button>
        </section>

        {projects.length > 0 ? (
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
                    <span className="meta-date">Updated {project.updatedAt}</span>
                  </div>
                </div>
                <div className="project-actions">
                  <button
                    className="action-btn"
                    onClick={() => router.push(`/play/${project.id}`)}
                  >
                    Play
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => router.push(`/studio/art?edit=${project.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => router.push(`/studio/rules?edit=${project.id}`)}
                  >
                    Configure
                  </button>
                  {project.isPublished ? (
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
              onClick={() => router.push('/studio/art')}
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
