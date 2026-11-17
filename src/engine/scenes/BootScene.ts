/**
 * Boot Scene
 * 
 * Initial scene that loads essential assets and transitions to the appropriate scene.
 * This scene handles:
 * - Preloading fallback textures
 * - Validating game configuration
 * - Transitioning to playtest or studio-preview scenes
 */

import * as Phaser from 'phaser';
import { PhaserGameManager } from '../PhaserGameManager';
import type { PhaserSceneData } from '../PhaserGameManager';
import type { GameConfig } from '@/types';

export class BootScene extends Phaser.Scene {
  private gameManager: PhaserGameManager;
  private gameConfig?: GameConfig;

  constructor() {
    super({ key: 'boot' });
    this.gameManager = PhaserGameManager.getInstance();
  }

  preload(): void {
    // Load any essential assets here
    // The fallback texture is created programmatically in PhaserGameManager
  }

  create(data: PhaserSceneData): void {
    this.gameConfig = data.gameConfig;

    // Validate game configuration
    if (!this.validateConfig(this.gameConfig)) {
      console.error('Invalid game configuration');
      this.handleBootError('Invalid game configuration');
      return;
    }

    // Configuration is valid, transition to the appropriate scene
    const targetScene = data.targetScene || 'playtest';
    
    switch (targetScene) {
      case 'playtest':
        this.startPlaytest(data);
        break;
      case 'studio-preview':
        this.startStudioPreview(data);
        break;
      default:
        console.error(`Unknown target scene: ${targetScene}`);
        this.handleBootError(`Unknown target scene: ${targetScene}`);
    }
  }

  /**
   * Validate game configuration
   */
  private validateConfig(config?: GameConfig): boolean {
    if (!config) {
      console.warn('No game configuration provided, using defaults');
      return true;
    }

    // Check required fields
    if (!config.entities?.length && !config.sprites?.length) {
      console.warn('No entities in configuration');
    }

    if (!config.mechanics_config) {
      console.warn('No mechanics in configuration');
    }

    return true;
  }

  /**
   * Start the playtest scene
   */
  private startPlaytest(data: PhaserSceneData): void {
    this.scene.start('playtest', {
      gameConfig: this.gameConfig,
      ...data,
    });
  }

  /**
   * Start the studio preview scene
   */
  private startStudioPreview(data: PhaserSceneData): void {
    this.scene.start('studio-preview', {
      gameConfig: this.gameConfig,
      ...data,
    });
  }

  /**
   * Handle boot errors
   */
  private handleBootError(message: string): void {
    // Display error message
    const errorText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Boot Error: ${message}`,
      {
        font: '16px Arial',
        color: '#ff0000',
        align: 'center',
      }
    ).setOrigin(0.5);

    // Add retry button
    const retryButton = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'Retry',
      {
        font: '16px Arial',
        color: '#00ff00',
        align: 'center',
      }
    ).setOrigin(0.5);

    retryButton.setInteractive();
    retryButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  update(): void {
    // Boot scene doesn't need update logic
  }
}
