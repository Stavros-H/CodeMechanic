'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useStudioStore } from '@/studio/store/useStudioStore';
import { EntityRole, Resolution, Sprite } from '@/schemas/projectSchemas';
import { ALL_PALETTES, getPaletteById, hexToRgba } from '@/studio/utils/palettes';
import { DrawingTool, VALID_RESOLUTIONS, ENTITY_CATEGORIES } from '@/studio/types';

// ============================================================================
// Constants
// ============================================================================

const GRID_SIZE = 16;
const CANVAS_SCALE_OPTIONS = [1, 2, 4, 8, 16];

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getSpriteByRole(sprites: Sprite[], role: EntityRole): Sprite | null {
  return sprites.find((s) => s.role === role) || null;
}

// ============================================================================
// Pixel Canvas Component
// ============================================================================

interface PixelCanvasProps {
  width: number;
  height: number;
  scale: number;
  showGrid: boolean;
  pixels: Array<{ x: number; y: number; color: string }>;
  onPixelDraw: (x: number, y: number, color: string) => void;
  onPixelErase: (x: number, y: number) => void;
  primaryColor: string;
  secondaryColor: string;
  activeTool: DrawingTool;
  resolution: Resolution;
}

function PixelCanvas({
  width,
  height,
  scale,
  showGrid,
  pixels,
  onPixelDraw,
  onPixelErase,
  primaryColor,
  secondaryColor,
  activeTool,
  resolution,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Draw to canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate actual canvas size
    const canvasWidth = width * scale;
    const canvasHeight = height * scale;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = hexToRgba('#4a4a4a', 0.3);
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, canvasHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(canvasWidth, y * scale);
        ctx.stroke();
      }
    }

    // Draw pixels
    for (const pixel of pixels) {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * scale,
        pixel.y * scale,
        scale,
        scale
      );
    }
  }, [width, height, scale, showGrid, pixels, primaryColor, secondaryColor]);

  // Handle mouse/pointer events
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);

    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) return;

    isDrawingRef.current = true;
    lastPositionRef.current = { x, y };

    // Draw pixel
    if (activeTool === 'pencil') {
      onPixelDraw(x, y, primaryColor);
    } else if (activeTool === 'eraser') {
      onPixelErase(x, y);
    }
  }, [scale, width, height, activeTool, primaryColor, onPixelDraw, onPixelErase]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);

    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) return;

    const lastPos = lastPositionRef.current;
    if (!lastPos) return;

    // Draw line if moved
    if (lastPos.x !== x || lastPos.y !== y) {
      // Simple line drawing (could be optimized)
      if (activeTool === 'pencil') {
        onPixelDraw(x, y, primaryColor);
      } else if (activeTool === 'eraser') {
        onPixelErase(x, y);
      }
      lastPositionRef.current = { x, y };
    }
  }, [scale, width, height, activeTool, primaryColor, onPixelDraw, onPixelErase]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPositionRef.current = null;
  }, []);

  const handlePointerLeave = useCallback(() => {
    isDrawingRef.current = false;
    lastPositionRef.current = null;
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        cursor: activeTool === 'pencil' ? 'crosshair' : 
                activeTool === 'eraser' ? 'cell' : 'default',
        imageRendering: 'pixelated',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  );
}

// ============================================================================
// Hitbox Canvas Component
// ============================================================================

interface HitboxCanvasProps {
  width: number;
  height: number;
  scale: number;
  hitboxes: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }>;
}

function HitboxCanvas({ width, height, scale, hitboxes }: HitboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with semi-transparent background
    ctx.fillStyle = hexToRgba('#ff00ff', 0.1);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw hitboxes
    for (const hitbox of hitboxes) {
      ctx.fillStyle = hitbox.color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(
        hitbox.x * scale,
        hitbox.y * scale,
        hitbox.width * scale,
        hitbox.height * scale
      );
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hitbox.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        hitbox.x * scale,
        hitbox.y * scale,
        hitbox.width * scale,
        hitbox.height * scale
      );
    }
  }, [width, height, scale, hitboxes]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

// ============================================================================
// Color Picker Component
// ============================================================================

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
  size?: number;
}

