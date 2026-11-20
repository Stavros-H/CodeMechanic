'use client';

// ============================================================================
// View 3: Interactive Playtest Arena
//
// Loads the project for the given id (Zustand store first, then the API),
// converts the declarative ProjectData into the engine's GameConfig, and
// runs it in the Phaser playtest scene with a live debug bar.
// ============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';
import { GameCanvas } from '@/components/GameCanvas';
import { projectDataToGameConfig } from '@/lib/gameConfig';
import type { Project } from '@/schemas/projectSchemas';
import type { PhaserGameManager } from '@/engine';

// ============================================================================
// Playtest Arena
// ============================================================================

type GameStatus = 'loading' | 'playing' | 'won' | 'lost' | 'paused' | 'error';

type PlaytestStats = { fps: number; entities: number };

type SceneWithStats = {
  getStats?: () => PlaytestStats;
};

const STATS_POLL_MS = 500;

export default function PlaytestArena() {
  const params = useParams();
  const projectId = (params?.id as string | undefined) ?? '';
  const { navigateTo } = useGuardedNavigation();
  const { setActiveTab } = useGameStore();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('loading');
  const [stats, setStats] = useState<PlaytestStats>({ fps: 0, entities: 0 });
  const managerRef = useRef<PhaserGameManager | null>(null);
  const gameStatusRef = useRef<GameStatus>('loading');

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    setActiveTab('play');
  }, [setActiveTab]);

  // ------------------------------------------------------------------------
  // Project loading: store first (covers the studio "Playtest" flow and guest
  // drafts), then the API for projects picked from Explore / My Projects.
  // ------------------------------------------------------------------------

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    // Defer state updates to a microtask so they don't run synchronously
    // within the effect (avoids cascading renders).
    const apply = (update: () => void) => {
      Promise.resolve().then(() => {
        if (!cancelled) update();
      });
    };

    apply(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    const storeProject = useGameStore.getState().currentProject;
    if (storeProject && storeProject.id === projectId) {
      apply(() => {
        setProject(storeProject);
        setGameStatus('playing');
        setIsLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    fetch(`/api/projects/${projectId}`)
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(result?.error ?? 'This project could not be loaded.');
          setGameStatus('error');
          setIsLoading(false);
          return;
        }
        setProject(result.project as Project);
        setGameStatus('playing');
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('This project could not be loaded. Check your connection.');
        setGameStatus('error');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // ------------------------------------------------------------------------
  // Engine <-> React wiring
  // ------------------------------------------------------------------------

  const gameConfig = useMemo(
    () => (project ? projectDataToGameConfig(project.project_data) : null),
    [project]
  );

  // Stable identity so GameCanvas's init effect doesn't re-run on re-renders
  const sceneData = useMemo(() => ({ projectId }), [projectId]);

  const pollStats = useCallback(() => {
    const scene = managerRef.current?.getCurrentScene() as
      | (Phaser.Scene & SceneWithStats)
      | null;
    const next = scene?.getStats?.();
    if (next) setStats(next);
  }, []);

  useEffect(() => {
    if (gameStatus !== 'playing' && gameStatus !== 'paused') return;
    const interval = window.setInterval(pollStats, STATS_POLL_MS);
    return () => window.clearInterval(interval);
  }, [gameStatus, pollStats]);

  const handleReady = useCallback(
    (manager: PhaserGameManager) => {
      managerRef.current = manager;
      const game = manager.getGame();
      if (!game) return;
      const onGameOver = (won: boolean) => {
        if (gameStatusRef.current === 'playing') {
          setGameStatus(won ? 'won' : 'lost');
        }
      };
      game.events.on('playtest:game-over', onGameOver);
      game.events.once('destroy', () => {
        game.events.off('playtest:game-over', onGameOver);
      });
      pollStats();
    },
    [pollStats]
  );

  const handleError = useCallback((error: Error) => {
    console.error('Game error:', error);
    setGameStatus('error');
  }, []);

  const handlePause = useCallback(() => {
    const manager = managerRef.current;
    const game = manager?.getGame();
    if (!game) return;
    if (gameStatus === 'paused') {
      game.scene.resume('playtest');
      setGameStatus('playing');
    } else {
      game.scene.pause('playtest');
      setGameStatus('paused');
    }
  }, [gameStatus]);

  const handlePlayAgain = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    // The manager restarts (reuses) the existing scene instance.
    manager.startScene('playtest', { gameConfig: gameConfig ?? undefined });
    setGameStatus('playing');
  }, [gameConfig]);

  const handleGameOver = useCallback((status: 'won' | 'lost') => {
    setGameStatus(status);
  }, []);

  const handleEditInStudio = useCallback(() => {
    navigateTo('/art');
  }, [navigateTo]);

  const handleBackToHub = useCallback(() => {
    navigateTo('/');
  }, [navigateTo]);

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  const renderGameOverOverlay = () => (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h2>{gameStatus === 'won' ? 'You Won!' : 'Game Over'}</h2>
        <p>
          {gameStatus === 'won'
            ? 'Congratulations on completing the level!'
            : 'Better luck next time!'}
        </p>
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

  if (gameStatus === 'error') {
    return (
      <div className="view-container view-play">
        <div className="level-empty-state">
          <div className="empty-state">
            <span className="empty-icon">⚠️</span>
            <h3>Could not load this game</h3>
            <p>{loadError ?? 'Something went wrong loading this project.'}</p>
            <button className="btn btn-primary" onClick={handleBackToHub}>
              Back to Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Playtest Arena Content */}
      <div className="view-container view-play">
        {/* Debug Bar */}
        <div className="debug-bar">
          <div className="debug-info">
            <span className="debug-item">
              <span className="debug-label">FPS:</span>
              <span className="debug-value">{stats.fps || '—'}</span>
            </span>
            <span className="debug-item">
              <span className="debug-label">Entities:</span>
              <span className="debug-value">{stats.entities}</span>
            </span>
            <span className="debug-item">
              <span className="debug-label">Status:</span>
              <span className="debug-value">
                {gameStatus === 'loading' ? 'loading' : gameStatus}
              </span>
            </span>
          </div>
          <div className="debug-controls">
            <button
              className="debug-btn"
              onClick={handlePause}
              disabled={gameStatus !== 'playing' && gameStatus !== 'paused'}
            >
              ⏸️ {gameStatus === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button
              className="debug-btn"
              onClick={() => handleGameOver('won')}
              disabled={gameStatus !== 'playing'}
            >
              🏆 Win
            </button>
            <button
              className="debug-btn"
              onClick={() => handleGameOver('lost')}
              disabled={gameStatus !== 'playing'}
            >
              ❌ Lose
            </button>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="game-canvas-container">
          {isLoading || !gameConfig ? (
            <div className="level-empty-state">
              <div className="empty-state">
                <span className="empty-icon">🎮</span>
                <h3>Loading playtest…</h3>
                <p>Fetching the project and building the game world.</p>
              </div>
            </div>
          ) : (
            <GameCanvas
              config={gameConfig}
              sceneType="playtest"
              sceneData={sceneData}
              onReady={handleReady}
              onError={handleError}
            />
          )}
        </div>

        {/* Game Over Overlay */}
        {(gameStatus === 'won' || gameStatus === 'lost') &&
          renderGameOverOverlay()}
      </div>
    </>
  );
}
