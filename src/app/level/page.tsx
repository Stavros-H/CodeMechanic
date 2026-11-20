'use client';

// ============================================================================
// Phase 5 — View 5: Level & Wave Painter
// Paint terrain tiles, place spawn points / goals / backpack sprites, and
// configure wave spawners. Everything persists through updateLevelData.
// ============================================================================

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';
import StudioChrome from '@/components/StudioChrome/StudioChrome';
import { EntityRole, LevelData, Sprite } from '@/schemas/projectSchemas';

// ============================================================================
// Constants
// ============================================================================

const TILE_EMPTY = 0;
const TILE_GROUND = 1;
const TILE_SPIKE = 2;

const CELL = 24; // Canvas pixels per grid cell
const MIN_GRID = 1;
const MAX_GRID = 64;

const MAX_WAVE_SPAWNERS = 20;

type PaintTool = 'ground' | 'spike' | 'erase';

type ClickTool = 'spawn_p1' | 'spawn_p2' | 'goal' | 'sprite';

type LevelTool = PaintTool | ClickTool;

const TOOL_OPTIONS: { id: LevelTool; label: string; icon: string }[] = [
  { id: 'ground', label: 'Ground', icon: '🟫' },
  { id: 'spike', label: 'Spike', icon: '🔺' },
  { id: 'erase', label: 'Erase', icon: '⌫' },
  { id: 'spawn_p1', label: 'Spawn P1', icon: '👤' },
  { id: 'spawn_p2', label: 'Spawn P2', icon: '👥' },
  { id: 'goal', label: 'Goal', icon: '🏁' },
  { id: 'sprite', label: 'Place Sprite', icon: '🎁' },
];

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

/**
 * Resize a tilemap to exactly width x height, preserving overlapping cells.
 * Cells outside the old bounds become TILE_EMPTY.
 */
function resizeTilemap(
  tilemap: number[][],
  width: number,
  height: number
): number[][] {
  const next: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(tilemap[y]?.[x] ?? TILE_EMPTY);
    }
    next.push(row);
  }
  return next;
}

function inBounds(x: number, y: number, w: number, h: number): boolean {
  return x >= 0 && x < w && y >= 0 && y < h;
}

// ============================================================================
// Component
// ============================================================================

