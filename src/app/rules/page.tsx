'use client';

// ============================================================================
// Phase 5 — View 5: Mechanics & Rule Configurator
// Declarative cards for Physics & Movement, Action & Weapon Abilities,
// Win/Loss conditions, Composable Enemy AI, and Economy.
// All edits persist through updateMechanicsConfig / updateEconomyConfig /
// updateSprite so the Save action in the studio chrome persists them.
// ============================================================================

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';
import StudioChrome from '@/components/StudioChrome/StudioChrome';
import { EntityRole, Sprite } from '@/schemas/projectSchemas';

// ============================================================================
// Types & Constants
// ============================================================================

type RuleTab = 'physics' | 'ai' | 'economy';

type PlayerConfigValues = {
  gravity_y: number;
  move_speed: number;
  jump_force: number;
  max_health: number;
  wall_slide_enabled: boolean;
  wall_slide_drag?: number;
};

const DEFAULT_PLAYER_CONFIG: PlayerConfigValues = {
  gravity_y: 800,
  move_speed: 200,
  jump_force: 420,
  max_health: 5,
  wall_slide_enabled: false,
};

type WeaponValues = {
  attack_type: 'None' | 'Melee' | 'SpawnProjectile';
  fire_rate_sec: number;
  recoil_x: number;
  bullet_sprite_id: string | null;
};

const DEFAULT_WEAPON_CONFIG: WeaponValues = {
  attack_type: 'None',
  fire_rate_sec: 0.25,
  recoil_x: 0,
  bullet_sprite_id: null,
};

const WIN_CONDITIONS: { value: string; label: string }[] = [
  { value: 'ReachGoal', label: 'Reach the Goal' },
  { value: 'DefeatEnemies', label: 'Defeat All Enemies' },
  { value: 'ScoreTarget', label: 'Reach a Score Target' },
  { value: 'SurviveWaves', label: 'Survive the Waves' },
  { value: 'BossDefeat', label: 'Defeat the Boss' },
  { value: 'CollectItems', label: 'Collect All Items' },
];

type RuleOption = { value: string; label: string; hint?: string };

const MOVEMENT_OPTIONS: RuleOption[] = [
  { value: 'Patrol', label: 'Patrol', hint: 'Walks back and forth' },
  { value: 'DirectChase', label: 'Direct Chase', hint: 'Charges at the target' },
  { value: 'Turret', label: 'Turret', hint: 'Stays put and attacks' },
  { value: 'FlyAndHover', label: 'Fly & Hover', hint: 'Floats above the ground' },
  { value: 'PathFollower', label: 'Path Follower', hint: 'Follows waypoints' },
];

const TARGET_OPTIONS: RuleOption[] = [
  { value: 'Player1', label: 'Player 1' },
  { value: 'Player2', label: 'Player 2' },
  { value: 'NearestPlayer', label: 'Nearest Player' },
];

const ATTACK_OPTIONS: RuleOption[] = [
  { value: 'ContactDamage', label: 'Contact Damage', hint: 'Hurts on touch' },
  { value: 'RangedProjectile', label: 'Ranged Projectile', hint: 'Shoots at range' },
  { value: 'ProximityBlast', label: 'Proximity Blast', hint: 'Explodes up close' },
];

type AIGroupKey = 'movement' | 'target' | 'attack_style';

const AI_GROUP_META: Record<
  AIGroupKey,
  { title: string; icon: string; field: keyof AIConfigValues }
> = {
  movement: { title: 'Movement Layer', icon: '🏃', field: 'movement' },
  target: { title: 'Targeting Rule', icon: '🎯', field: 'target' },
  attack_style: { title: 'Attack Style', icon: '⚔️', field: 'attack_style' },
};

type AIConfigValues = {
  movement: string;
  target: string;
  attack_style: string;
  move_speed: number;
  currency_drop_value: number;
};

