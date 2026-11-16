/**
 * Studio Preview Scene
 * 
 * Preview scene for the studio. This scene:
 * - Renders a preview of the current project
 * - Allows testing mechanics without saving
 * - Provides a quick feedback loop for creators
 */

import Phaser from 'phaser';
import { PhaserGameManager } from '../PhaserGameManager';
import { GameConfig } from '@/types';

export class StudioPreviewScene extends Phaser.Scene {
  private gameManager: PhaserGameManager;
  private gameConfig?: GameConfig;
  
  // Preview entities
  private previewEntities: Phaser.GameObjects.Sprite[] = [];
  
  // Physics
  private physics!: Phaser.Physics.Arcade.ArcadePhysics;
  
  // Camera
  private camera?: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super({ key: 'studio-preview' });
    this.gameManager = PhaserGameManager.getInstance();
  }

  preload(): void {
    // Preload any assets if needed
  }

  create(data: any): void {
    this.gameConfig = data?.gameConfig;
    
    // Get physics instance
    this.physics = this.game.physics as Phaser.Physics.Arcade.ArcadePhysics;
    
    // Setup camera
    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, 800, 600);
    
    // Create preview from config
    this.createPreview();
    
    // Add exit button
    this.addExitButton();
  }

  /**
   * Create preview from game configuration
   */
  private createPreview(): void {
    if (!this.gameConfig) {
      this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        'No preview available',
        {
          font: '24px Arial',
          fill: '#ffffff',
          align: 'center',
        }
      ).setOrigin(0.5);
      return;
    }

    // Create a simple preview
    // In a full implementation, this would render the actual project data
    
    // Create a test sprite
    const testSprite = this.gameManager.createSpriteWithFallback(
      this,
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      '__MISSING'
    );
    
    // Enable physics
    const body = this.gameManager.createHitbox(this, testSprite, {
      shape: 'rectangle',
      width: 32,
      height: 32,
    });
    
    testSprite.setData('body', body);
    this.previewEntities.push(testSprite);
    
    // Add instruction text
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 50,
      'Studio Preview - Press ESC to exit',
      {
        font: '16px Arial',
        fill: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);
  }

  /**
   * Add exit button
   */
  private addExitButton(): void {
    const exitKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    
    exitKey?.on('down', () => {
      this.scene.stop();
      this.gameManager.destroy();
    });
  }

  update(): void {
    // Studio preview update logic
  }
}
