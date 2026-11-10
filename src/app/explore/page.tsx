'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { AuthModal, SaveModal } from '@/components';
import { GameGenre } from '@/types';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';

// ============================================================================
// View 2: Genre & Template Directory
// ============================================================================

export default function ExploreDirectory() {
  const { navigateTo } = useGuardedNavigation();
  const { setActiveTab, isSaveModalOpen, setIsSaveModalOpen } = useGameStore();

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('explore');
  }, [setActiveTab]);

  // Sample projects data
  const projects = [
    {
      id: '1',
      title: 'Cyberpunk Platformer',
      genre: 'Platformer' as GameGenre,
      author: 'CodeMechanic Team',
      plays: 1500,
      likes: 800,
      thumbnail: '/placeholder.svg',
      isTemplate: true,
    },
    {
      id: '2',
      title: 'Neon Vector Shooter',
      genre: 'Shooter' as GameGenre,
      author: 'CodeMechanic Team',
      plays: 1200,
      likes: 650,
      thumbnail: '/placeholder.svg',
      isTemplate: true,
    },
    {
      id: '3',
      title: 'Roguelike Dungeon',
      genre: 'DungeonCrawler' as GameGenre,
      author: 'CodeMechanic Team',
      plays: 900,
      likes: 450,
      thumbnail: '/placeholder.svg',
      isTemplate: true,
    },
    {
      id: '4',
      title: 'Community Platformer',
      genre: 'Platformer' as GameGenre,
      author: 'User123',
      plays: 500,
      likes: 200,
      thumbnail: '/placeholder.svg',
      isTemplate: false,
    },
    {
      id: '5',
      title: 'Space Adventure',
      genre: 'Shooter' as GameGenre,
      author: 'CreativeDev',
      plays: 300,
      likes: 150,
      thumbnail: '/placeholder.svg',
      isTemplate: false,
    },
    {
      id: '6',
      title: 'Tower Defense',
      genre: 'TowerDefense' as GameGenre,
      author: 'StrategyMaster',
      plays: 200,
      likes: 100,
      thumbnail: '/placeholder.svg',
      isTemplate: false,
    },
  ];

  // Genre filters
  const genres: GameGenre[] = [
    'Platformer',
    'Shooter',
    'DungeonCrawler',
    'Brawler',
    'TowerDefense',
    'Idle',
    'Stealth',
    'BossRush',
  ];

  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<GameGenre | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'plays' | 'likes' | 'date'>('plays');

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    if (selectedGenre && project.genre !== selectedGenre) return false;
    if (searchQuery && !project.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'plays') return b.plays - a.plays;
    if (sortBy === 'likes') return b.likes - a.likes;
    return 0; // Date sorting would use created_at in real implementation
  });

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

      {/* Explore Directory Content */}
      <div className="view-container view-explore">
        <section className="explore-header">
          <div className="explore-title">
            <h1>Explore Directory</h1>
            <p>Discover games and templates created by the community</p>
          </div>
          <div className="explore-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigateTo('/studio/art')}
            >
              <span className="btn-icon">+</span>
              <span>Create New Project</span>
            </button>
          </div>
        </section>

        <section className="explore-filters">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="genre-filters">
            {genres.map((genre) => (
              <button
                key={genre}
                className={`filter-chip ${selectedGenre === genre ? 'active' : ''}`}
                onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
              >
                {genre}
              </button>
            ))}
          </div>
          <div className="sort-controls">
            <span>Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'plays' | 'likes' | 'date')}>
              <option value="plays">Most Played</option>
              <option value="likes">Top Liked</option>
              <option value="date">Newest</option>
            </select>
          </div>
        </section>

        <section className="projects-grid">
          {sortedProjects.length > 0 ? (
            sortedProjects.map((project) => (
              <div key={project.id} className="project-card">
                <div className="project-thumbnail">
                  <img src={project.thumbnail} alt={project.title} />
                  {project.isTemplate && (
                    <span className="template-badge">Template</span>
                  )}
                </div>
                <div className="project-info">
                  <h3>{project.title}</h3>
                  <div className="project-meta">
                    <span className="project-author">By {project.author}</span>
                    <span className="project-genre">{project.genre}</span>
                  </div>
                  <div className="project-stats">
                    <span className="stat">
                      <span className="stat-icon">❤️</span>
                      <span>{project.likes}</span>
                    </span>
                    <span className="stat">
                      <span className="stat-icon">👁️</span>
                      <span>{project.plays}</span>
                    </span>
                  </div>
                </div>
                <div className="project-actions">
                  <button
                    className="btn btn-small"
                    onClick={() => navigateTo(`/play/${project.id}`)}
                  >
                    Play
                  </button>
                  <button
                    className="btn btn-small btn-outline"
                    onClick={() => navigateTo(`/studio/art?remix=${project.id}`)}
                  >
                    Remix
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <h3>No projects found</h3>
              <p>Try adjusting your filters or search query</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
