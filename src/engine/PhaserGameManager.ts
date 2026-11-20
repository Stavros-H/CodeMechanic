/**
 * Phaser Game Manager
 * 
 * Manages the Phaser 3 game instance lifecycle and integration with Zustand store.
 * This is the central hub for all Phaser-related operations.
 * 
 * Architecture:
 * - React UI emits events to Zustand store
 * - Zustand store is the boundary between UI and engine
 * - Phaser consumes state/events from store via this manager
 * - UI code must NOT directly mutate Phaser internals
 */

import * as Phaser from 'phaser';
import type { GameConfig, HitboxConfig } from '@/types';
import { BootScene } from './scenes/BootScene';
import { PlaytestScene } from './scenes/PlaytestScene';
import { StudioPreviewScene } from './scenes/StudioPreviewScene';

// ============================================================================
// Types
// ============================================================================

export type GameSceneType = 'boot' | 'playtest' | 'studio-preview';
export type PhaserSceneData = {
  gameConfig?: GameConfig;
  targetScene?: GameSceneType;
  [key: string]: unknown;
};

export interface PhaserGameInstance {
  game: Phaser.Game;
  scene: Phaser.Scene;
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

// Default game configuration
const DEFAULT_GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  scene: [],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Disable right-click menu on canvas
  disableContextMenu: true,
};

// Fallback texture for missing/broken sprites
const FALLBACK_TEXTURE_KEY = '__fallback_checkerboard';

// ============================================================================
// Phaser Game Manager
// ============================================================================

export class PhaserGameManager {
  private static instance: PhaserGameManager | null = null;
  private gameInstance: Phaser.Game | null = null;
  private currentScene: Phaser.Scene | null = null;
  private currentSceneType: GameSceneType | null = null;
  private canvasContainer: HTMLElement | null = null;
  private audioContext: AudioContext | null = null;
  
  // Scene registry
  private scenes: Map<GameSceneType, Phaser.Scene> = new Map();

  private constructor() {
    // Initialize AudioContext for procedural audio
    try {
      const AudioContextConstructor = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextConstructor) {
        this.audioContext = new AudioContextConstructor();
      }
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PhaserGameManager {
    if (!PhaserGameManager.instance) {
      PhaserGameManager.instance = new PhaserGameManager();
    }
    return PhaserGameManager.instance;
  }

  /**
   * Initialize the Phaser game with a specific configuration
   */
  public initialize(
    container: HTMLElement,
    config: Partial<Phaser.Types.Core.GameConfig> = {},
    sceneType: GameSceneType = 'boot'
  ): Phaser.Game {
    // Store container reference
    this.canvasContainer = container;
    this.currentSceneType = sceneType;

    // Merge default config with custom config
    const gameConfig: Phaser.Types.Core.GameConfig = {
      ...DEFAULT_GAME_CONFIG,
      ...config,
      parent: container.id || container.className || 'game-container',
    };

    // Create game instance
    this.gameInstance = new Phaser.Game(gameConfig);

    return this.gameInstance;
  }

  /**
   * Create the fallback checkerboard texture once a Phaser scene is ready.
   */
  public createFallbackTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(FALLBACK_TEXTURE_KEY)) return;
    const width = 16;
    const height = 16;

    // Create a magenta/black checkerboard
    const graphics = scene.make.graphics({ x: 0, y: 0 });
    
    // Fill with magenta
    graphics.fillStyle(0xff00ff);
    graphics.fillRect(0, 0, width, height);
    
    // Draw black checkerboard pattern
    graphics.fillStyle(0x000000);
    for (let y = 0; y < height; y += 4) {
      for (let x = (y / 4) % 2 === 0 ? 0 : 4; x < width; x += 8) {
        graphics.fillRect(x, y, 4, 4);
      }
    }

