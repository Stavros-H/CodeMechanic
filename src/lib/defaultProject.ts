import { CreateProject, ProjectData } from '@/schemas/projectSchemas';

export function createDefaultProjectData(): ProjectData {
  return {
    sprites: [],
    level_data: {
      grid_width: 32,
      grid_height: 32,
      tile_size: 16,
      tilemap: [],
      wave_spawners: [],
      player_spawn_points: [],
      goal_positions: [],
      sprite_placements: [],
    },
    mechanics_config: {
      player_1_config: {
        gravity_y: 800,
        move_speed: 200,
        jump_force: 420,
        max_health: 5,
        wall_slide_enabled: false,
      },
      win_condition: 'ReachGoal',
    },
    economy_config: {
      starting_currency: 100,
      currency_name: 'Gold',
      currency_per_click: 1,
      currency_per_kill: 15,
      passive_income_rate_sec: 0,
      upgrade_cost_multiplier: 1.15,
      turret_build_cost: 50,
    },
    audio_config: {},
    version: '1.0.0',
  };
}

export function createDefaultProject(
  authorId: string | null,
  overrides?: Partial<Pick<CreateProject, 'title' | 'description' | 'genre'>>
): CreateProject {
  return {
    title: 'Untitled Project',
    description: '',
    genre: 'Platformer',
    author_id: authorId,
    is_published: false,
    is_template: false,
    project_data: createDefaultProjectData(),
    ...overrides,
  };
}