const DEFAULT_AI_CONFIG: AIConfigValues = {
  movement: 'Patrol',
  target: 'NearestPlayer',
  attack_style: 'ContactDamage',
  move_speed: 100,
  currency_drop_value: 5,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getRoleIcon(role: EntityRole): string {
  switch (role) {
    case 'player_1': return '👤';
    case 'player_2': return '👥';
    case 'enemy': return '👹';
    case 'hazard': return '⚠️';
    case 'pickup': return '✨';
    case 'goal': return '🏆';
    case 'tile': return '⬛';
  }
}

function getSpriteIcon(sprite: Sprite): string {
  return getRoleIcon(sprite.role);
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// ============================================================================
// Component
// ============================================================================

export default function MechanicsRuleConfigurator() {
  const currentProject = useGameStore((state) => state.currentProject);
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  const updateMechanicsConfig = useGameStore(
    (state) => state.updateMechanicsConfig
  );
  const updateEconomyConfig = useGameStore(
    (state) => state.updateEconomyConfig
  );
  const updateSprite = useGameStore((state) => state.updateSprite);
  const activeEntityId = useGameStore((state) => state.activeEntityId);
  const { navigateTo } = useGuardedNavigation();

  useEffect(() => {
    setActiveTab('rules');
  }, [setActiveTab]);

  // ------------------------------------------------------------------------
  // Local state
  // ------------------------------------------------------------------------

  const [ruleTab, setRuleTab] = useState<RuleTab>('physics');
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);

  const projectData = currentProject?.project_data ?? null;
  const mechanicsConfig = projectData?.mechanics_config ?? null;
  const economyConfig = projectData?.economy_config ?? null;

  const enemies = useMemo(
    () => (projectData?.sprites ?? []).filter((s) => s.role === 'enemy'),
    [projectData]
  );

  const selectedEnemy = useMemo(
    () =>
      enemies.find((enemy) => enemy.id === selectedEnemyId) ??
      enemies.find((enemy) => enemy.id === activeEntityId) ??
      enemies[0] ??
      null,
    [enemies, selectedEnemyId, activeEntityId]
  );

  const selectedAI: AIConfigValues = useMemo(
    () => ({
      ...DEFAULT_AI_CONFIG,
      ...(selectedEnemy?.ai_config ?? {}),
    }),
    [selectedEnemy]
  );

  const weaponConfig: WeaponValues = useMemo(
    () => ({
      ...DEFAULT_WEAPON_CONFIG,
      ...(mechanicsConfig?.weapon_config ?? {}),
    }),
    [mechanicsConfig]
  );

  const player2Enabled = Boolean(mechanicsConfig?.player_2_config);

  // ------------------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------------------

  const updatePlayerConfig = useCallback(
    (which: 1 | 2, patch: Partial<PlayerConfigValues>) => {
      if (!mechanicsConfig) return;
      if (which === 1) {
        updateMechanicsConfig({
          player_1_config: {
            ...DEFAULT_PLAYER_CONFIG,
            ...mechanicsConfig.player_1_config,
            ...patch,
          },
        });
      } else {
        updateMechanicsConfig({
          player_2_config: {
            ...DEFAULT_PLAYER_CONFIG,
            ...(mechanicsConfig.player_2_config ?? {}),
            ...patch,
          },
        });
      }
    },
    [mechanicsConfig, updateMechanicsConfig]
  );

  const togglePlayer2 = useCallback(() => {
    if (!mechanicsConfig) return;
    if (player2Enabled) {
      // Strip player_2_config entirely (schema field is optional).
      const { player_2_config: _removed, ...rest } = mechanicsConfig;
      void _removed;
      const { setCurrentProject } = useGameStore.getState();
      if (currentProject) {
        setCurrentProject({
          ...currentProject,
          project_data: {
            ...currentProject.project_data,
            mechanics_config: rest,
          },
        });
        useGameStore.setState({ isDirty: true });
      }
      return;
    }
    updateMechanicsConfig({ player_2_config: { ...DEFAULT_PLAYER_CONFIG } });
  }, [mechanicsConfig, player2Enabled, updateMechanicsConfig, currentProject]);

  const updateWeapon = useCallback(
    (patch: Partial<WeaponValues>) => {
      updateMechanicsConfig({ weapon_config: { ...weaponConfig, ...patch } });
    },
    [weaponConfig, updateMechanicsConfig]
  );

  const updateWinCondition = useCallback(
    (winCondition: string) => {
      if (!mechanicsConfig) return;
      // Reset the value fields owned by other win conditions.
      updateMechanicsConfig({
        win_condition: winCondition as typeof mechanicsConfig.win_condition,
        score_target:
          winCondition === 'ScoreTarget'
            ? (mechanicsConfig.score_target ?? 100)
            : undefined,
        survive_time_sec:
          winCondition === 'SurviveWaves'
            ? (mechanicsConfig.survive_time_sec ?? 60)
            : undefined,
      });
    },
    [mechanicsConfig, updateMechanicsConfig]
  );

  const updateAI = useCallback(
    (patch: Partial<AIConfigValues>) => {
      if (!selectedEnemy) return;
      updateSprite({
        ...selectedEnemy,
        ai_config: {
          ...selectedAI,
          ...patch,
        } as typeof selectedEnemy.ai_config,
      });
    },
    [selectedEnemy, selectedAI, updateSprite]
  );

  // ------------------------------------------------------------------------
  // Empty state
  // ------------------------------------------------------------------------

  if (!mechanicsConfig) {
    return (
      <div className="view-container view-studio view-rules">
        <div className="level-empty-state">
          <div className="empty-state">
            <span className="empty-icon">⚙️</span>
            <h3>No project open</h3>
            <p>
              Start (or open) a project to configure its mechanics, AI rules,
              and economy.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigateTo('/art')}
            >
              Open Pixel Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  const player1 = {
    ...DEFAULT_PLAYER_CONFIG,
    ...mechanicsConfig.player_1_config,
  };
  const player2 = {
    ...DEFAULT_PLAYER_CONFIG,
    ...(mechanicsConfig.player_2_config ?? {}),
  };

  return (
    <div className="view-container view-studio view-rules">
      <StudioChrome active="rules" />
      <div className="config-layout">
        {/* Sidebar Navigation */}
        <aside className="config-sidebar">
          <div className="sidebar-header">
            <h2>Mechanics & Rules</h2>
          </div>
          <nav className="config-nav">
            <button
              className={`nav-item ${ruleTab === 'physics' ? 'active' : ''}`}
              onClick={() => setRuleTab('physics')}
            >
              <span className="nav-icon">⚙️</span>
              <span>Physics</span>
            </button>
            <button
              className={`nav-item ${ruleTab === 'ai' ? 'active' : ''}`}
              onClick={() => setRuleTab('ai')}
            >
              <span className="nav-icon">🤖</span>
              <span>Enemy AI</span>
            </button>
            <button
              className={`nav-item ${ruleTab === 'economy' ? 'active' : ''}`}
              onClick={() => setRuleTab('economy')}
            >
              <span className="nav-icon">💰</span>
              <span>Economy</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="config-main">
          {/* ---------------------------------------------------------- */}
          {/* Physics tab                                                */}
          {/* ---------------------------------------------------------- */}
          {ruleTab === 'physics' && (
            <div className="config-section">
              <div className="section-header">
                <h2>Physics Configuration</h2>
                <p>
                  Declare how your players move, what actions they can take,
                  and how the game is won or lost.
                </p>
              </div>

              <div className="config-grid">
                {/* CARD 1 — Physics & Movement */}
                <div className="config-card">
                  <h3>👤 Player 1 — Physics & Movement</h3>
                  <PlayerPhysicsControls
                    config={player1}
                    idPrefix="p1"
                    onChange={(patch) => updatePlayerConfig(1, patch)}
                  />
                </div>

                <div className="config-card">
                  <div className="card-title-row">
                    <h3>👥 Player 2 — Physics & Movement</h3>
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={player2Enabled}
                        onChange={togglePlayer2}
                      />
                      {player2Enabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                  {player2Enabled ? (
                    <PlayerPhysicsControls
                      config={player2}
                      idPrefix="p2"
                      onChange={(patch) => updatePlayerConfig(2, patch)}
                    />
                  ) : (
                    <div className="panel-empty">
                      <p>
                        Enable Player 2 for local co-op. P2 shares the same
                        level and rules.
                      </p>
                    </div>
                  )}
                </div>

                {/* CARD 2 — Action & Weapon Abilities */}
                <div className="config-card">
                  <h3>🔫 Card 2 — Action & Weapon Abilities</h3>
                  <div className="config-group">
                    <label htmlFor="weapon-attack-type">Primary Attack</label>
                    <select
                      id="weapon-attack-type"
                      value={weaponConfig.attack_type}
                      onChange={(e) =>
                        updateWeapon({
                          attack_type: e.target
                            .value as WeaponValues['attack_type'],
                        })
                      }
                    >
                      <option value="None">None</option>
                      <option value="Melee">Melee</option>
                      <option value="SpawnProjectile">Spawn Projectile</option>
                    </select>
                  </div>
                  <div className="config-group">
                    <label>
                      Fire Rate (seconds between shots)
                      <span className="value-display">
                        {weaponConfig.fire_rate_sec}s
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="10"
                      step="0.05"
                      value={weaponConfig.fire_rate_sec}
                      disabled={weaponConfig.attack_type === 'None'}
                      onChange={(e) =>
                        updateWeapon({ fire_rate_sec: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="config-group">
                    <label htmlFor="weapon-recoil">
                      Recoil (X push-back on fire)
                      <span className="value-display">
                        {weaponConfig.recoil_x}
                      </span>
                    </label>
                    <input
                      id="weapon-recoil"
                      type="number"
                      min={-1000}
                      max={1000}
                      value={weaponConfig.recoil_x}
                      disabled={weaponConfig.attack_type === 'None'}
                      onChange={(e) =>
                        updateWeapon({
                          recoil_x: clampNumber(
                            Number(e.target.value),
                            -1000,
                            1000
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="config-group">
                    <label htmlFor="weapon-bullet">Bullet Sprite</label>
                    <select
                      id="weapon-bullet"
                      value={weaponConfig.bullet_sprite_id ?? ''}
                      disabled={weaponConfig.attack_type !== 'SpawnProjectile'}
                      onChange={(e) =>
                        updateWeapon({
                          bullet_sprite_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">None selected</option>
                      {(projectData?.sprites ?? []).map((sprite) => (
                        <option key={sprite.id} value={sprite.id}>
                          {getSpriteIcon(sprite)} {sprite.name}
                        </option>
                      ))}
                    </select>
                    <p className="config-hint">
                      Bullets are chosen from your Sprite Backpack in the Pixel
                      Studio.
                    </p>
                  </div>
                </div>

                {/* CARD 3 — Win / Loss Conditions */}
                <div className="config-card">
                  <h3>🏆 Card 3 — Win / Loss Conditions</h3>
                  <div className="config-group">
                    <label htmlFor="win-condition">Win Condition</label>
                    <select
                      id="win-condition"
                      value={mechanicsConfig.win_condition}
                      onChange={(e) => updateWinCondition(e.target.value)}
                    >
                      {WIN_CONDITIONS.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {mechanicsConfig.win_condition === 'ScoreTarget' && (
                    <div className="config-group">
                      <label htmlFor="score-target">
                        Score Target
                        <span className="value-display">
                          {mechanicsConfig.score_target ?? '—'}
                        </span>
                      </label>
                      <input
                        id="score-target"
                        type="number"
                        min={1}
                        value={mechanicsConfig.score_target ?? ''}
                        placeholder="100"
                        onChange={(e) =>
                          updateMechanicsConfig({
                            score_target: clampNumber(
                              Number(e.target.value),
                              1,
                              1000000
                            ),
                          })
                        }
                      />
                    </div>
                  )}
                  {mechanicsConfig.win_condition === 'SurviveWaves' && (
                    <div className="config-group">
                      <label htmlFor="survive-time">
                        Survive Time (seconds)
                        <span className="value-display">
                          {mechanicsConfig.survive_time_sec ?? '—'}
                        </span>
                      </label>
                      <input
                        id="survive-time"
                        type="number"
                        min={1}
                        value={mechanicsConfig.survive_time_sec ?? ''}
                        placeholder="60"
                        onChange={(e) =>
                          updateMechanicsConfig({
                            survive_time_sec: clampNumber(
                              Number(e.target.value),
                              1,
                              100000
                            ),
                          })
                        }
                      />
                    </div>
                  )}
                  <p className="config-hint">
                    Loss happens when every player runs out of health, or time
                    runs out for SurviveWaves.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* Enemy AI tab                                               */}
          {/* ---------------------------------------------------------- */}
          {ruleTab === 'ai' && (
            <div className="config-section">
              <div className="section-header">
                <h2>Enemy AI Rules</h2>
                <p>
                  Pick an enemy from your Sprite Backpack and compose its
                  behavior from declarative rule layers.
                </p>
              </div>

              {enemies.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">👹</span>
                  <h3>No enemies yet</h3>
                  <p>
                    Make an enemy sprite in the Pixel Studio first — its AI
                    rules will show up here.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigateTo('/art')}
                  >
                    Open Pixel Studio
                  </button>
                </div>
              ) : (
                <div className="ai-builder-layout">
                  <div className="config-card ai-enemy-picker">
                    <h3>Enemies</h3>
                    <div className="entity-list">
                      {enemies.map((enemy) => (
                        <button
                          key={enemy.id}
                          className={`entity-item${selectedEnemy?.id === enemy.id ? ' active' : ''}`}
                          onClick={() => setSelectedEnemyId(enemy.id)}
                        >
                          <span className="entity-icon">
                            {getSpriteIcon(enemy)}
                          </span>
                          <span className="entity-label">{enemy.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedEnemy && (
                    <div className="config-card ai-rule-builder">
                      <h3>
                        {getSpriteIcon(selectedEnemy)} {selectedEnemy.name} —
                        Composable AI
                      </h3>
                      {(Object.keys(AI_GROUP_META) as AIGroupKey[]).map(
                        (groupKey) => {
                          const meta = AI_GROUP_META[groupKey];
                          const currentValue = selectedAI[meta.field] as string;
                          const options =
                            groupKey === 'movement'
                              ? MOVEMENT_OPTIONS
                              : groupKey === 'target'
                                ? TARGET_OPTIONS
                                : ATTACK_OPTIONS;
                          return (
                            <div key={groupKey} className="config-group ai-rule-group">
                              <label>
                                {meta.icon} {meta.title}
                              </label>
                              <div className="ai-option-row">
                                {options.map((option) => (
                                  <button
                                    key={option.value}
                                    className={`filter-chip${currentValue === option.value ? ' active' : ''}`}
                                    title={option.hint}
                                    onClick={() =>
                                      updateAI({
                                        [meta.field]: option.value,
                                      } as Partial<AIConfigValues>)
                                    }
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      )}
                      <div className="config-group">
                        <label>
                          Move Speed
                          <span className="value-display">
                            {selectedAI.move_speed}
                          </span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          step="10"
                          value={selectedAI.move_speed}
                          onChange={(e) =>
                            updateAI({ move_speed: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="config-group">
                        <label htmlFor="currency-drop">
                          Currency Drop Value
                          <span className="value-display">
                            {selectedAI.currency_drop_value}
                          </span>
                        </label>
                        <input
                          id="currency-drop"
                          type="number"
                          min={0}
                          value={selectedAI.currency_drop_value}
                          onChange={(e) =>
                            updateAI({
                              currency_drop_value: clampNumber(
                                Math.floor(Number(e.target.value)),
                                0,
                                1000000
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="ai-preview">
                        <span className="ai-preview-label">Live rule:</span>{' '}
                        “{selectedEnemy.name} moves: {selectedAI.movement} ·
                        targets: {selectedAI.target} · attacks:{' '}
                        {selectedAI.attack_style}”
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* Economy tab                                                */}
          {/* ---------------------------------------------------------- */}
          {ruleTab === 'economy' && (
            <div className="config-section">
              <div className="section-header">
                <h2>Economy Configuration</h2>
                <p>
                  Currency, income, and upgrade pacing for your game loop.
                </p>
              </div>

              <div className="config-grid">
                <div className="config-card">
                  <h3>💰 Currency</h3>
                  <div className="config-group">
                    <label htmlFor="currency-name">Currency Name</label>
                    <input
                      id="currency-name"
                      type="text"
                      maxLength={20}
                      value={economyConfig?.currency_name ?? 'Gold'}
                      onChange={(e) =>
                        updateEconomyConfig({
                          currency_name: e.target.value || 'Gold',
                        })
                      }
                    />
                  </div>
                  <div className="config-group">
                    <label>
                      Starting Currency
                      <span className="value-display">
                        {economyConfig?.starting_currency ?? 100}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="10"
                      value={economyConfig?.starting_currency ?? 100}
                      onChange={(e) =>
                        updateEconomyConfig({
                          starting_currency: clampNumber(
                            Number(e.target.value),
                            0,
                            10000
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="config-group">
                    <label>
                      Currency Per Click
                      <span className="value-display">
                        {economyConfig?.currency_per_click ?? 1}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={economyConfig?.currency_per_click ?? 1}
                      onChange={(e) =>
                        updateEconomyConfig({
                          currency_per_click: clampNumber(
                            Number(e.target.value),
                            0,
                            100
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="config-group">
                    <label>
                      Currency Per Kill
                      <span className="value-display">
                        {economyConfig?.currency_per_kill ?? 15}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="5"
                      value={economyConfig?.currency_per_kill ?? 15}
                      onChange={(e) =>
                        updateEconomyConfig({
                          currency_per_kill: clampNumber(
                            Number(e.target.value),
                            0,
                            1000
                          ),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="config-card">
                  <h3>📈 Income & Upgrades</h3>
                  <div className="config-group">
                    <label>
                      Passive Income Rate (seconds)
                      <span className="value-display">
                        {economyConfig?.passive_income_rate_sec ?? 0}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={economyConfig?.passive_income_rate_sec ?? 0}
                      onChange={(e) =>
                        updateEconomyConfig({
                          passive_income_rate_sec: clampNumber(
                            Number(e.target.value),
                            0,
                            100
                          ),
                        })
                      }
                    />
                    <p className="config-hint">0 = no passive income.</p>
                  </div>
                  <div className="config-group">
                    <label>
                      Upgrade Cost Multiplier
                      <span className="value-display">
                        {economyConfig?.upgrade_cost_multiplier ?? 1.15}×
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="2"
                      step="0.01"
                      value={economyConfig?.upgrade_cost_multiplier ?? 1.15}
                      onChange={(e) =>
                        updateEconomyConfig({
                          upgrade_cost_multiplier: clampNumber(
                            Number(e.target.value),
                            1,
                            2
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="config-group">
                    <label>
                      Turret Build Cost
                      <span className="value-display">
                        {economyConfig?.turret_build_cost ?? 50}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="5"
                      value={economyConfig?.turret_build_cost ?? 50}
                      onChange={(e) =>
                        updateEconomyConfig({
                          turret_build_cost: clampNumber(
                            Number(e.target.value),
                            0,
                            1000
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="config-group">
                    <label htmlFor="max-currency">
                      Max Currency (optional)
                      <span className="value-display">
                        {economyConfig?.max_currency ?? '∞'}
                      </span>
                    </label>
                    <input
                      id="max-currency"
                      type="number"
                      min={1}
                      max={1000000}
                      value={economyConfig?.max_currency ?? ''}
                      placeholder="No cap"
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateEconomyConfig({
                          max_currency:
                            raw === ''
                              ? undefined
                              : clampNumber(Math.floor(Number(raw)), 1, 1000000),
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// Player Physics Controls (shared by Player 1 and Player 2 cards)
// ============================================================================

function PlayerPhysicsControls({
  config,
  idPrefix,
  onChange,
}: {
  config: PlayerConfigValues;
  idPrefix: string;
  onChange: (patch: Partial<PlayerConfigValues>) => void;
}) {
  return (
    <>
      <div className="config-group">
        <label>
          Gravity (Y-axis)
          <span className="value-display">{config.gravity_y}</span>
        </label>
        <input
          type="range"
          min="0"
          max="2000"
          step="10"
          value={config.gravity_y}
          onChange={(e) => onChange({ gravity_y: Number(e.target.value) })}
          aria-label={`${idPrefix} gravity`}
        />
      </div>
      <div className="config-group">
        <label>
          Move Speed
          <span className="value-display">{config.move_speed}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={config.move_speed}
          onChange={(e) => onChange({ move_speed: Number(e.target.value) })}
          aria-label={`${idPrefix} move speed`}
        />
      </div>
      <div className="config-group">
        <label>
          Jump Force
          <span className="value-display">{config.jump_force}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={config.jump_force}
          onChange={(e) => onChange({ jump_force: Number(e.target.value) })}
          aria-label={`${idPrefix} jump force`}
        />
      </div>
      <div className="config-group">
        <label>
          Max Health
          <span className="value-display">{config.max_health}</span>
        </label>
        <input
          type="range"
          min="1"
          max="100"
          value={config.max_health}
          onChange={(e) =>
            onChange({
              max_health: clampNumber(Math.floor(Number(e.target.value)), 1, 100),
            })
          }
          aria-label={`${idPrefix} max health`}
        />
      </div>
      <div className="config-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={config.wall_slide_enabled}
            onChange={(e) =>
              onChange({ wall_slide_enabled: e.target.checked })
            }
          />
          Wall Slide Enabled
        </label>
      </div>
      {config.wall_slide_enabled && (
        <div className="config-group">
          <label>
            Wall Slide Drag
            <span className="value-display">
              {config.wall_slide_drag ?? 'default'}
            </span>
          </label>
          <input
            type="number"
            min={0}
            max={1000}
            value={config.wall_slide_drag ?? ''}
            placeholder="Default"
            onChange={(e) => {
              const raw = e.target.value;
              onChange({
                wall_slide_drag:
                  raw === ''
                    ? undefined
                    : clampNumber(Number(raw), 0, 1000),
              });
            }}
            aria-label={`${idPrefix} wall slide drag`}
          />
        </div>
      )}
    </>
  );
}
