// Re-export all types from schemas
export * from '@/schemas/projectSchemas';

// Additional types for the application

export type ViewRoute = 
  | '/' 
  | '/explore' 
  | '/play/:id' 
  | '/studio/art' 
  | '/studio/rules';

export type ViewId = 'hub' | 'explore' | 'play' | 'art' | 'rules';

// Navigation types
export type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  requiresAuth?: boolean;
};

// Modal types
export type ModalType = 'auth' | 'save' | 'remix' | 'confirm' | null;

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastMessage = {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
};

// Entity types for the Sprite Backpack
export type EntityType = 
  | 'player_1' 
  | 'player_2' 
  | 'enemy' 
  | 'hazard' 
  | 'pickup' 
  | 'goal' 
  | 'tile';

// Resolution types
export type SpriteResolution = 16 | 32 | 64;

// Animation state types
export type AnimationState = 'idle' | 'run' | 'jump' | 'action';

// Game state types
export type GameStateStatus = 'playing' | 'paused' | 'won' | 'lost' | 'loading';

// Win condition types
export type WinConditionType = 
  | 'ReachGoal' 
  | 'DefeatEnemies' 
  | 'ScoreTarget' 
  | 'SurviveWaves' 
  | 'BossDefeat' 
  | 'CollectItems';

// Movement profile types
export type MovementProfile = 
  | 'Patrol' 
  | 'DirectChase' 
  | 'Turret' 
  | 'FlyAndHover' 
  | 'PathFollower';

// Target rule types
export type TargetRule = 'Player1' | 'Player2' | 'NearestPlayer';

// Attack style types
export type AttackStyle = 
  | 'ContactDamage' 
  | 'RangedProjectile' 
  | 'ProximityBlast';

// Genre types
export type GameGenre = 
  | 'Platformer' 
  | 'Shooter' 
  | 'DungeonCrawler' 
  | 'Brawler' 
  | 'TowerDefense' 
  | 'Idle' 
  | 'Stealth' 
  | 'BossRush';

// Hitbox shape types
export type HitboxShapeType = 'rectangle' | 'circle';

// Hitbox type types
export type HitboxType = 'hurtbox' | 'hitbox' | 'terrain';

// Audio wave types
export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

// Keyboard binding types
export type KeyboardBindings = {
  moveUp: string[];
  moveDown: string[];
  moveLeft: string[];
  moveRight: string[];
  jump: string[];
  primaryAction: string[];
  secondaryAction: string[];
};

// Player input types
export type PlayerInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  primary: boolean;
  secondary: boolean;
};

// Camera types
export type CameraConfig = {
  zoom: number;
  followTarget: boolean;
  deadzone: { x: number; y: number };
  bounds: { x: number; y: number; width: number; height: number } | null;
};

// Performance monitoring types
export type PerformanceMetrics = {
  fps: number;
  entityCount: number;
  memoryUsage: number;
  lastUpdate: number;
};

// Search filter types
export type SearchFilters = {
  genre?: GameGenre[];
  sortBy?: 'plays' | 'likes' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
  authorId?: string;
  isTemplate?: boolean;
};

// Pagination types
export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// API response types
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  message?: string;
};

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
