import { z } from "zod";

// ============================================================================
// Entity Role Types
// ============================================================================
const EntityRole = z.enum([
  "player_1",
  "player_2", 
  "enemy",
  "hazard",
  "pickup",
  "goal",
  "tile"
]);

type EntityRole = z.infer<typeof EntityRole>;

// ============================================================================
// Hitbox Schema
// ============================================================================
const HitboxShape = z.enum(["rectangle", "circle"]);

type HitboxShape = z.infer<typeof HitboxShape>;

const RectangleHitboxSchema = z.object({
  type: z.enum(["hurtbox", "hitbox", "terrain"]),
  shape: z.literal("rectangle"),
  offset_x: z.number().int().min(0),
  offset_y: z.number().int().min(0),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
});

const CircleHitboxSchema = z.object({
  type: z.enum(["hurtbox", "hitbox", "terrain"]),
  shape: z.literal("circle"),
  offset_x: z.number().int().min(0),
  offset_y: z.number().int().min(0),
  radius: z.number().int().min(1),
});

const HitboxSchema = z.discriminatedUnion("shape", [
  RectangleHitboxSchema,
  CircleHitboxSchema
]);

type Hitbox = z.infer<typeof HitboxSchema>;

// ============================================================================
// Frame State Keys
// ============================================================================
const FrameStateKey = z.enum(["idle", "run", "jump", "action"]);

type FrameStateKey = z.infer<typeof FrameStateKey>;

// ============================================================================
// Sprite Schema
// ============================================================================
const Resolution = z.union([z.literal(16), z.literal(32), z.literal(64)]);

type Resolution = z.infer<typeof Resolution>;

const SpriteFramesSchema = z.record(
  FrameStateKey,
  z.array(z.string().url("Frame URLs must be valid HTTPS URLs"))
);

const AISchema = z.object({
  movement: z.enum([
    "Patrol",
    "DirectChase", 
    "Turret",
    "FlyAndHover",
    "PathFollower"
  ]),
  target: z.enum([
    "Player1",
    "Player2", 
    "NearestPlayer"
  ]),
  attack_style: z.enum([
    "ContactDamage",
    "RangedProjectile",
    "ProximityBlast"
  ]),
  move_speed: z.number().min(0).max(1000),
  currency_drop_value: z.number().int().min(0),
});

const SpriteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  role: EntityRole,
  resolution: Resolution,
  frames: SpriteFramesSchema,
  hitboxes: z.array(HitboxSchema).min(1, "Each sprite must have at least one hitbox"),
  ai_config: AISchema.optional(),
  thumbnail_url: z.string().url().optional(),
});

type Sprite = z.infer<typeof SpriteSchema>;

// ============================================================================
// Wave Spawner Schema
// ============================================================================
const WaveSpawnerSchema = z.object({
  enemy_id: z.string().min(1),
  spawn_interval_sec: z.number().min(0.1).max(60),
  total_count: z.number().int().min(1).max(1000),
  path_waypoints: z.array(z.object({
    x: z.number().int(),
    y: z.number().int(),
  })).optional(),
});

type WaveSpawner = z.infer<typeof WaveSpawnerSchema>;

// ============================================================================
// Level Data Schema
// ============================================================================
const TileType = z.number().int().min(0);

type TileType = z.infer<typeof TileType>;

const LevelDataSchema = z.object({
  grid_width: z.number().int().min(1).max(64),
  grid_height: z.number().int().min(1).max(64),
  tile_size: z.number().int().min(16).max(64).default(16),
  tilemap: z.array(z.array(TileType)),
  wave_spawners: z.array(WaveSpawnerSchema).optional().default([]),
  player_spawn_points: z.array(z.object({
    x: z.number().int(),
    y: z.number().int(),
    player_role: z.enum(["player_1", "player_2"]),
  })).optional().default([]),
  goal_positions: z.array(z.object({
    x: z.number().int(),
    y: z.number().int(),
  })).optional().default([]),
});

type LevelData = z.infer<typeof LevelDataSchema>;

// ============================================================================
// Mechanics Config Schema
// ============================================================================
const PlayerConfigSchema = z.object({
  gravity_y: z.number().min(0).max(2000).default(800),
  move_speed: z.number().min(0).max(1000).default(200),
  jump_force: z.number().min(0).max(1000).default(420),
  max_health: z.number().int().min(1).max(100).default(5),
  wall_slide_enabled: z.boolean().default(false),
  wall_slide_drag: z.number().min(0).max(1000).optional(),
});

type PlayerConfig = z.infer<typeof PlayerConfigSchema>;

const WinCondition = z.enum([
  "ReachGoal",
  "DefeatEnemies",
  "ScoreTarget",
  "SurviveWaves",
  "BossDefeat",
  "CollectItems"
]);

type WinCondition = z.infer<typeof WinCondition>;

const MechanicsConfigSchema = z.object({
  player_1_config: PlayerConfigSchema.default({}),
  player_2_config: PlayerConfigSchema.optional(),
  win_condition: WinCondition.default("ReachGoal"),
  score_target: z.number().int().min(1).optional(),
  survive_time_sec: z.number().int().min(1).optional(),
});

type MechanicsConfig = z.infer<typeof MechanicsConfigSchema>;