export default function LevelWavePainter() {
  const currentProject = useGameStore((state) => state.currentProject);
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  const updateLevelData = useGameStore((state) => state.updateLevelData);
  const { navigateTo } = useGuardedNavigation();

  useEffect(() => {
    setActiveTab('level');
  }, [setActiveTab]);

  // ------------------------------------------------------------------------
  // Derived project data
  // ------------------------------------------------------------------------

  const levelData: LevelData | null = useMemo(
    () => currentProject?.project_data?.level_data ?? null,
    [currentProject]
  );

  const sprites: Sprite[] = useMemo(
    () => currentProject?.project_data?.sprites ?? [],
    [currentProject]
  );

  const enemies = useMemo(
    () => sprites.filter((s) => s.role === 'enemy'),
    [sprites]
  );

  const [activeTool, setActiveTool] = useState<LevelTool>('ground');
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef(false);

  // Default the sprite placement selection to the first backpack sprite.
  const selectedSprite = useMemo(
    () =>
      sprites.find((s) => s.id === selectedSpriteId) ?? sprites[0] ?? null,
    [sprites, selectedSpriteId]
  );

  const effectiveTool: LevelTool | null = useMemo(() => {
    if (activeTool === 'sprite') {
      return selectedSprite ? 'sprite' : null;
    }
    return activeTool;
  }, [activeTool, selectedSprite]);

  // ------------------------------------------------------------------------
  // Level mutations (all funnel through updateLevelData -> isDirty)
  // ------------------------------------------------------------------------

  const commit = useCallback(
    (patch: Partial<LevelData>) => {
      if (!levelData) return;
      updateLevelData({ ...levelData, ...patch });
    },
    [levelData, updateLevelData]
  );

  const setTile = useCallback(
    (x: number, y: number, tile: number) => {
      if (!levelData) return;
      const map = resizeTilemap(
        levelData.tilemap ?? [],
        levelData.grid_width,
        levelData.grid_height
      );
      map[y][x] = tile;
      commit({ tilemap: map });
    },
    [levelData, commit]
  );

  const paintAt = useCallback(
    (x: number, y: number) => {
      if (!levelData || !inBounds(x, y, levelData.grid_width, levelData.grid_height)) {
        return;
      }
      if (activeTool === 'ground') setTile(x, y, TILE_GROUND);
      else if (activeTool === 'spike') setTile(x, y, TILE_SPIKE);
      else if (activeTool === 'erase') {
        // Erase removes the tile (if any) plus every marker/placement in the cell.
        const patch: Partial<LevelData> = {};
        if ((levelData.tilemap[y]?.[x] ?? TILE_EMPTY) !== TILE_EMPTY) {
          const map = (levelData.tilemap ?? []).map((row, rowY) =>
            rowY === y
              ? row.map((cell, cellX) => (cellX === x ? TILE_EMPTY : cell))
              : row
          );
          patch.tilemap = map;
        }
        if (levelData.sprite_placements?.some((p) => p.x === x && p.y === y)) {
          patch.sprite_placements = levelData.sprite_placements.filter(
            (p) => !(p.x === x && p.y === y)
          );
        }
        if (levelData.player_spawn_points?.some((p) => p.x === x && p.y === y)) {
          patch.player_spawn_points = levelData.player_spawn_points.filter(
            (p) => !(p.x === x && p.y === y)
          );
        }
        if (levelData.goal_positions?.some((g) => g.x === x && g.y === y)) {
          patch.goal_positions = levelData.goal_positions.filter(
            (g) => !(g.x === x && g.y === y)
          );
        }
        if (Object.keys(patch).length > 0) commit(patch);
      }
    },
    [levelData, activeTool, setTile, commit]
  );

  const toggleSpawnPoint = useCallback(
    (x: number, y: number, playerRole: 'player_1' | 'player_2') => {
      if (!levelData) return;
      const points = (levelData.player_spawn_points ?? []).filter(
        (p) => !(p.player_role === playerRole)
      );
      const existing = (levelData.player_spawn_points ?? []).find(
        (p) => p.player_role === playerRole
      );
      if (existing && existing.x === x && existing.y === y) {
        // Clicking the existing spawn removes it.
        commit({ player_spawn_points: points });
        return;
      }
      commit({ player_spawn_points: [...points, { x, y, player_role: playerRole }] });
    },
    [levelData, commit]
  );

  const toggleGoal = useCallback(
    (x: number, y: number) => {
      if (!levelData) return;
      const goals = levelData.goal_positions ?? [];
      if (goals.some((g) => g.x === x && g.y === y)) {
        commit({ goal_positions: goals.filter((g) => !(g.x === x && g.y === y)) });
        return;
      }
      commit({ goal_positions: [...goals, { x, y }] });
    },
    [levelData, commit]
  );

  const togglePlacement = useCallback(
    (x: number, y: number, spriteId: string) => {
      if (!levelData) return;
      const placements = levelData.sprite_placements ?? [];
      if (placements.some((p) => p.sprite_id === spriteId && p.x === x && p.y === y)) {
        commit({
          sprite_placements: placements.filter(
            (p) => !(p.sprite_id === spriteId && p.x === x && p.y === y)
          ),
        });
        return;
      }
      commit({ sprite_placements: [...placements, { sprite_id: spriteId, x, y }] });
    },
    [levelData, commit]
  );

  const handleGridResize = useCallback(
    (dimension: 'grid_width' | 'grid_height', rawValue: number) => {
      if (!levelData) return;
      const clamped = Math.min(MAX_GRID, Math.max(MIN_GRID, rawValue));
      if (clamped === levelData[dimension]) return;
      const width =
        dimension === 'grid_width' ? clamped : levelData.grid_width;
      const height =
        dimension === 'grid_height' ? clamped : levelData.grid_height;
      commit({
        [dimension]: clamped,
        tilemap: resizeTilemap(levelData.tilemap ?? [], width, height),
      });
    },
    [levelData, commit]
  );

  const handleTileSizeChange = useCallback(
    (rawValue: number) => {
      if (!levelData) return;
      const size = [16, 32, 64].includes(rawValue) ? rawValue : 16;
      commit({ tile_size: size });
    },
    [levelData, commit]
  );

  // Spawner mutations
  const updateSpawner = useCallback(
    (index: number, patch: Partial<LevelData['wave_spawners'][number]>) => {
      if (!levelData) return;
      const spawners = (levelData.wave_spawners ?? []).map((spawner, i) =>
        i === index ? { ...spawner, ...patch } : spawner
      );
      commit({ wave_spawners: spawners });
    },
    [levelData, commit]
  );

  const addSpawner = useCallback(() => {
    if (!levelData || enemies.length === 0) return;
    const spawners = levelData.wave_spawners ?? [];
    if (spawners.length >= MAX_WAVE_SPAWNERS) return;
    commit({
      wave_spawners: [
        ...spawners,
        {
          enemy_id: enemies[0].id,
          spawn_interval_sec: 2,
          total_count: 5,
        },
      ],
    });
  }, [levelData, enemies, commit]);

  const removeSpawner = useCallback(
    (index: number) => {
      if (!levelData) return;
      commit({
        wave_spawners: (levelData.wave_spawners ?? []).filter(
          (_, i) => i !== index
        ),
      });
    },
    [levelData, commit]
  );

  const backpackGroups = useMemo(() => {
    const groups: { role: EntityRole; sprites: Sprite[] }[] = [];
    for (const sprite of sprites) {
      const group = groups.find((g) => g.role === sprite.role);
      if (group) group.sprites.push(sprite);
      else groups.push({ role: sprite.role, sprites: [sprite] });
    }
    return groups;
  }, [sprites]);

  // ------------------------------------------------------------------------
  // Canvas painting
  // ------------------------------------------------------------------------

  const cellFromEvent = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!levelData || !canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / CELL);
      const y = Math.floor((event.clientY - rect.top) / CELL);
      if (!inBounds(x, y, levelData.grid_width, levelData.grid_height)) {
        return null;
      }
      return { x, y };
    },
    [levelData]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const cell = cellFromEvent(event);
      if (!cell || !levelData) return;
      const tool = effectiveTool;
      if (!tool) return;

      if (tool === 'ground' || tool === 'spike' || tool === 'erase') {
        isPaintingRef.current = true;
        paintAt(cell.x, cell.y);
        return;
      }
      if (tool === 'spawn_p1') toggleSpawnPoint(cell.x, cell.y, 'player_1');
      else if (tool === 'spawn_p2') toggleSpawnPoint(cell.x, cell.y, 'player_2');
      else if (tool === 'goal') toggleGoal(cell.x, cell.y);
      else if (tool === 'sprite' && selectedSprite)
        togglePlacement(cell.x, cell.y, selectedSprite.id);
    },
    [
      cellFromEvent,
      levelData,
      effectiveTool,
      paintAt,
      toggleSpawnPoint,
      toggleGoal,
      togglePlacement,
      selectedSprite,
    ]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPaintingRef.current) return;
      const cell = cellFromEvent(event);
      if (cell) paintAt(cell.x, cell.y);
    },
    [cellFromEvent, paintAt]
  );

  const handlePointerUp = useCallback(() => {
    isPaintingRef.current = false;
  }, []);

  // ------------------------------------------------------------------------
  // Canvas rendering
  // ------------------------------------------------------------------------

  useEffect(() => {
    if (!levelData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { grid_width: gridW, grid_height: gridH } = levelData;
    canvas.width = gridW * CELL;
    canvas.height = gridH * CELL;

    // Background
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tilemap = levelData.tilemap ?? [];
    const placements = levelData.sprite_placements ?? [];

    // Tiles
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const tile = tilemap[y]?.[x] ?? TILE_EMPTY;
        const px = x * CELL;
        const py = y * CELL;
        if (tile === TILE_GROUND) {
          ctx.fillStyle = '#8a6b4d';
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.fillRect(px, py, CELL, 3);
        } else if (tile === TILE_SPIKE) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(px, py + CELL);
          ctx.lineTo(px + CELL / 2, py + 2);
          ctx.lineTo(px + CELL, py + CELL);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= gridW; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, canvas.height);
    }
    for (let y = 0; y <= gridH; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(canvas.width, y * CELL + 0.5);
    }
    ctx.stroke();

    // Placed sprites (role icon)
    ctx.font = `${Math.floor(CELL * 0.7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const placement of placements) {
      const sprite = sprites.find((s) => s.id === placement.sprite_id);
      if (!sprite) continue;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(
        placement.x * CELL + 2,
        placement.y * CELL + 2,
        CELL - 4,
        CELL - 4
      );
      ctx.fillStyle = '#fff';
      ctx.fillText(
        getRoleIcon(sprite.role),
        placement.x * CELL + CELL / 2,
        placement.y * CELL + CELL / 2
      );
    }

    // Player spawn markers
    for (const spawn of levelData.player_spawn_points ?? []) {
      ctx.fillStyle = spawn.player_role === 'player_1' ? '#3b82f6' : '#ec4899';
      ctx.fillRect(
        spawn.x * CELL + 2,
        spawn.y * CELL + 2,
        CELL - 4,
        CELL - 4
      );
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(
        spawn.player_role === 'player_1' ? 'P1' : 'P2',
        spawn.x * CELL + CELL / 2,
        spawn.y * CELL + CELL / 2
      );
    }

    // Goal markers
    for (const goal of levelData.goal_positions ?? []) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        goal.x * CELL + 2,
        goal.y * CELL + 2,
        CELL - 4,
        CELL - 4
      );
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('GOAL', goal.x * CELL + CELL / 2, goal.y * CELL + CELL / 2);
    }
  }, [levelData, sprites]);

  // ------------------------------------------------------------------------
  // Empty state
  // ------------------------------------------------------------------------

  if (!levelData || !currentProject) {
    return (
      <div className="view-container view-studio view-level">
        <div className="level-empty-state">
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
            <h3>No project open</h3>
            <p>
              Start (or open) a project to begin painting levels. The Sprite
              Backpack is where you craft the sprites you can place here.
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

  const placements = levelData.sprite_placements ?? [];
  const spawners = levelData.wave_spawners ?? [];
  const spawnP1 = (levelData.player_spawn_points ?? []).find(
    (p) => p.player_role === 'player_1'
  );
  const spawnP2 = (levelData.player_spawn_points ?? []).find(
    (p) => p.player_role === 'player_2'
  );

  const placementCounts = placements.reduce<Record<string, number>>(
    (acc, placement) => {
      acc[placement.sprite_id] = (acc[placement.sprite_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  return (
    <div className="view-container view-studio view-level">
      <StudioChrome active="level" />
      <div className="level-layout">
        {/* Left pane: Sprite Backpack + tools */}
        <aside className="sprite-library">
          <div className="library-header">
            <h2>Toolbox</h2>
          </div>
          <div className="level-tools">
            {TOOL_OPTIONS.map((tool) => {
              const disabled =
                tool.id === 'sprite' && !selectedSprite;
              return (
                <button
                  key={tool.id}
                  className={`toolbar-btn${activeTool === tool.id ? ' active' : ''}`}
                  disabled={disabled}
                  onClick={() => setActiveTool(tool.id)}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  {tool.label}
                </button>
              );
            })}
          </div>
          <div className="library-header">
            <h2>Sprite Backpack</h2>
          </div>
          {sprites.length === 0 ? (
            <div className="panel-empty">
              <span className="empty-icon">🎒</span>
              <p>
                Your backpack is empty. Make sprites in the Pixel Studio, then
                place them on the map here.
              </p>
              <button
                className="btn btn-small btn-primary"
                onClick={() => navigateTo('/art')}
              >
                Open Pixel Studio
              </button>
            </div>
          ) : (
            backpackGroups.map((group) => (
              <div key={group.role} className="entity-category">
                <h3>{getRoleIcon(group.role)} {group.role.replace('_', ' ')}</h3>
                <div className="entity-list">
                  {group.sprites.map((sprite) => (
                    <button
                      key={sprite.id}
                      className={`entity-item${selectedSprite?.id === sprite.id ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedSpriteId(sprite.id);
                        setActiveTool('sprite');
                      }}
                    >
                      <span className="entity-icon">{getRoleIcon(sprite.role)}</span>
                      <span className="entity-label">{sprite.name}</span>
                      {placementCounts[sprite.id] > 0 && (
                        <span className="placement-count">
                          ×{placementCounts[sprite.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </aside>

        {/* Center pane: tile grid painter */}
        <main className="level-canvas-pane">
          <div className="canvas-viewport-header">
            <span className="zoom-label">
              {effectiveTool
                ? `${TOOL_OPTIONS.find((t) => t.id === effectiveTool)?.icon ?? ''} ${TOOL_OPTIONS.find((t) => t.id === effectiveTool)?.label ?? ''}`
                : 'Pick a sprite to place'}
            </span>
            <span className="zoom-level">
              {levelData.grid_width} × {levelData.grid_height} cells · tile size {levelData.tile_size}px
            </span>
          </div>
          <div className="level-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="level-grid-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
          <p className="level-canvas-hint">
            Ground / Spike / Erase paint by dragging. Spawn, Goal, and Place
            Sprite markers toggle on click.
          </p>
        </main>

        {/* Right pane: grid settings + wave spawners */}
        <aside className="level-side-panel">
          <div className="config-card">
            <h3>Grid Settings</h3>
            <div className="config-group">
              <label htmlFor="grid-width">
                Grid Width
                <span className="value-display">{levelData.grid_width}</span>
              </label>
              <input
                id="grid-width"
                type="number"
                min={MIN_GRID}
                max={MAX_GRID}
                value={levelData.grid_width}
                onChange={(e) =>
                  handleGridResize('grid_width', Number(e.target.value))
                }
              />
            </div>
            <div className="config-group">
              <label htmlFor="grid-height">
                Grid Height
                <span className="value-display">{levelData.grid_height}</span>
              </label>
              <input
                id="grid-height"
                type="number"
                min={MIN_GRID}
                max={MAX_GRID}
                value={levelData.grid_height}
                onChange={(e) =>
                  handleGridResize('grid_height', Number(e.target.value))
                }
              />
            </div>
            <div className="config-group">
              <label htmlFor="tile-size">Tile Size (px)</label>
              <select
                id="tile-size"
                value={levelData.tile_size}
                onChange={(e) => handleTileSizeChange(Number(e.target.value))}
              >
                <option value={16}>16px</option>
                <option value={32}>32px</option>
                <option value={64}>64px</option>
              </select>
            </div>
          </div>

          <div className="config-card">
            <h3>Wave Spawners</h3>
            {enemies.length === 0 ? (
              <div className="panel-empty">
                <span className="empty-icon">👹</span>
                <p>
                  No enemy sprites in the backpack. Make an enemy in the Pixel
                  Studio to configure waves.
                </p>
              </div>
            ) : (
              <div className="wave-spawner-list">
                {spawners.map((spawner, index) => (
                  <div key={index} className="wave-spawner-row">
                    <select
                      value={spawner.enemy_id}
                      onChange={(e) =>
                        updateSpawner(index, { enemy_id: e.target.value })
                      }
                    >
                      {enemies.some((enemy) => enemy.id === spawner.enemy_id) ? (
                        enemies.map((enemy) => (
                          <option key={enemy.id} value={enemy.id}>
                            {enemy.name}
                          </option>
                        ))
                      ) : (
                        <option value={spawner.enemy_id}>Unknown sprite</option>
                      )}
                    </select>
                    <label>
                      Every
                      <input
                        type="number"
                        min={0.1}
                        max={60}
                        step={0.1}
                        value={spawner.spawn_interval_sec}
                        onChange={(e) =>
                          updateSpawner(index, {
                            spawn_interval_sec: Number(e.target.value),
                          })
                        }
                      />
                      sec
                    </label>
                    <label>
                      Count
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={spawner.total_count}
                        onChange={(e) =>
                          updateSpawner(index, {
                            total_count: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <button
                      className="control-btn wave-spawner-remove"
                      title="Remove spawner"
                      onClick={() => removeSpawner(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-small"
                  onClick={addSpawner}
                  disabled={spawners.length >= MAX_WAVE_SPAWNERS}
                >
                  + Add Spawner
                </button>
              </div>
            )}
          </div>

          <div className="config-card">
            <h3>Level Summary</h3>
            <ul className="placement-summary">
              <li>
                Spawn P1: {spawnP1 ? `(${spawnP1.x}, ${spawnP1.y})` : 'not set'}
              </li>
              <li>
                Spawn P2:{' '}
                {spawnP2
                  ? `(${spawnP2.x}, ${spawnP2.y})`
                  : 'not set (optional)'}
              </li>
              <li>Goals: {levelData.goal_positions?.length ?? 0}</li>
              <li>Placed sprites: {placements.length}</li>
              <li>Wave spawners: {spawners.length}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