function ColorPicker({ colors, selectedColor, onSelectColor, size = 24 }: ColorPickerProps) {
  return (
    <div className="color-picker">
      {colors.map((color) => (
        <button
          key={color}
          className="color-swatch"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            background: color,
            border: color === selectedColor ? '2px solid #fff' : '1px solid #4a4a4a',
            borderRadius: '4px',
          }}
          onClick={() => onSelectColor(color)}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PixelHitboxStudio() {
  const {
    currentProject,
    setActiveTab,
    setIsDirty,
    createNewProject,
  } = useGameStore();

  const {
    studio,
    setActiveSprite,
    setActiveTool,
    setPrimaryColor,
    setSecondaryColor,
    setActivePalette,
    setShowGrid,
    setCanvasSize,
    drawPixel,
    erasePixel,
    clearLayer,
    undo,
    redo,
    addHitbox,
    setDirty,
  } = useStudioStore();

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('art');
    return () => setDirty(false);
  }, [setActiveTab, setDirty]);

  // Sync with current project
  useEffect(() => {
    if (currentProject) {
      // Set active sprite to first sprite if available
      const firstSprite = currentProject.project_data.sprites[0];
      if (firstSprite) {
        setActiveSprite(firstSprite);
      }
    }
  }, [currentProject, setActiveSprite]);

  // State for UI
  const [activeEntity, setActiveEntity] = useState<EntityRole>('player_1');
  const [selectedSprite, setSelectedSprite] = useState<Sprite | null>(null);
  const [showNewSpriteModal, setShowNewSpriteModal] = useState(false);
  const [newSpriteName, setNewSpriteName] = useState('');
  const [newSpriteRole, setNewSpriteRole] = useState<EntityRole>('player_1');
  const [newSpriteResolution, setNewSpriteResolution] = useState<Resolution>(32);
  const [canvasScale, setCanvasScale] = useState<number>(4);

  // Entity categories (from types)
  const entityCategories = ENTITY_CATEGORIES;

  // Active palette
  const activePalette = getPaletteById(studio.activePalette) || ALL_PALETTES[0];

  // Get active sprite from store
  const activeStoreSprite = studio.activeSprite;

  // Sync selected sprite with store
  useEffect(() => {
    if (activeStoreSprite) {
      setSelectedSprite(activeStoreSprite);
      setActiveEntity(activeStoreSprite.role);
    } else if (currentProject?.project_data.sprites.length > 0) {
      setSelectedSprite(currentProject.project_data.sprites[0]);
    } else {
      setSelectedSprite(null);
    }
  }, [activeStoreSprite, currentProject]);

  // Create new sprite
  const handleCreateSprite = () => {
    if (!currentProject) {
      // Create a new project if none exists
      const defaultProject = {
        title: 'Untitled Project',
        description: '',
        genre: 'Platformer',
        author_id: null,
        is_published: false,
        is_template: false,
        project_data: {
          sprites: [],
          level_data: { width: 10, height: 10, tile_size: 32, tiles: [] },
          mechanics_config: {
            player_1: { speed: 200, jump_force: 300, gravity: 800 },
            player_2: { speed: 200, jump_force: 300, gravity: 800 },
            win_condition: 'reach_goal',
          },
          economy_config: {},
          audio_config: {},
          version: '1.0.0',
        },
      };
      createNewProject(defaultProject);
    }

    // Create new sprite
    const newSprite: Sprite = {
      id: generateId(),
      name: newSpriteName || `${newSpriteRole.replace('_', ' ')}`,
      role: newSpriteRole,
      resolution: newSpriteResolution,
      frames: {},
      hitboxes: [],
    };

    // Add to project (this would be done through the store in a full implementation)
    setShowNewSpriteModal(false);
    setNewSpriteName('');
    setActiveEntity(newSpriteRole);
    setActiveSprite(newSprite);
    setIsDirty(true);
  };

  // Select entity
  const handleSelectEntity = (role: EntityRole) => {
    setActiveEntity(role);
    const sprite = getSpriteByRole(currentProject?.project_data.sprites || [], role);
    setSelectedSprite(sprite);
    if (sprite) {
      setActiveSprite(sprite);
    }
  };

  // Handle pixel draw
  const handlePixelDraw = useCallback((x: number, y: number, color: string) => {
    drawPixel({ x, y, color });
    setIsDirty(true);
  }, [drawPixel, setIsDirty]);

  // Handle pixel erase
  const handlePixelErase = useCallback((x: number, y: number) => {
    erasePixel({ x, y, color: '' });
    setIsDirty(true);
  }, [erasePixel, setIsDirty]);

  // Get canvas dimensions based on resolution
  const canvasWidth = newSpriteResolution || 32;
  const canvasHeight = newSpriteResolution || 32;

  return (
    <>
      {/* New Sprite Modal */}
      {showNewSpriteModal && (
        <div className="modal-overlay" onClick={() => setShowNewSpriteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Sprite</h2>
              <button
                className="modal-close"
                onClick={() => setShowNewSpriteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="sprite-name">Name</label>
                <input
                  type="text"
                  id="sprite-name"
                  value={newSpriteName}
                  onChange={(e) => setNewSpriteName(e.target.value)}
                  placeholder="My Character"
                />
              </div>
              <div className="form-group">
                <label htmlFor="sprite-role">Role</label>
                <select
                  id="sprite-role"
                  value={newSpriteRole}
                  onChange={(e) => setNewSpriteRole(e.target.value as EntityRole)}
                >
                  <option value="player_1">Player 1</option>
                  <option value="player_2">Player 2</option>
                  <option value="enemy">Enemy</option>
                  <option value="hazard">Hazard</option>
                  <option value="pickup">Pickup</option>
                  <option value="goal">Goal</option>
                  <option value="tile">Tile</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sprite-resolution">Resolution</label>
                <select
                  id="sprite-resolution"
                  value={newSpriteResolution}
                  onChange={(e) => setNewSpriteResolution(Number(e.target.value) as Resolution)}
                >
                  {VALID_RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>{res}×{res}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCreateSprite}
                >
                  Create Sprite
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowNewSpriteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pixel & Hitbox Studio Content */}
      <div className="view-container view-studio view-art">
        <div className="studio-layout">
          {/* Sprite Library Sidebar */}
          <aside className="sprite-library">
            <div className="library-header">
              <h2>Sprite Library</h2>
              <button
                className="btn btn-small btn-primary"
                onClick={() => setShowNewSpriteModal(true)}
              >
                <span className="btn-icon">+</span>
                <span>New Sprite</span>
              </button>
            </div>
            <div className="entity-categories">
              {entityCategories.map((category) => (
                <div key={category.label} className="entity-category">
                  <h3>{category.label}</h3>
                  <div className="entity-list">
                    {category.roles.map((role) => (
                      <button
                        key={role}
                        className={`entity-item ${activeEntity === role ? 'active' : ''}`}
                        onClick={() => handleSelectEntity(role)}
                      >
                        <span className="entity-icon">
                          {role === 'player_1' && '👤'}
                          {role === 'player_2' && '👥'}
                          {role === 'enemy' && '👹'}
                          {role === 'hazard' && '⚠️'}
                          {role === 'pickup' && '✨'}
                          {role === 'goal' && '🏆'}
                          {role === 'tile' && '⬛'}
                        </span>
                        <span className="entity-label">
                          {role.replace('_', ' ')}
                        </span>
                        {selectedSprite?.role === role && (
                          <span className="entity-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Canvas Area */}
          <main className="canvas-area">
            <div className="canvas-toolbar">
              <div className="toolbar-group">
                <h2>{activeEntity.replace('_', ' ')}</h2>
                {selectedSprite && (
                  <span className="sprite-info">
                    {selectedSprite.name} ({selectedSprite.resolution}×{selectedSprite.resolution})
                  </span>
                )}
              </div>
              <div className="toolbar-group">
                <button
                  className={`toolbar-btn ${studio.activeLayerId === 'art-layer' ? 'active' : ''}`}
                  onClick={() => studio.activeLayerId !== 'art-layer' && setActiveTool('pencil')}
                >
                  <span className="tool-icon">🎨</span>
                  <span>Art Layer</span>
                </button>
                <button
                  className={`toolbar-btn ${studio.activeLayerId === 'hitbox-layer' ? 'active' : ''}`}
                  onClick={() => studio.activeLayerId !== 'hitbox-layer'}
                >
                  <span className="tool-icon hitbox-icon">🟥</span>
                  <span>Hitbox Layer</span>
                </button>
              </div>
            </div>

            {/* Dual-Layer Canvas */}
            <div className="dual-canvas">
              {studio.activeLayerId === 'art-layer' ? (
                <PixelCanvas
                  width={canvasWidth}
                  height={canvasHeight}
                  scale={canvasScale}
                  showGrid={studio.canvas.showGrid}
                  pixels={studio.layers.find(l => l.id === 'art-layer')?.pixels || []}
                  onPixelDraw={handlePixelDraw}
                  onPixelErase={handlePixelErase}
                  primaryColor={studio.primaryColor}
                  secondaryColor={studio.secondaryColor}
                  activeTool={studio.activeTool}
                  resolution={newSpriteResolution}
                />
              ) : (
                <HitboxCanvas
                  width={canvasWidth}
                  height={canvasHeight}
                  scale={canvasScale}
                  hitboxes={studio.hitboxLayer.hitboxes.map((h) => ({
                    id: h.id,
                    x: h.x,
                    y: h.y,
                    width: h.width || 16,
                    height: h.height || 16,
                    color: h.color,
                  }))}
                />
              )}
            </div>

            {/* Canvas Controls */}
            <div className="canvas-controls">
              <div className="control-group">
                <span className="control-label">Tools:</span>
                {(['pencil', 'bucket', 'eraser', 'eyedropper'] as DrawingTool[]).map((tool) => (
                  <button
                    key={tool}
                    className={`control-btn ${studio.activeTool === tool ? 'active' : ''}`}
                    onClick={() => setActiveTool(tool)}
                  >
                    {tool === 'pencil' && '✏️'}
                    {tool === 'bucket' && '🪣'}
                    {tool === 'eraser' && '🧽'}
                    {tool === 'eyedropper' && '🎯'}
                    <span className="tool-name">{tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
                  </button>
                ))}
              </div>
              
              <div className="control-group">
                <span className="control-label">Colors:</span>
                <ColorPicker
                  colors={activePalette.colors}
                  selectedColor={studio.primaryColor}
                  onSelectColor={setPrimaryColor}
                />
                <button
                  className="control-btn swap-btn"
                  onClick={() => {
                    const temp = studio.primaryColor;
                    setPrimaryColor(studio.secondaryColor);
                    setSecondaryColor(temp);
                  }}
                >
                  ⇄
                </button>
              </div>
              
              <div className="control-group">
                <span className="control-label">Scale:</span>
                {CANVAS_SCALE_OPTIONS.map((scale) => (
                  <button
                    key={scale}
                    className={`control-btn ${canvasScale === scale ? 'active' : ''}`}
                    onClick={() => setCanvasScale(scale)}
                  >
                    {scale}×
                  </button>
                ))}
              </div>
              
              <div className="control-group">
                <button className="control-btn" onClick={() => clearLayer()}>Clear</button>
                <button className="control-btn" onClick={() => undo()}>↩ Undo</button>
                <button className="control-btn" onClick={() => redo()}>↪ Redo</button>
              </div>
            </div>
          </main>

          {/* Properties Panel */}
          <aside className="properties-panel">
            <div className="panel-header">
              <h2>Properties</h2>
            </div>
            {selectedSprite ? (
              <div className="sprite-properties">
                <div className="property-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={selectedSprite.name}
                    onChange={(e) => {
                      const updatedSprite = { ...selectedSprite, name: e.target.value };
                      setSelectedSprite(updatedSprite);
                      setActiveSprite(updatedSprite);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <div className="property-group">
                  <label>Resolution</label>
                  <select
                    value={selectedSprite.resolution}
                    onChange={(e) => {
                      const resolution = Number(e.target.value) as Resolution;
                      const updatedSprite = { ...selectedSprite, resolution };
                      setSelectedSprite(updatedSprite);
                      setActiveSprite(updatedSprite);
                      setNewSpriteResolution(resolution);
                      setIsDirty(true);
                    }}
                  >
                    {VALID_RESOLUTIONS.map((res) => (
                      <option key={res} value={res}>{res}×{res}</option>
                    ))}
                  </select>
                </div>
                <div className="property-group">
                  <label>Role</label>
                  <span>{selectedSprite.role.replace('_', ' ')}</span>
                </div>
                <div className="property-group">
                  <label>Palette</label>
                  <select
                    value={studio.activePalette}
                    onChange={(e) => setActivePalette(e.target.value as any)}
                  >
                    {ALL_PALETTES.map((palette) => (
                      <option key={palette.id} value={palette.id}>{palette.name}</option>
                    ))}
                  </select>
                </div>
                <div className="property-group">
                  <label>Hitboxes</label>
                  <span>{selectedSprite.hitboxes?.length || 0} defined</span>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => {
                      addHitbox({
                        id: generateId(),
                        name: 'hitbox_1',
                        shape: 'rectangle',
                        x: 0,
                        y: 0,
                        width: 16,
                        height: 16,
                        color: '#ff0000',
                      });
                    }}
                  >
                    + Add Hitbox
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel-empty">
                <span className="empty-icon">📋</span>
                <p>Select a sprite to view properties</p>
              </div>
            )}
          </aside>
        </div>

        {/* Frame Animation Preview */}
        <div className="frame-preview">
          <h3>Frame Animation Preview</h3>
          <div className="preview-area">
            {selectedSprite ? (
              <span className="preview-ready">
                Animation system ready (Phase 4 feature)
              </span>
            ) : (
              <span className="preview-placeholder">
                Select a sprite to preview animations
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
