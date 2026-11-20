/**
 * Playtest Scene
 *
 * Main game scene for playtesting. This scene:
 * - Creates the game world from a GameConfig adapted from project data
 * - Sets up entities with physics
 * - Runs composable enemy AI rules and wave spawners
 * - Handles collisions, weapons, and projectiles
 * - Manages win/loss conditions
 * - Provides debug overlays
 */

import * as Phaser from 'phaser';
import { PhaserGameManager } from '../PhaserGameManager';
import type { PhaserSceneData } from '../PhaserGameManager';
import type { GameConfig, EntityConfig, EntityRoleType as EntityRole } from '@/types';
import { FALLBACK_ROLE_COLORS } from '@/lib/gameConfig';

// ============================================================================
// Playtest Scene
// ============================================================================

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
  private bullets: Phaser.GameObjects.Sprite[] = [];

  // Win/loss bookkeeping
  private initialEnemyCount = 0;
  private initialPickupCount = 0;

  // Physics
  private arcadePhysics!: Phaser.Physics.Arcade.ArcadePhysics;

  // Debug
  private debugText?: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;
  private entityCountText?: Phaser.GameObjects.Text;

  // Game state
  private isPaused: boolean = false;
  private gameWon: boolean = false;
  private gameLost: boolean = false;

  // Input / combat state
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyF?: Phaser.Input.Keyboard.Key;
  private keyG?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;
  private playerFacing: 1 | -1 = 1;
  private lastFireTime = -9999;

  constructor() {
    super({ key: 'playtest' });
    this.gameManager = PhaserGameManager.getInstance();
  }

  preload(): void {
    // Sprite textures are registered from data URLs in create().
  }

  create(data: PhaserSceneData): void {
    // A Phaser Scene instance is reused when restarted. Reset its runtime
    // references because the previous display list and physics bodies are gone.
    this.players.clear();
    this.enemies = [];
    this.hazards = [];
    this.pickups = [];
    this.goals = [];
    this.tiles = [];
    this.bullets = [];
    this.initialEnemyCount = 0;
    this.initialPickupCount = 0;
    this.isPaused = false;
    this.gameWon = false;
    this.gameLost = false;
    this.playerFacing = 1;
    this.lastFireTime = -9999;
    this.debugText = undefined;
    this.fpsText = undefined;
    this.entityCountText = undefined;
    // setupWinLossConditions re-registers on create; drop the previous
    // registration so restarts don't accumulate duplicate handlers.
    this.events.off(Phaser.Scenes.Events.UPDATE, this.checkWinLossConditions, this);

    this.gameConfig = data.gameConfig;

    this.gameManager.createFallbackTexture(this);
    this.createBulletTexture();

    // Get physics instance and ensure the world is running on scene reuse
    this.arcadePhysics = (this as unknown as {
      physics: Phaser.Physics.Arcade.ArcadePhysics;
    }).physics;
    this.arcadePhysics.resume();

    // Setup input
    this.setupInput();

    // Create world (must run before the camera starts following a player)
    this.createWorld();

    // Setup camera
    this.setupCamera();

    // Setup collisions
    this.setupCollisions();

    // Setup debug overlays
    this.setupDebug();

    // Setup win/loss conditions
    this.setupWinLossConditions();
  }

  /**
   * Public stats for the React debug bar.
   */
  getStats(): { fps: number; entities: number } {
    const entityCount =
      this.players.size +
      this.enemies.length +
      this.hazards.length +
      this.pickups.length +
      this.goals.length +
      this.tiles.length +
      this.bullets.length;
    return {
      fps: Math.round(this.game.loop.actualFps),
      entities: entityCount,
    };
  }

  // ============================================================================
  // World creation
  // ============================================================================

  /**
   * Create the game world from configuration
   */
  private createWorld(): void {
    if (!this.gameConfig) {
      console.warn('No game configuration, creating empty world');
      return;
    }

    // Apply declared gravity from the mechanics rules
    this.arcadePhysics.world.gravity.y = this.gameConfig.gravity ?? 800;

    // Register real sprite art (data URLs) so entities can pick it up as it decodes
    this.registerSpriteTextures();

    // Create tiles
    this.createTiles();

    // Create entities
    this.createEntities();

    // Start wave spawners
    this.setupWaveSpawners();
  }

  /**
   * Load saved sprite art (data URLs) as Phaser textures. addBase64 decodes
   * asynchronously and fires a texture "add" event, which we use to upgrade
   * fallback-tinted sprites once their art is available.
   */
  private registerSpriteTextures(): void {
    const sprites = this.gameConfig?.sprites ?? [];
    for (const sprite of sprites) {
      const frame = this.getFirstFrameUrl(sprite);
      if (frame && !this.textures.exists(sprite.id)) {
        this.textures.addBase64(sprite.id, frame);
      }
    }
    const onTextureAdd = (textureKey: string) => {
      this.applyTextureToEntities(textureKey);
    };
    this.textures.on(Phaser.Textures.Events.ADD, onTextureAdd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.textures.off(Phaser.Textures.Events.ADD, onTextureAdd, this);
    });
  }

  /**
   * Pick the first frame (data URL) available on a sprite, idle first.
   */
  private getFirstFrameUrl(
    sprite: NonNullable<GameConfig['sprites']>[number]
  ): string | null {
    const frames = sprite.frames ?? {};
    return (
      frames.idle?.[0] ??
      frames.run?.[0] ??
      frames.jump?.[0] ??
      frames.action?.[0] ??
      null
    );
  }

  /** Upgrade any entity that references a freshly-loaded texture. */
  private applyTextureToEntities(textureKey: string): void {
    const all: Phaser.GameObjects.Sprite[] = [
      ...Array.from(this.players.values()),
      ...this.enemies,
      ...this.hazards,
      ...this.pickups,
      ...this.goals,
    ];
    for (const entity of all) {
      if (entity.getData('textureKey') === textureKey) {
        entity.setTexture(textureKey);
        entity.clearTint();
      }
    }
  }

  private applyEntityDisplay(
    entity: Phaser.GameObjects.Sprite,
    config: EntityConfig
  ): void {
    if (config.width && config.height) {
      entity.setDisplaySize(config.width, config.height);
    }
  }

  private createBulletTexture(): void {
    if (this.textures.exists('__bullet')) return;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 12, 6);
    graphics.generateTexture('__bullet', 12, 6);
    graphics.destroy();
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
        tileConfig.texture || this.gameManager.getFallbackTextureKey()
      );
      tile.setDisplaySize(tileConfig.width || 16, tileConfig.height || 16);
      tile.setTint(FALLBACK_ROLE_COLORS.tile ?? 0x8a6b4d);

      // Enable physics for solid tiles
      if (tileConfig.solid) {
        const body = this.gameManager.createHitbox(this, tile, {
          shape: 'rectangle',
          width: tileConfig.width || 16,
          height: tileConfig.height || 16,
          allowGravity: false,
          immovable: true,
          collideWorldBounds: false,
        });
        tile.setData('body', body);
        // Collision filters below rely on this flag.
        tile.setData('solid', true);
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

    this.initialEnemyCount = this.gameConfig.enemies?.length ?? 0;
    this.initialPickupCount = this.pickups.length;
  }

  /**
   * Create a single entity
   */
  private createEntity(config: EntityConfig): void {
    // Use the fallback texture until (and unless) real art decodes
    const texture = config.texture || this.gameManager.getFallbackTextureKey();

    const entity = this.gameManager.createSpriteWithFallback(
      this,
      config.x || 0,
      config.y || 0,
      texture
    );

    this.applyEntityDisplay(entity, config);
    entity.setData('role', config.role);
    entity.setData('health', config.health || 100);
    entity.setData('ai', config.ai ?? null);
    entity.setData('textureKey', config.texture ?? null);
    entity.setData('spawnX', config.x ?? 0);

    if (!config.texture) {
      // Distinguish roles while placeholder art is in use
      const tint = FALLBACK_ROLE_COLORS[config.role];
      if (tint !== undefined) entity.setTint(tint);
    }

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
      this.applyRolePhysicsDefaults(entity, config.role, config);
    }

    // Set entity name for debugging
    entity.setName(config.role);
  }

  private applyRolePhysicsDefaults(
    entity: Phaser.GameObjects.Sprite,
    role: EntityRole,
    config: EntityConfig
  ): void {
    const body = entity.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    if (role === 'player_1' || role === 'player_2') {
      body.setAllowGravity(true);
      body.setImmovable(false);
      body.setCollideWorldBounds(true);
    } else if (role === 'enemy') {
      const flying = config.ai?.movement === 'FlyAndHover';
      body.setAllowGravity(!flying);
      body.setImmovable(false);
      body.setCollideWorldBounds(true);
    } else {
      // pickup / goal / hazard: pinned in place
      body.setAllowGravity(false);
      body.setImmovable(true);
      body.setCollideWorldBounds(false);
    }
  }

  /**
   * Start one timer per configured wave spawner.
   */
  private setupWaveSpawners(): void {
    const spawners = this.gameConfig?.level_data?.wave_spawners ?? [];
    const sprites = this.gameConfig?.sprites ?? [];
    const levelWidth = this.gameConfig?.levelWidth ?? 800;

    for (const spawner of spawners) {
      const template = sprites.find((s) => s.id === spawner.enemy_id);
      if (!template) continue;
      let remaining = spawner.total_count;
      const timer = this.time.addEvent({
        delay: Math.max(100, spawner.spawn_interval_sec * 1000),
        loop: true,
        callback: () => {
          if (this.gameWon || this.gameLost || remaining <= 0) {
            timer.remove();
            return;
          }
          remaining -= 1;
          const spawnX = Phaser.Math.Between(32, Math.max(32, levelWidth - 32));
          this.createEntity({
            role: 'enemy',
            x: spawnX,
            y: 16,
            width: template.resolution * 2,
            height: template.resolution * 2,
            texture: this.getFirstFrameUrl(template) ? template.id : undefined,
            health: 100,
            ai: template.ai_config ?? undefined,
          });
        },
      });
    }
  }

  // ============================================================================
  // Camera / input
  // ============================================================================

  /**
   * Setup camera
   */
  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(
      0,
      0,
      this.gameConfig?.levelWidth || 800,
      this.gameConfig?.levelHeight || 600
    );

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

  // ============================================================================
  // Collisions
  // ============================================================================

  /**
   * Setup collisions between entities
   */
  private setupCollisions(): void {
    const solidTiles = () => this.tiles.filter(t => t.getData('solid'));

    // Player vs. Tiles
    this.arcadePhysics.add.collider(
      Array.from(this.players.values()),
      solidTiles(),
      (player, tile) => this.handlePlayerTileCollision(
        player as Phaser.GameObjects.Sprite,
        tile as Phaser.GameObjects.Sprite
      ),
      undefined,
      this
    );

    // Enemies vs. Tiles (so spawned/chasing enemies can be grounded)
    this.arcadePhysics.add.collider(
      this.enemies,
      solidTiles(),
      (enemy, tile) => this.handleEnemyTileCollision(
        enemy as Phaser.GameObjects.Sprite,
        tile as Phaser.GameObjects.Sprite
      ),
      undefined,
      this
    );

    // Player vs. Enemies (damage)
    this.arcadePhysics.add.overlap(
      Array.from(this.players.values()),
      this.enemies,
      (player, enemy) => this.handlePlayerEnemyCollision(
        player as Phaser.GameObjects.Sprite,
        enemy as Phaser.GameObjects.Sprite
      ),
      undefined,
      this
    );

    // Player vs. Hazards (damage)
    this.arcadePhysics.add.overlap(
      Array.from(this.players.values()),
      this.hazards,
      (player, hazard) => this.handlePlayerHazardCollision(
        player as Phaser.GameObjects.Sprite,
        hazard as Phaser.GameObjects.Sprite
      ),
      undefined,
      this
    );

    // Player vs. Pickups
    this.arcadePhysics.add.overlap(
      Array.from(this.players.values()),
      this.pickups,
      (player, pickup) => this.handlePlayerPickupCollision(
        player as Phaser.GameObjects.Sprite,
        pickup as Phaser.GameObjects.Sprite
      ),
      undefined,
      this
    );

    // Player vs. Goals
    this.arcadePhysics.add.overlap(
      Array.from(this.players.values()),
      this.goals,
      (player, goal) => this.handlePlayerGoalCollision(
        player as Phaser.GameObjects.Sprite,
        goal as Phaser.GameObjects.Sprite
      ),
      undefined,
      this
    );

    // Bullets vs. Enemies
    this.arcadePhysics.add.overlap(
      this.bullets,
      this.enemies,
      (bullet, enemy) => this.handleBulletEnemyCollision(
        bullet as Phaser.GameObjects.Sprite,
        enemy as Phaser.GameObjects.Sprite
      ),
      undefined,
      this
    );
  }

  private handlePlayerTileCollision(
    player: Phaser.GameObjects.Sprite,
    tile: Phaser.GameObjects.Sprite
  ): void {
    // Tile collision handled by physics
    void player;
    void tile;
  }

  private handleEnemyTileCollision(
    enemy: Phaser.GameObjects.Sprite,
    tile: Phaser.GameObjects.Sprite
  ): void {
    // Patrol bounds are handled by blocked-edge checks in updateEnemyAI;
    // the collision itself is handled by physics.
    void enemy;
    void tile;
  }

  private handlePlayerEnemyCollision(
    player: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite
  ): void {
    // Per-enemy damage cooldown so resting on an enemy doesn't drain health instantly
    const now = this.time.now;
    if (now - ((enemy.getData('lastHitMs') as number) ?? -9999) < 500) return;
    enemy.setData('lastHitMs', now);

    // Damage player
    const playerHealth = player.getData('health') || 100;
    player.setData('health', playerHealth - 10);

    // Play sound
    this.gameManager.playAudio({
      wave: 'sawtooth',
      freq_start: 200,
      decay: 0.1,
      duration: 0.1,
    });

    // Check if player died
    if (player.getData('health') <= 0) {
      this.handleGameOver(false);
    }
  }

  private handlePlayerHazardCollision(
    player: Phaser.GameObjects.Sprite,
    hazard: Phaser.GameObjects.Sprite
  ): void {
    const now = this.time.now;
    if (now - ((hazard.getData('lastHitMs') as number) ?? -9999) < 500) return;
    hazard.setData('lastHitMs', now);

    // Damage player
    const playerHealth = player.getData('health') || 100;
    player.setData('health', playerHealth - 20);

    // Play sound
    this.gameManager.playAudio({
      wave: 'square',
      freq_start: 150,
      decay: 0.1,
      duration: 0.15,
    });

    // Check if player died
    if (player.getData('health') <= 0) {
      this.handleGameOver(false);
    }
  }

  private handlePlayerPickupCollision(
    player: Phaser.GameObjects.Sprite,
    pickup: Phaser.GameObjects.Sprite
  ): void {
    // Remove pickup
    void player;
    pickup.destroy();
    this.pickups = this.pickups.filter(p => p !== pickup);

    // Play sound
    this.gameManager.playAudio({
      wave: 'sine',
      freq_start: 800,
      decay: 0.1,
      duration: 0.1,
    });
  }

  private handlePlayerGoalCollision(
    player: Phaser.GameObjects.Sprite,
    goal: Phaser.GameObjects.Sprite
  ): void {
    void goal;

    // Check win condition
    if (this.gameConfig?.winCondition === 'ReachGoal') {
      this.handleGameOver(true);
      return;
    }
    void player;

    // Play sound
    this.gameManager.playAudio({
      wave: 'sine',
      freq_start: 600,
      decay: 0.2,
      duration: 0.3,
    });
  }

  private handleBulletEnemyCollision(
    bullet: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite
  ): void {
    this.killEnemy(enemy);
    this.bullets = this.bullets.filter(b => b !== bullet);
    bullet.destroy();
    this.gameManager.playAudio({
      wave: 'square',
      freq_start: 300,
      decay: 0.15,
      duration: 0.12,
    });
  }

  private killEnemy(enemy: Phaser.GameObjects.Sprite): void {
    enemy.destroy();
    this.enemies = this.enemies.filter(e => e !== enemy);
  }

  // ============================================================================
  // Win / loss
  // ============================================================================

  /**
   * Setup win/loss conditions
   */
  private setupWinLossConditions(): void {
    // SurviveWaves: win when the survive timer expires
    if (
      this.gameConfig?.winCondition === 'SurviveWaves' &&
      this.gameConfig.mechanics_config?.survive_time_sec
    ) {
      this.time.delayedCall(
        this.gameConfig.mechanics_config.survive_time_sec * 1000,
        () => {
          if (!this.gameWon && !this.gameLost) this.handleGameOver(true);
        }
      );
    }

    // Check for win/loss on update
    this.events.on(Phaser.Scenes.Events.UPDATE, this.checkWinLossConditions, this);
  }

  /**
   * Check win/loss conditions
   */
  private checkWinLossConditions(): void {
    if (this.gameWon || this.gameLost || this.isPaused) return;

    // Check win conditions
    if (this.gameConfig?.winCondition === 'ReachGoal') {
      // Already handled in collision
    } else if (this.gameConfig?.winCondition === 'DefeatEnemies') {
      if (
        this.initialEnemyCount > 0 &&
        this.enemies.length === 0 &&
        (this.gameConfig.level_data?.wave_spawners?.length ?? 0) === 0
      ) {
        this.handleGameOver(true);
      }
    } else if (this.gameConfig?.winCondition === 'CollectItems') {
      if (this.initialPickupCount > 0 && this.pickups.length === 0) {
        this.handleGameOver(true);
      }
    }

    // Check loss conditions
    for (const player of this.players.values()) {
      if ((player.getData('health') as number) <= 0) {
        this.handleGameOver(false);
        break;
      }
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(won: boolean): void {
    if (this.gameWon || this.gameLost) return;
    this.gameWon = won;
    this.gameLost = !won;
    this.isPaused = true;

    // Pause physics
    this.arcadePhysics.pause();

    // Notify the React shell so the in-page overlay shows up
    this.game.events.emit('playtest:game-over', won);

    // Show in-scene game over overlay
    this.add.rectangle(
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
        color: won ? '#00ff00' : '#ff0000',
        align: 'center',
      }
    ).setOrigin(0.5);
    void resultText;

    const replayButton = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'Replay',
      {
        font: '24px Arial',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);

    replayButton.setInteractive();
    replayButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  // ============================================================================
  // Debug overlays
  // ============================================================================

  /**
   * Setup debug overlays (fixed to the camera so they follow scrolling)
   */
  private setupDebug(): void {
    // FPS counter
    this.fpsText = this.add.text(10, 10, '', {
      font: '12px Arial',
      color: '#00ff00',
    });
    this.fpsText.setScrollFactor(0);

    // Entity count
    this.entityCountText = this.add.text(10, 25, '', {
      font: '12px Arial',
      color: '#00ff00',
    });
    this.entityCountText.setScrollFactor(0);

    // Debug info
    this.debugText = this.add.text(10, 40, '', {
      font: '12px Arial',
      color: '#00ff00',
    });
    this.debugText.setScrollFactor(0);
  }

  /**
   * Update debug overlays
   */
  private updateDebug(): void {
    if (this.fpsText) {
      this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    }

    if (this.entityCountText) {
      this.entityCountText.setText(`Entities: ${this.getStats().entities}`);
    }

    if (this.debugText) {
      const player = this.players.get('player_1');
      if (player) {
        const body = player.getData('body') as Phaser.Physics.Arcade.Body;
        this.debugText.setText(
          `Player: (${Math.round(player.x)}, ${Math.round(player.y)})` +
          ` | HP: ${player.getData('health')}` +
          ` | Velocity: (${Math.round(body?.velocity.x || 0)}, ${Math.round(body?.velocity.y || 0)})`
        );
      }
    }
  }

  // ============================================================================
  // Weapons
  // ============================================================================

  /**
   * Fire the declared weapon (SpawnProjectile) or swing a melee arc (Melee).
   */
  private handleWeaponFire(player: Phaser.GameObjects.Sprite): void {
    const weapon = this.gameConfig?.mechanics_config?.weapon_config;
    if (!weapon || weapon.attack_type === 'None') return;

    // Respect the declared fire rate
    const cooldownMs = weapon.fire_rate_sec * 1000;
    if (this.time.now - this.lastFireTime < cooldownMs) return;
    this.lastFireTime = this.time.now;

    if (weapon.attack_type === 'Melee') {
      const reach = 48;
      const hitEnemies = this.enemies.filter(
        (enemy) =>
          Math.abs(enemy.x - player.x) < reach &&
          Math.abs(enemy.y - player.y) < reach
      );
      for (const enemy of hitEnemies) this.killEnemy(enemy);
      if (hitEnemies.length > 0) {
        this.gameManager.playAudio({
          wave: 'sine',
          freq_start: 400,
          decay: 0.05,
          duration: 0.05,
        });
      }
      return;
    }

    // SpawnProjectile
    const bulletSpriteId = weapon.bullet_sprite_id ?? null;
    const sprites = this.gameConfig?.sprites ?? [];
    const bulletTemplate = bulletSpriteId
      ? sprites.find((s) => s.id === bulletSpriteId)
      : undefined;
    const bulletArtAvailable =
      bulletTemplate && this.getFirstFrameUrl(bulletTemplate) !== null;
    const textureKey = bulletArtAvailable ? bulletTemplate!.id : '__bullet';

    const bullet = this.gameManager.createSpriteWithFallback(
      this,
      player.x + this.playerFacing * 16,
      player.y,
      textureKey
    );
    if (bulletArtAvailable && bulletTemplate) {
      bullet.setDisplaySize(
        Math.max(8, bulletTemplate.resolution / 2),
        Math.max(8, bulletTemplate.resolution / 2)
      );
    } else {
      bullet.setDisplaySize(12, 6);
    }

    this.physics.add.existing(bullet);
    const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
    bulletBody.setAllowGravity(false);
    bulletBody.setVelocityX(this.playerFacing * 350);
    bullet.setFlipX(this.playerFacing < 0);

    this.bullets.push(bullet);

    // Recycle after flight time
    this.time.delayedCall(1500, () => {
      this.bullets = this.bullets.filter(b => b !== bullet);
      if (bullet.active) bullet.destroy();
    });

    // Recoil push-back on the player
    if (weapon.recoil_x !== 0) {
      const playerBody = player.body as Phaser.Physics.Arcade.Body | null;
      playerBody?.setVelocityX(
        -this.playerFacing * Math.abs(weapon.recoil_x) * 0.2
      );
    }

    this.gameManager.playAudio({
      wave: 'square',
      freq_start: 700,
      decay: 0.08,
      duration: 0.08,
    });
  }

  /**
   * Handle player action (weapon fire / secondary ability)
   */
  private handlePlayerAction(
    player: Phaser.GameObjects.Sprite,
    action: string
  ): void {
    switch (action) {
      case 'action1':
        this.handleWeaponFire(player);
        break;
      case 'action2':
        this.handleWeaponFire(player);
        break;
      default:
        break;
    }
  }

  // ============================================================================
  // Per-frame updates
  // ============================================================================

  /**
   * Minimal declarative AI: patrols drift, chasers pursue the nearest player,
   * hoverers bob in place. PathFollower falls back to Patrol (no waypoint
   * editor yet); Turret holds position.
   */
  private updateEnemyAI(): void {
    for (const enemy of this.enemies) {
      const ai = enemy.getData('ai') as
        | { movement?: string; move_speed?: number }
        | null;
      if (!ai) continue;
      const speed = ai.move_speed ?? 100;
      const body = enemy.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;

      if (ai.movement === 'Patrol' || ai.movement === 'PathFollower') {
        const spawnX = (enemy.getData('spawnX') as number) ?? enemy.x;
        const direction = (enemy.getData('patrolDirection') as number) ?? 1;
        body.setVelocityX(direction * speed);
        if (body.blocked.left) {
          enemy.setData('patrolDirection', 1);
        } else if (body.blocked.right) {
          enemy.setData('patrolDirection', -1);
        } else if (
          (enemy.x > spawnX + 48 && direction > 0) ||
          (enemy.x < spawnX - 48 && direction < 0)
        ) {
          enemy.setData('patrolDirection', -direction);
        }
      } else if (ai.movement === 'DirectChase') {
        const target = this.nearestPlayer(enemy.x);
        if (target) {
          body.setVelocityX(Math.sign(target.x - enemy.x) * speed);
        }
      } else if (ai.movement === 'FlyAndHover') {
        const target = this.nearestPlayer(enemy.x);
        if (target) {
          body.setVelocityX(Math.sign(target.x - enemy.x) * speed * 0.25);
        }
        body.setVelocityY(Math.sin(this.time.now / 400) * 30);
      }
      // Turret: holds position (ranged/proximity enemy attacks are a
      // follow-up; contact damage already works through overlap).
    }
  }

  private nearestPlayer(x: number): Phaser.GameObjects.Sprite | null {
    let nearest: Phaser.GameObjects.Sprite | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const player of this.players.values()) {
      const distance = Math.abs(player.x - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = player;
      }
    }
    return nearest;
  }

  /**
   * Handle player input, using the declared Player 1 physics rules.
   */
  private handlePlayerInput(): void {
    const player1 = this.players.get('player_1');
    if (!player1) return;

    const body = player1.body as Phaser.Physics.Arcade.Body;
    const speed =
      this.gameConfig?.mechanics_config?.player_1_config?.move_speed ?? 200;
    const jumpForce =
      this.gameConfig?.mechanics_config?.player_1_config?.jump_force ?? 420;

    // Track facing for weapon direction
    let moveX = 0;
    if (this.cursors?.left.isDown || this.keyA?.isDown) moveX = -1;
    else if (this.cursors?.right.isDown || this.keyD?.isDown) moveX = 1;
    if (moveX !== 0) this.playerFacing = moveX as 1 | -1;

    // Movement
    body.setVelocityX(moveX * speed);

    if (this.cursors?.up.isDown || this.keyW?.isDown) {
      body.setVelocityY(-speed);
    } else if (this.cursors?.down.isDown || this.keyS?.isDown) {
      body.setVelocityY(speed);
    }

    // Handle actions
    if (this.keyF && Phaser.Input.Keyboard.JustDown(this.keyF)) {
      this.handlePlayerAction(player1, 'action1');
    }

    if (this.keyG && Phaser.Input.Keyboard.JustDown(this.keyG)) {
      this.handlePlayerAction(player1, 'action2');
    }

    if (this.keySpace && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      // Jump
      if (body.onFloor()) {
        body.setVelocityY(-jumpForce);
        this.gameManager.playAudio({
          wave: 'sine',
          freq_start: 300,
          freq_end: 500,
          decay: 0.15,
          duration: 0.15,
        });
      }
    }
  }

  update(time: number, delta: number): void {
    void time;
    void delta;
    if (this.isPaused) return;

    // Handle player input
    this.handlePlayerInput();

    // Run enemy AI
    this.updateEnemyAI();

    // Update debug overlays
    this.updateDebug();
  }
}
