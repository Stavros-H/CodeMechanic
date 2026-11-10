'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { AuthModal, SaveModal } from '@/components';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';

// ============================================================================
// View 1: Arcade Hub & Dashboard
// ============================================================================

export default function ArcadeHub() {
  const { navigateTo } = useGuardedNavigation();
  const { setActiveTab, isSaveModalOpen, setIsSaveModalOpen } = useGameStore();

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('hub');
  }, [setActiveTab]);

  // Handle save and continue
  const handleSaveAndContinue = () => {
    setIsSaveModalOpen(false);
    // Save logic would go here
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setIsSaveModalOpen(false);
    // Clear project logic would go here
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

      {/* Arcade Hub Content */}
      <div className="view-container view-hub">
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot" />
              <span>Arcade Hub</span>
            </div>
            <h1>Welcome to CodeMechanic</h1>
            <p className="hero-description">
              Design custom pixel-art sprites, define hitbox masks, configure
              physics and economy parameters, and instantly playtest and share
              your creations.
            </p>
            <div className="hero-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigateTo('/studio/art')}
              >
                <span className="btn-icon">+</span>
                <span>Create New Project</span>
              </button>
              <button
                className="btn btn-secondary btn-large"
                onClick={() => navigateTo('/explore')}
              >
                <span className="btn-icon">🔍</span>
                <span>Explore Templates</span>
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-placeholder">
              <span className="placeholder-icon">🎮</span>
              <span>Game Preview</span>
            </div>
          </div>
        </section>

        <section className="featured-section">
          <div className="section-header">
            <h2>Featured Blueprints</h2>
            <p>Start with one of our 8 seed templates</p>
          </div>
          <div className="blueprint-grid">
            {[
              { name: 'Cyberpunk Platformer', genre: 'Platformer', href: '/play/cyberpunk' },
              { name: 'Neon Vector Shooter', genre: 'Shooter', href: '/play/shooter' },
              { name: 'Roguelike Dungeon', genre: 'DungeonCrawler', href: '/play/roguelike' },
              { name: 'Street Fighter Sandbox', genre: 'Brawler', href: '/play/brawler' },
            ].map((blueprint) => (
              <div key={blueprint.name} className="blueprint-card">
                <div className="blueprint-icon">
                  <span>🎮</span>
                </div>
                <div className="blueprint-info">
                  <h3>{blueprint.name}</h3>
                  <span className="blueprint-genre">{blueprint.genre}</span>
                </div>
                <button
                  className="btn btn-small"
                  onClick={() => navigateTo(blueprint.href)}
                >
                  Play
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="trending-section">
          <div className="section-header">
            <h2>Trending Creations</h2>
            <p>Popular games created by the community</p>
          </div>
          <div className="trending-list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="trending-card">
                <div className="trending-rank">#{i}</div>
                <div className="trending-info">
                  <h3>Community Game {i}</h3>
                  <div className="trending-stats">
                    <span>❤️ 100 Likes</span>
                    <span>👁️ 500 Plays</span>
                  </div>
                </div>
                <button
                  className="btn btn-small btn-outline"
                  onClick={() => navigateTo('/explore')}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="quick-start">
          <div className="section-header">
            <h2>Quick Start</h2>
            <p>Learn the basics in minutes</p>
          </div>
          <div className="quick-start-grid">
            <div className="quick-start-card">
              <div className="quick-start-icon">🎨</div>
              <h3>Design Sprites</h3>
              <p>Create pixel-art characters and objects</p>
            </div>
            <div className="quick-start-card">
              <div className="quick-start-icon">📐</div>
              <h3>Define Hitboxes</h3>
              <p>Set up collision detection</p>
            </div>
            <div className="quick-start-card">
              <div className="quick-start-icon">⚙️</div>
              <h3>Configure Rules</h3>
              <p>Adjust physics and gameplay</p>
            </div>
            <div className="quick-start-card">
              <div className="quick-start-icon">▶️</div>
              <h3>Playtest</h3>
              <p>Test your game instantly</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
