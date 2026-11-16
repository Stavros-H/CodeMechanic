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
import { PhaserGameManager, gameManager } from '@/engine';
import { GameConfig, GameSceneType } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface GameCanvasProps {
  /** Game configuration */
  config?: GameConfig;
  /** Scene type to start */
  sceneType?: GameSceneType;
  /** Additional data to pass to the scene */
  sceneData?: any;
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { currentProject, isDirty } = useGameStore();

  // Initialize Phaser on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Initialize game manager
      const manager = gameManager;
      
      // Initialize Phaser game
      manager.initialize(canvasRef.current, {}, sceneType);
      
      // Start the scene with config
      if (config) {
        manager.startScene(sceneType, { gameConfig: config, ...sceneData });
      } else {
        manager.startScene(sceneType, sceneData);
      }

      setIsInitialized(true);
      onReady?.(manager);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      onError?.(errorObj);
    }

    // Cleanup on unmount
    return () => {
      try {
        gameManager.destroy();
      } catch (err) {
        console.error('Error destroying game:', err);
      }
    };
  }, [config, sceneType, sceneData, onReady, onError]);

  // Handle project changes
  useEffect(() => {
    if (!isInitialized || !currentProject) return;

    // Restart scene with new project data
    const manager = gameManager;
    const game = manager.getGame();
    
    if (game && !isDirty) {
      // Reload scene with new config
      manager.startScene(sceneType, {
        gameConfig: currentProject.project_data,
        ...sceneData,
      });
    }
  }, [currentProject, isDirty, sceneType, sceneData, isInitialized]);

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
