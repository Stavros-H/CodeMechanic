/**
 * Playtest Scene
 * 
 * Main game scene for playtesting. This scene:
 * - Creates the game world
 * - Sets up entities with physics
 * - Handles collisions
 * - Manages win/loss conditions
 * - Provides debug overlays
 */

import * as Phaser from 'phaser';
import { PhaserGameManager } from '../PhaserGameManager';
import { GameConfig, EntityConfig, EntityRole, WinConditionType } from '@/types';

export class PlaytestScene extends Phaser.Scene {
  private gameManager: PhaserGameManager;
  private gameConfig?: GameConfig;
  
  // Entity groups
  private players: Map<EntityRole, Phaser.GameObjects.Sprite> = new Map();
  private enemies: Phaser.GameObjects.Sprite[] = [];
  private hazards: Phaser.GameObjects.Sprite[] = [];
  private pickups: Phaser.GameObjects.Sprite[] = [];
  private goals: Phaser.GameObjects.Sprite[] = [];
  private tiles: Phaser.GameObjects.Sprite[] = [];
  
  // Physics
  private physics!: Phaser.Physics.Arcade.ArcadePhysics;
  
  // Debug
  private debugText?: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;
  private entityCountText?: Phaser.GameObjects.Text;
  
  // Game state
  private isPaused: boolean = false;
  private gameWon: boolean = false;
  private gameLost: boolean = false;
  
  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyF?: Phaser.Input.Keyboard.Key;
  private keyG?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'playtest' });
    this.gameManager = PhaserGameManager.getInstance();
  }

  preload(): void {
    // Preload any assets if needed
    // In production, assets would be loaded from the game config
  }

  create(data: any): void {
    this.gameConfig = data?.gameConfig;
    
    // Get physics instance
    this.physics = this.game.physics as Phaser.Physics.Arcade.ArcadePhysics;
    
    // Setup camera
    this.setupCamera();
    
    // Setup input
    this.setupInput();
    
    // Create world
    this.createWorld();
    
    // Setup collisions
    this.setupCollisions();
    
    // Setup debug overlays
    this.setupDebug();
    
    // Setup win/loss conditions
    this.setupWinLossConditions();
  }

  /**
   * Setup camera
   */
  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.gameConfig?.levelWidth || 800, this.gameConfig?.levelHeight || 600);
    
    // Follow player 1 if it exists
    if (this.players.has('player_1')) {
      const player = this.players.get('player_1')!;
      camera.startFollow(player, true, 0.1, 0.1);
    }
  }

  /**
   * Setup input
   */
  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    
    // Player 1 controls
    this.keyW = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyF = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.keyG = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.keySpace = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  /**
   * Create the game world from configuration
   */
  private createWorld(): void {
    if (!this.gameConfig) {
      console.warn('No game configuration, creating empty world');
      return;
    }

    // Create tiles
    this.createTiles();
    
    // Create entities
    this.createEntities();
  }

  /**
   * Create tiles from configuration
   */
  private createTiles(): void {
    if (!this.gameConfig?.tiles) return;

    for (const tileConfig of this.gameConfig.tiles) {
      const tile = this.gameManager.createSpriteWithFallback(
        this,
        tileConfig.x || 0,
        tileConfig.y || 0,
        tileConfig.texture || '__MISSING'
      );
      
      // Enable physics for solid tiles
      if (tileConfig.solid) {
        const body = this.gameManager.createHitbox(this, tile, {
          shape: 'rectangle',
          width: tileConfig.width || 16,
          height: tileConfig.height || 16,
          immovable: true,
          collideWorldBounds: false,
        });
        tile.setData('body', body);
      }

      this.tiles.push(tile);
    }
  }

  /**
   * Create entities from configuration
   */
  private createEntities(): void {
    if (!this.gameConfig?.entities) return;

    for (const entityConfig of this.gameConfig.entities) {
      this.createEntity(entityConfig);
    }
  }

  /**
   * Create a single entity
   */
  private createEntity(config: EntityConfig): void {
    // Use fallback texture if no texture specified
    const texture = config.texture || '__MISSING';
    
    const entity = this.gameManager.createSpriteWithFallback(
      this,
      config.x || 0,
      config.y || 0,
      texture
    );

    // Store entity by role
    if (config.role === 'player_1') {
      this.players.set('player_1', entity);
    } else if (config.role === 'player_2') {
      this.players.set('player_2', entity);
    } else if (config.role === 'enemy') {
      this.enemies.push(entity);
    } else if (config.role === 'hazard') {
      this.hazards.push(entity);
    } else if (config.role === 'pickup') {
      this.pickups.push(entity);
    } else if (config.role === 'goal') {
      this.goals.push(entity);
    }

    // Create hitbox
    if (config.hitbox) {
      const body = this.gameManager.createHitbox(this, entity, config.hitbox);
      entity.setData('body', body);
      entity.setData('role', config.role);
      entity.setData('health', config.health || 100);
    }

    // Set entity name for debugging
    entity.setName(config.role);
  }

  /**
   * Setup collisions between entities
   */
  private setupCollisions(): void {
    // Player vs. Tiles
    this.physics.add.collider(
      Array.from(this.players.values()),
      this.tiles.filter(t => t.getData('solid')),
      this.handlePlayerTileCollision,
      undefined,
      this
    );

    // Player vs. Enemies (damage)
    this.physics.add.overlap(
      Array.from(this.players.values()),
      this.enemies,
      this.handlePlayerEnemyCollision,
      undefined,
      this
    );

    // Player vs. Hazards (damage)
    this.physics.add.overlap(
      Array.from(this.players.values()),
      this.hazards,
      this.handlePlayerHazardCollision,
      undefined,
      this
    );

    // Player vs. Pickups
    this.physics.add.overlap(
      Array.from(this.players.values()),
      this.pickups,
      this.handlePlayerPickupCollision,
      undefined,
      this
    );

    // Player vs. Goals
    this.physics.add.overlap(
      Array.from(this.players.values()),
      this.goals,
      this.handlePlayerGoalCollision,
      undefined,
      this
    );
  }

  /**
   * Handle player-tile collision
   */
  private handlePlayerTileCollision(
    player: Phaser.GameObjects.Sprite,
    tile: Phaser.GameObjects.Sprite
  ): void {
    // Tile collision handled by physics
  }

  /**
   * Handle player-enemy collision
   */
  private handlePlayerEnemyCollision(
    player: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite
  ): void {
    // Damage player
    const playerHealth = player.getData('health') || 100;
    player.setData('health', playerHealth - 10);
    
    // Play sound
    this.gameManager.playAudio({
      waveform: 'sawtooth',
      frequency: 200,
      decay: 0.1,
      duration: 0.1,
    });

    // Check if player died
    if (player.getData('health') <= 0) {
      this.handleGameOver(false);
    }
  }

  /**
   * Handle player-hazard collision
   */
  private handlePlayerHazardCollision(
    player: Phaser.GameObjects.Sprite,
    hazard: Phaser.GameObjects.Sprite
  ): void {
    // Damage player
    const playerHealth = player.getData('health') || 100;
    player.setData('health', playerHealth - 20);

    // Play sound
    this.gameManager.playAudio({
      waveform: 'sawtooth',
      frequency: 150,
      decay: 0.1,
      duration: 0.15,
    });

    // Check if player died
    if (player.getData('health') <= 0) {
      this.handleGameOver(false);
    }
  }

  /**
   * Handle player-pickup collision
   */
  private handlePlayerPickupCollision(
    player: Phaser.GameObjects.Sprite,
    pickup: Phaser.GameObjects.Sprite
  ): void {
    // Remove pickup
    pickup.destroy();
    this.pickups = this.pickups.filter(p => p !== pickup);

    // Play sound
    this.gameManager.playAudio({
      waveform: 'sine',
      frequency: 800,
      decay: 0.1,
      duration: 0.1,
    });
  }

  /**
   * Handle player-goal collision
   */
  private handlePlayerGoalCollision(
    player: Phaser.GameObjects.Sprite,
    goal: Phaser.GameObjects.Sprite
  ): void {
    // Check win condition
    if (this.gameConfig?.winCondition === 'reach_goal') {
      this.handleGameOver(true);
    }

    // Play sound
    this.gameManager.playAudio({
      waveform: 'sine',
      frequency: 600,
      decay: 0.2,
      duration: 0.3,
    });
  }

  /**
   * Setup win/loss conditions
   */
  private setupWinLossConditions(): void {
    // Check for win/loss on update
    this.events.on(Phaser.Scenes.Events.UPDATE, this.checkWinLossConditions, this);
  }

  /**
   * Check win/loss conditions
   */
  private checkWinLossConditions(): void {
    if (this.gameWon || this.gameLost || this.isPaused) return;

    // Check win conditions
    if (this.gameConfig?.winCondition === 'reach_goal') {
      // Already handled in collision
    } else if (this.gameConfig?.winCondition === 'defeat_all_enemies') {
      if (this.enemies.length === 0 && this.gameConfig.enemies?.length > 0) {
        this.handleGameOver(true);
      }
    }

    // Check loss conditions
    for (const [role, player] of this.players) {
      if (player.getData('health') <= 0) {
        this.handleGameOver(false);
        break;
      }
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(won: boolean): void {
    this.gameWon = won;
    this.gameLost = !won;
    this.isPaused = true;

    // Pause physics
    this.physics.pause();

    // Show game over overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    ).setOrigin(0.5);

    const resultText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      won ? 'VICTORY!' : 'DEFEAT',
      {
        font: '48px Arial',
        fill: won ? '#00ff00' : '#ff0000',
        align: 'center',
      }
    ).setOrigin(0.5);

    const replayButton = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'Replay',
      {
        font: '24px Arial',
        fill: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);

    replayButton.setInteractive();
    replayButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  /**
   * Setup debug overlays
   */
  private setupDebug(): void {
    // FPS counter
    this.fpsText = this.add.text(10, 10, '', {
      font: '12px Arial',
      fill: '#00ff00',
    });

    // Entity count
    this.entityCountText = this.add.text(10, 25, '', {
      font: '12px Arial',
      fill: '#00ff00',
    });

    // Debug info
    this.debugText = this.add.text(10, 40, '', {
      font: '12px Arial',
      fill: '#00ff00',
    });
  }

  /**
   * Update debug overlays
   */
  private updateDebug(): void {
    if (this.fpsText) {
      this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    }

    if (this.entityCountText) {
      const entityCount = (
        this.players.size +
        this.enemies.length +
        this.hazards.length +
        this.pickups.length +
        this.goals.length +
        this.tiles.length
      );
      this.entityCountText.setText(`Entities: ${entityCount}`);
    }

    if (this.debugText) {
      const player = this.players.get('player_1');
      if (player) {
        const body = player.getData('body') as Phaser.Physics.Arcade.Body;
        this.debugText.setText(
          `Player: (${Math.round(player.x)}, ${Math.round(player.y)})` +
          ` | Velocity: (${Math.round(body?.velocity.x || 0)}, ${Math.round(body?.velocity.y || 0)})`
        );
      }
    }
  }

  /**
   * Handle player input
   */
  private handlePlayerInput(): void {
    const player1 = this.players.get('player_1');
    if (!player1) return;

    const body = player1.body as Phaser.Physics.Arcade.Body;
    const speed = 200;

    // Reset velocity
    body.setVelocity(0);

    // Handle movement
    if (this.cursors?.left.isDown || this.keyA?.isDown) {
      body.setVelocityX(-speed);
    } else if (this.cursors?.right.isDown || this.keyD?.isDown) {
      body.setVelocityX(speed);
    }

    if (this.cursors?.up.isDown || this.keyW?.isDown) {
      body.setVelocityY(-speed);
    } else if (this.cursors?.down.isDown || this.keyS?.isDown) {
      body.setVelocityY(speed);
    }

    // Handle actions
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) {
      // Action 1
      this.handlePlayerAction(player1, 'action1');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyG)) {
      // Action 2
      this.handlePlayerAction(player1, 'action2');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      // Jump
      if (body.onFloor()) {
        body.setVelocityY(-300);
      }
    }
  }

  /**
   * Handle player action
   */
  private handlePlayerAction(player: Phaser.GameObjects.Sprite, action: string): void {
    // Play action sound
    this.gameManager.playAudio({
      waveform: 'sine',
      frequency: 400,
      decay: 0.05,
      duration: 0.05,
    });
  }

  update(time: number, delta: number): void {
    if (this.isPaused) return;

    // Handle player input
    this.handlePlayerInput();

    // Update debug overlays
    this.updateDebug();
  }
}
