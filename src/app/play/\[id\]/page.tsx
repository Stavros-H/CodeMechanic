'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { AuthModal, SaveModal } from '@/components';

// ============================================================================
// View 3: Interactive Playtest Arena
// ============================================================================

export default function PlaytestArena() {
  const params = useParams();
  const router = useRouter();
  const { setActiveTab, isSaveModalOpen, setIsSaveModalOpen } = useGameStore();
  const projectId = params?.id as string;

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('play');
  }, [setActiveTab]);

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

  // Handle win/loss state
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'paused'>('playing');

  // Simulate game state for demo
  useEffect(() => {
    // This would be replaced with actual Phaser integration
    // For now, just show the playtest arena UI
  }, []);

  // Handle game over
  const handleGameOver = (status: 'won' | 'lost') => {
    setGameStatus(status);
  };

  // Handle play again
  const handlePlayAgain = () => {
    setGameStatus('playing');
  };

  // Handle edit in studio
  const handleEditInStudio = () => {
    router.push(`/studio/art?edit=${projectId}`);
  };

  // Handle back to hub
  const handleBackToHub = () => {
    router.push('/');
  };

  // Render win/loss overlay
  const renderGameOverOverlay = () => (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h2>{gameStatus === 'won' ? 'You Won!' : 'Game Over'}</h2>
        <p>{gameStatus === 'won' ? 'Congratulations on completing the level!' : 'Better luck next time!'}</p>
        <div className="game-over-actions">
          <button className="btn btn-primary" onClick={handlePlayAgain}>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={handleEditInStudio}>
            Edit in Studio
          </button>
          <button className="btn btn-ghost" onClick={handleBackToHub}>
            Back to Hub
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Modals */}
      <AuthModal />
      <SaveModal
        onSave={handleSaveAndContinue}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancel}
      />

      {/* Playtest Arena Content */}
      <div className="view-container view-play">
        {/* Debug Bar */}
        <div className="debug-bar">
          <div className="debug-info">
            <span className="debug-item">
              <span className="debug-label">FPS:</span>
              <span className="debug-value">60</span>
            </span>
            <span className="debug-item">
              <span className="debug-label">Entities:</span>
              <span className="debug-value">15</span>
            </span>
            <span className="debug-item">
              <span className="debug-label">Status:</span>
              <span className="debug-value">{gameStatus}</span>
            </span>
          </div>
          <div className="debug-controls">
            <button className="debug-btn" onClick={() => setGameStatus('paused')}>
              ⏸️ Pause
            </button>
            <button className="debug-btn" onClick={() => handleGameOver('won')}>
              🏆 Win
            </button>
            <button className="debug-btn" onClick={() => handleGameOver('lost')}>
              ❌ Lose
            </button>
          </div>
        </div>

        {/* Game Canvas Placeholder */}
        <div className="game-canvas-container">
          <div className="game-canvas-placeholder">
            <span className="placeholder-icon">🎮</span>
            <span>Phaser 3 Canvas</span>
            <span className="placeholder-hint">Project ID: {projectId}</span>
          </div>
        </div>

        {/* Game Over Overlay */}
        {gameStatus !== 'playing' && renderGameOverOverlay()}

        {/* Controls Help */}
        <div className="controls-help">
          <div className="controls-group">
            <span className="controls-title">Player 1:</span>
            <span>WASD / Arrows - Move</span>
            <span>Space / F - Jump</span>
            <span>Shift / G - Action</span>
          </div>
          <div className="controls-group">
            <span className="controls-title">Player 2:</span>
            <span>IJKL - Move</span>
            <span>U - Jump</span>
            <span>O - Action</span>
          </div>
        </div>
      </div>
    </>
  );
}

