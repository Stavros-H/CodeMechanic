/**
 * Game Canvas Component
 * 
 * React component that manages the Phaser game canvas lifecycle.
 * This component:
 * - Creates the canvas container
 * - Initializes Phaser game instance
 * - Manages scene transitions
 * - Cleans up on unmount
 * - Integrates with Zustand store
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { PhaserGameManager, GameSceneType } from '@/engine';
import type { GameConfig } from '@/types';
import { projectDataToGameConfig } from '@/lib/gameConfig';

// ============================================================================
// Types
// ============================================================================

interface GameCanvasProps {
  /** Game configuration */
  config?: GameConfig;
  /** Scene type to start */
  sceneType?: GameSceneType;
  /** Additional data to pass to the scene */
  sceneData?: Record<string, unknown>;
  /** Called when game is ready */
  onReady?: (gameManager: PhaserGameManager) => void;
  /** Called when game errors */
  onError?: (error: Error) => void;
}

// ============================================================================
// Game Canvas Component
// ============================================================================

export function GameCanvas({
  config,
  sceneType = 'playtest',
  sceneData,
  onReady,
  onError,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<PhaserGameManager | null>(null);
  const latestPropsRef = useRef({ config, sceneData, onReady, onError });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { currentProject, isDirty } = useGameStore();

  useEffect(() => {
    latestPropsRef.current = { config, sceneData, onReady, onError };
  }, [config, sceneData, onReady, onError]);

  // Initialize Phaser on mount
  useEffect(() => {
    let cancelled = false;

    // Phaser touches browser APIs during module initialization, so load it only
    // after this client component has mounted.
    void import('@/engine')
      .then(({ gameManager: manager }) => {
        if (cancelled || !canvasRef.current) return;

        try {
          const latestProps = latestPropsRef.current;
          managerRef.current = manager;
          manager.initialize(canvasRef.current, {}, sceneType);

          if (latestProps.config) {
            manager.startScene(sceneType, {
              gameConfig: latestProps.config,
              ...latestProps.sceneData,
            });
          } else {
            manager.startScene(sceneType, latestProps.sceneData);
          }

          setIsInitialized(true);
          latestProps.onReady?.(manager);
        } catch (err) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          setError(errorObj);
          latestPropsRef.current.onError?.(errorObj);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        latestPropsRef.current.onError?.(errorObj);
      });

    // Cleanup on unmount
    return () => {
      cancelled = true;
      const manager = managerRef.current;
      managerRef.current = null;
      try {
        manager?.destroy();
      } catch (err) {
        console.error('Error destroying game:', err);
      }
    };
  }, [sceneType]);

  // Handle project changes: only restart when the changed project is the one
  // this canvas is playing (covers studio edits while playtesting).
  useEffect(() => {
    if (!isInitialized || !currentProject) return;

    const requestedId =
      typeof sceneData?.projectId === 'string' ? sceneData.projectId : null;
    if (requestedId && currentProject.id !== requestedId) return;

    // Restart scene with new project data
    const manager = managerRef.current;
    if (!manager) return;
    const game = manager.getGame();

    if (game && !isDirty) {
      // Reload scene with the adapted config
      manager.startScene(sceneType, {
        gameConfig: projectDataToGameConfig(currentProject.project_data),
        ...latestPropsRef.current.sceneData,
      });
    }
  }, [currentProject, isDirty, sceneType, isInitialized]);

  // Handle errors
  if (error) {
    return (
      <div className="game-error">
        <h3>Game Initialization Error</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      id="game-container"
      className="game-container"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
      }}
    >
      {!isInitialized && (
        <div className="game-loading">
          <div className="spinner" />
          <p>Loading game...</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Default Export
// ============================================================================

export default GameCanvas;