// ============================================================================
// Economy Config Schema
// ============================================================================
const EconomyConfigSchema = z.object({
  starting_currency: z.number().int().min(0).max(10000).default(100),
  currency_name: z.string().min(1).max(20).default("Gold"),
  currency_per_click: z.number().int().min(0).max(100).default(1),
  currency_per_kill: z.number().int().min(0).max(1000).default(15),
  passive_income_rate_sec: z.number().min(0).max(100).default(0),
  upgrade_cost_multiplier: z.number().min(1).max(2).default(1.15),
  turret_build_cost: z.number().int().min(0).max(1000).default(50),
  max_currency: z.number().int().min(1).max(1000000).optional(),
});

type EconomyConfig = z.infer<typeof EconomyConfigSchema>;

// ============================================================================
// Audio Config Schema
// ============================================================================
const WaveType = z.enum(["sine", "square", "sawtooth", "triangle", "noise"]);

type WaveType = z.infer<typeof WaveType>;

const AudioEffectSchema = z.object({
  wave: WaveType.default("square"),
  freq_start: z.number().min(20).max(2000).default(220),
  freq_end: z.number().min(20).max(2000).optional(),
  decay: z.number().min(0).max(1).default(0.15),
  duration: z.number().min(0.01).max(2).default(0.2),
  volume: z.number().min(0).max(1).default(0.5),
});

type AudioEffect = z.infer<typeof AudioEffectSchema>;

const AudioConfigSchema = z.object({
  jump_sfx: AudioEffectSchema.optional(),
  hit_sfx: AudioEffectSchema.optional(),
  shoot_sfx: AudioEffectSchema.optional(),
  collect_sfx: AudioEffectSchema.optional(),
  death_sfx: AudioEffectSchema.optional(),
  win_sfx: AudioEffectSchema.optional(),
  lose_sfx: AudioEffectSchema.optional(),
  background_music: z.string().url().optional(),
});

type AudioConfig = z.infer<typeof AudioConfigSchema>;

// ============================================================================
// Project Data Schema (Complete)
// ============================================================================
const ProjectDataSchema = z.object({
  sprites: z.array(SpriteSchema).min(1, "Project must have at least one sprite"),
  level_data: LevelDataSchema,
  mechanics_config: MechanicsConfigSchema,
  economy_config: EconomyConfigSchema.optional().default({}),
  audio_config: AudioConfigSchema.optional().default({}),
  version: z.string().default("1.0.0"),
});

type ProjectData = z.infer<typeof ProjectDataSchema>;

// ============================================================================
// Genre Types
// ============================================================================
const Genre = z.enum([
  "Platformer",
  "Shooter",
  "DungeonCrawler",
  "Brawler",
  "TowerDefense",
  "Idle",
  "Stealth",
  "BossRush"
]);

type Genre = z.infer<typeof Genre>;

// ============================================================================
// Project Schema (Database Row)
// ============================================================================
const ProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  genre: Genre,
  author_id: z.string().uuid(),
  is_published: z.boolean().default(false),
  is_template: z.boolean().default(false),
  remixed_from_id: z.string().uuid().nullable().optional(),
  play_count: z.number().int().min(0).default(0),
  like_count: z.number().int().min(0).default(0),
  thumbnail_url: z.string().url().optional(),
  project_data: ProjectDataSchema,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

type Project = z.infer<typeof ProjectSchema>;

// Schema for creating a new project (without server-generated fields)
const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  play_count: true,
  like_count: true,
  created_at: true,
  updated_at: true,
}).partial({
  remixed_from_id: true,
  thumbnail_url: true,
  is_published: true,
  is_template: true,
});

type CreateProject = z.infer<typeof CreateProjectSchema>;

// Schema for updating a project
const UpdateProjectSchema = ProjectSchema.partial().omit({
  id: true,
  author_id: true,
  created_at: true,
});

type UpdateProject = z.infer<typeof UpdateProjectSchema>;

// ============================================================================
// Profile Schema
// ============================================================================
const ProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(50),
  avatar_url: z.string().url().optional(),
  created_at: z.string().datetime().optional(),
});

type Profile = z.infer<typeof ProfileSchema>;

// ============================================================================
// Exports
// ============================================================================
export {
  // Enums
  EntityRole,
  HitboxShape,
  FrameStateKey,
  Resolution,
  TileType,
  WinCondition,
  WaveType,
  Genre,
  
  // Schemas
  HitboxSchema,
  RectangleHitboxSchema,
  CircleHitboxSchema,
  SpriteSchema,
  SpriteFramesSchema,
  AISchema,
  WaveSpawnerSchema,
  LevelDataSchema,
  PlayerConfigSchema,
  MechanicsConfigSchema,
  EconomyConfigSchema,
  AudioEffectSchema,
  AudioConfigSchema,
  ProjectDataSchema,
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProfileSchema,
  
  // Types
  type Hitbox,
  type Sprite,
  type WaveSpawner,
  type LevelData,
  type PlayerConfig,
  type MechanicsConfig,
  type EconomyConfig,
  type AudioEffect,
  type AudioConfig,
  type ProjectData,
  type Project,
  type CreateProject,
  type UpdateProject,
  type Profile,
  type EntityRole as EntityRoleType,
  type HitboxShape as HitboxShapeType,
  type FrameStateKey as FrameStateKeyType,
  type Resolution as ResolutionType,
  type TileType as TileTypeType,
  type WinCondition as WinConditionType,
  type WaveType as WaveTypeType,
  type Genre as GenreType,
};