    graphics.generateTexture(FALLBACK_TEXTURE_KEY, width, height);
    graphics.destroy();
  }

  /**
   * Get the fallback texture key
   */
  public getFallbackTextureKey(): string {
    return FALLBACK_TEXTURE_KEY;
  }

  /**
   * Get the current Phaser game instance
   */
  public getGame(): Phaser.Game | null {
    return this.gameInstance;
  }

  /**
   * Get the current scene
   */
  public getCurrentScene(): Phaser.Scene | null {
    return this.currentScene;
  }

  /**
   * Get the current scene type
   */
  public getCurrentSceneType(): GameSceneType | null {
    return this.currentSceneType;
  }

  /**
   * Get the Web Audio context
   */
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Start a new scene of the specified type
   */
  public startScene(sceneType: GameSceneType, data?: PhaserSceneData): void {
    if (!this.gameInstance) {
      console.error('Phaser game not initialized');
      return;
    }

    const previousSceneType = this.currentSceneType;
    if (this.currentScene && previousSceneType !== sceneType) {
      this.currentScene.scene.stop();
      this.currentScene = null;
    }

    this.currentSceneType = sceneType;

    // Create and start the new scene
    switch (sceneType) {
      case 'boot':
        this.startBootScene(data);
        break;
      case 'playtest':
        this.startPlaytestScene(data);
        break;
      case 'studio-preview':
        this.startStudioPreviewScene(data);
        break;
      default:
        console.error(`Unknown scene type: ${sceneType}`);
    }
  }

  /**
   * Start the boot scene
   */
  private startBootScene(data?: PhaserSceneData): void {
    if (!this.gameInstance) return;

    const existingScene = this.scenes.get('boot');
    if (existingScene) {
      this.gameInstance.scene.start('boot', data);
      this.currentScene = existingScene;
      return;
    }

    const bootScene = new BootScene();
    this.gameInstance.scene.add('boot', bootScene, true, data);
    this.currentScene = bootScene;
    this.scenes.set('boot', bootScene);
  }

  /**
   * Start the playtest scene
   */
  private startPlaytestScene(data?: PhaserSceneData): void {
    if (!this.gameInstance) return;

    const existingScene = this.scenes.get('playtest');
    if (existingScene) {
      this.gameInstance.scene.start('playtest', data);
      this.currentScene = existingScene;
      return;
    }

    const playtestScene = new PlaytestScene();
    this.gameInstance.scene.add('playtest', playtestScene, true, data);
    this.currentScene = playtestScene;
    this.scenes.set('playtest', playtestScene);
  }

  /**
   * Start the studio preview scene
   */
  private startStudioPreviewScene(data?: PhaserSceneData): void {
    if (!this.gameInstance) return;

    const existingScene = this.scenes.get('studio-preview');
    if (existingScene) {
      this.gameInstance.scene.start('studio-preview', data);
      this.currentScene = existingScene;
      return;
    }

    const studioScene = new StudioPreviewScene();
    this.gameInstance.scene.add('studio-preview', studioScene, true, data);
    this.currentScene = studioScene;
    this.scenes.set('studio-preview', studioScene);
  }

  /**
   * Destroy the current game instance and clean up
   * Called when leaving playtest route to prevent state leaks
   */
  public destroy(): void {
    // Phaser owns scene teardown when its game instance is destroyed.
    this.scenes.clear();

    // Destroy game instance
    if (this.gameInstance) {
      this.gameInstance.destroy(true);
      this.gameInstance = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.currentScene = null;
    this.currentSceneType = null;
    this.canvasContainer = null;
  }

  /**
   * Play procedural audio
   */
  public playAudio(config: {
    wave?: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
    freq_start?: number;
    freq_end?: number;
    decay?: number;
    duration?: number;
    volume?: number;
  }): void {
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = config.wave && config.wave !== 'noise' ? config.wave : 'sine';
    oscillator.frequency.setValueAtTime(config.freq_start || 440, this.audioContext.currentTime);
    if (config.freq_end) {
      oscillator.frequency.linearRampToValueAtTime(
        config.freq_end,
        this.audioContext.currentTime + (config.duration || 0.2)
      );
    }

    gainNode.gain.setValueAtTime(config.volume || 0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + (config.decay || 0.1)
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + (config.duration || 0.2));
  }

  /**
   * Create a Phaser sprite with fallback texture
   */
  public createSpriteWithFallback(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    frame?: string
  ): Phaser.GameObjects.Sprite {
    const sprite = scene.add.sprite(x, y, textureKey, frame);

    // If texture is missing or broken, use fallback
    if (!sprite.texture || sprite.texture.key === '__MISSING') {
      console.warn(`Texture "${textureKey}" not found, using fallback`);
      sprite.setTexture(FALLBACK_TEXTURE_KEY);
    }

    return sprite;
  }

  /**
   * Create a hitbox for an entity
   */
  public createHitbox(
    scene: Phaser.Scene,
    entity: Phaser.GameObjects.Sprite,
    config: HitboxConfig
  ): Phaser.Physics.Arcade.Body {
    const physics = (scene as unknown as {
      physics: Phaser.Physics.Arcade.ArcadePhysics;
    }).physics;
    if (!physics) {
      throw new Error('Phaser physics not initialized');
    }

    // Enable physics for the entity
    physics.add.existing(entity);
    const body = entity.body as Phaser.Physics.Arcade.Body;

    // Configure hitbox based on type
    if (config.shape === 'rectangle') {
      body.setSize(config.width || 16, config.height || 16);
      body.setOffset(config.offsetX || 0, config.offsetY || 0);
    } else if (config.shape === 'circle') {
      body.setCircle(config.radius || 8, config.offsetX || 0, config.offsetY || 0);
    }

    // Set physics properties
    body.setAllowGravity(config.allowGravity !== false);
    body.setImmovable(config.immovable || false);
    body.setCollideWorldBounds(config.collideWorldBounds || false);

    return body;
  }

  /**
   * Convert game config to Phaser physics config
   */
  public createPhysicsConfig(config: GameConfig): Phaser.Types.Physics.Arcade.ArcadeWorldConfig {
    return {
      gravity: { x: 0, y: config.gravity || 0 },
      debug: config.debug || false,
      debugShowBody: config.debug || false,
      debugShowStaticBody: config.debug || false,
      debugShowVelocity: config.debug || false,
      debugBodyColor: config.debugBodyColor || 0x00ff00,
      debugStaticBodyColor: config.debugStaticBodyColor || 0x0000ff,
      debugVelocityColor: config.debugVelocityColor || 0xffff00,
    };
  }

  /**
   * Reset the manager (for testing)
   */
  public static reset(): void {
    if (PhaserGameManager.instance) {
      PhaserGameManager.instance.destroy();
      PhaserGameManager.instance = null;
    }
  }
}

// Export singleton instance
const gameManager = PhaserGameManager.getInstance();
export { gameManager };
