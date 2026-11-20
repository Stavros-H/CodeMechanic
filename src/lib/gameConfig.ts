// ============================================================================
// ProjectData -> GameConfig adapter
//
// The Phaser engine consumes the transitional GameConfig shape (tiles /
// entities / level size / gravity / win condition). Saved projects persist
// the declarative ProjectData model, so this module bridges the two without
// letting the scene know about Zod schemas.
// ============================================================================

import {
  Hitbox,
  LevelData,
  ProjectData,
  Sprite,
} from '@/schemas/projectSchemas';
import type { EntityConfig, GameConfig, HitboxConfig } from '@/types';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const TILE_EMPTY = 0;
const TILE_GROUND = 1;
const TILE_SPIKE = 2;

/** Display scale for sprites whose art is resolution x resolution pixels. */
const ENTITY_DISPLAY_SCALE = 2;

const ROLE_COLORS: Record<string, number> = {
  player_1: 0x3b82f6,
  player_2: 0xec4899,
  enemy: 0xef4444,
  hazard: 0xf97316,
  pickup: 0xfacc15,
  goal: 0x22c55e,
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Pick the first frame (data URL) available on a sprite, idle first. */
export function getSpriteFirstFrame(sprite: Sprite): string | null {
  const frames = sprite.frames ?? {};
  return (
    frames.idle?.[0] ??
    frames.run?.[0] ??
    frames.jump?.[0] ??
    frames.action?.[0] ??
    null
  );
}

/** Convert a schema hitbox (art-pixel space) into engine HitboxConfig space. */
function toHitboxConfig(hitbox: Hitbox, scale: number): HitboxConfig {
  const base: HitboxConfig = {
    shape: hitbox.shape,
    offsetX: hitbox.offset_x * scale,
    offsetY: hitbox.offset_y * scale,
    allowGravity: false,
    immovable: false,
    collideWorldBounds: false,
  };
  if (hitbox.shape === 'rectangle') {
    base.width = hitbox.width * scale;
    base.height = hitbox.height * scale;
  } else {
    base.radius = hitbox.radius * scale;
  }
  return base;
}

function firstHitbox(sprite: Sprite, scale: number): HitboxConfig | undefined {
  const hitboxes = sprite.hitboxes ?? [];
  if (hitboxes.length === 0) return undefined;
  const rectangle =
    hitboxes.find((hb) => hb.shape === 'rectangle') ?? hitboxes[0];
  return toHitboxConfig(rectangle, scale);
}

// ----------------------------------------------------------------------------
// Adapter
// ----------------------------------------------------------------------------

export function projectDataToGameConfig(projectData: ProjectData): GameConfig {
  const level: LevelData = projectData.level_data;
  const tileSize = level.tile_size ?? 16;
  const tilemap = level.tilemap ?? [];
  const sprites: Sprite[] = projectData.sprites ?? [];
  const spriteById = new Map(sprites.map((sprite) => [sprite.id, sprite]));

  const gridWidth = level.grid_width ?? 32;
  const gridHeight = level.grid_height ?? 32;
  const levelHeight = gridHeight * tileSize;

  const tiles: EntityConfig[] = [];
  const entities: EntityConfig[] = [];
  const enemies: EntityConfig[] = [];

  const spriteForTexture = (sprite: Sprite | undefined): string | undefined =>
    sprite && getSpriteFirstFrame(sprite) ? sprite.id : undefined;

  // ---- Tiles ----------------------------------------------------------------
  // 1 = ground (solid tile), 2 = spike (immovable hazard entity, non-solid).
  for (let y = 0; y < tilemap.length && y < gridHeight; y++) {
    for (let x = 0; x < tilemap[y].length && x < gridWidth; x++) {
      const tile = tilemap[y][x] ?? TILE_EMPTY;
      if (tile === TILE_EMPTY) continue;

      if (tile === TILE_GROUND) {
        tiles.push({
          role: 'tile',
          x: x * tileSize + tileSize / 2,
          y: y * tileSize + tileSize / 2,
          width: tileSize,
          height: tileSize,
          solid: true,
          hitbox: {
            shape: 'rectangle',
            width: tileSize,
            height: tileSize,
            allowGravity: false,
            immovable: true,
            collideWorldBounds: false,
          },
        });
      } else if (tile === TILE_SPIKE) {
        entities.push({
          role: 'hazard',
          x: x * tileSize + tileSize / 2,
          y: y * tileSize + tileSize / 2,
          texture: undefined,
          width: tileSize,
          height: tileSize,
          hitbox: {
            shape: 'rectangle',
            width: tileSize,
            height: tileSize,
            allowGravity: false,
            immovable: true,
            collideWorldBounds: false,
          },
        });
      }
    }
  }

  // ---- Players (from spawn point markers) ------------------------------------
  for (const spawn of level.player_spawn_points ?? []) {
    const playerSprite = sprites.find((s) => s.role === spawn.player_role);
    const resolution = playerSprite?.resolution ?? 32;
    const maxHealth = Math.floor(
      (spawn.player_role === 'player_1'
        ? projectData.mechanics_config?.player_1_config?.max_health
        : projectData.mechanics_config?.player_2_config?.max_health) ?? 5
    );
    entities.push({
      role: spawn.player_role,
      x: spawn.x * tileSize + tileSize / 2,
      y: spawn.y * tileSize + tileSize / 2,
      width: resolution * ENTITY_DISPLAY_SCALE,
      height: resolution * ENTITY_DISPLAY_SCALE,
      texture: spriteForTexture(playerSprite),
      // Damage model in the scene works in tens; each health heart is 20 HP.
      health: Math.max(1, maxHealth) * 20,
      solid: false,
      hitbox: playerSprite
        ? toHitboxConfig(
            playerSprite.hitboxes?.find((hb) => hb.shape === 'rectangle') ??
              playerSprite.hitboxes?.[0] ?? {
                type: 'hurtbox',
                shape: 'rectangle',
                offset_x: 0,
                offset_y: 0,
                width: playerSprite.resolution,
                height: playerSprite.resolution,
              },
            ENTITY_DISPLAY_SCALE
          )
        : undefined,
    });
  }

  // ---- Placed sprites (enemies / pickups / hazards / goals) ------------------
  for (const placement of level.sprite_placements ?? []) {
    const sprite = spriteById.get(placement.sprite_id);
    if (!sprite) continue;
    const resolution = sprite.resolution;
    const config: EntityConfig = {
      role: sprite.role,
      x: placement.x * tileSize + tileSize / 2,
      y: placement.y * tileSize + tileSize / 2,
      width: resolution * ENTITY_DISPLAY_SCALE,
      height: resolution * ENTITY_DISPLAY_SCALE,
      texture: spriteForTexture(sprite),
    };
    const hitbox = firstHitbox(sprite, ENTITY_DISPLAY_SCALE);
    if (hitbox) config.hitbox = hitbox;
    if (sprite.ai_config) config.ai = sprite.ai_config;
    entities.push(config);
    if (sprite.role === 'enemy') {
      enemies.push(config);
    }
  }

  const gravity =
    projectData.mechanics_config?.player_1_config?.gravity_y ?? 800;

  return {
    ...projectData,
    levelWidth: gridWidth * tileSize,
    levelHeight,
    gravity,
    winCondition: projectData.mechanics_config?.win_condition ?? 'ReachGoal',
    tiles,
    entities,
    enemies,
    debug: false,
  };
}

/** Colors used to tint fallback textures per role (kept in sync with the scene). */
export const FALLBACK_ROLE_COLORS = ROLE_COLORS;
