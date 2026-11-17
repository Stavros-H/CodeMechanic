/**
 * Studio Types
 * 
 * Type definitions for the Pixel & Hitbox Studio (Phase 4)
 */

import { EntityRole, Resolution, Sprite } from '@/schemas/projectSchemas';

// ============================================================================
// Drawing Tools
// ============================================================================

export type DrawingTool = 
  | 'pencil'
  | 'bucket'
  | 'eraser'
  | 'eyedropper'
  | 'rectangle'
  | 'circle'
  | 'line';

export type DrawingMode = 'pixel' | 'shape';

// ============================================================================
// Canvas
// ============================================================================

export interface CanvasState {
  width: number;
  height: number;
  scale: number;
  gridSize: number;
  showGrid: boolean;
  showHitboxes: boolean;
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
}

export interface CanvasLayer {
  id: string;
  name: string;
  type: 'art' | 'hitbox';
  visible: boolean;
  opacity: number;
  pixels: PixelData[];
}

// ============================================================================
// Selection
// ============================================================================

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionState {
  isSelecting: boolean;
  box: SelectionBox | null;
  selectedPixels: PixelData[];
}

// ============================================================================
// Animation
// ============================================================================

export type AnimationState = 'idle' | 'run' | 'jump' | 'action' | 'hit' | 'death';

export interface AnimationFrame {
  id: string;
  duration: number; // in milliseconds
  pixels: PixelData[];
}

export interface Animation {
  state: AnimationState;
  frames: AnimationFrame[];
  loop: boolean;
  fps: number;
}

export interface SpriteAnimation {
  [key: string]: Animation;
}

// ============================================================================
// Hitbox
// ============================================================================

export interface StudioHitbox {
  id: string;
  name: string;
  shape: 'rectangle' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
}

export interface HitboxLayer {
  hitboxes: StudioHitbox[];
  showCollision: boolean;
}

// ============================================================================
// Color Palette
// ============================================================================

export type PaletteId = 'pico8' | 'gameboy' | 'nes' | 'cyber-neon';

export interface StudioPalette {
  id: PaletteId;
  name: string;
  colors: string[];
}

// ============================================================================
// Studio State
// ============================================================================

export interface StudioState {
  // Active sprite
  activeSpriteId: string | null;
  activeSprite: Sprite | null;
  
  // Canvas
  canvas: CanvasState;
  layers: CanvasLayer[];
  activeLayerId: string;
  
  // Tools
  activeTool: DrawingTool;
  drawingMode: DrawingMode;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  activePalette: PaletteId;
  
  // Selection
  selection: SelectionState;
  
  // Animation
  currentAnimationState: AnimationState;
  currentFrameIndex: number;
  isPlaying: boolean;
  
  // Hitbox
  hitboxLayer: HitboxLayer;
  activeHitboxId: string | null;
  
  // History (for undo/redo)
  history: CanvasLayer[][];
  historyIndex: number;
  
  // Dirty state
  isDirty: boolean;
}

// ============================================================================
// Actions
// ============================================================================

export type StudioAction =
  | { type: 'SET_ACTIVE_SPRITE'; payload: string }
  | { type: 'SET_ACTIVE_TOOL'; payload: DrawingTool }
  | { type: 'SET_DRAWING_MODE'; payload: DrawingMode }
  | { type: 'SET_PRIMARY_COLOR'; payload: string }
  | { type: 'SET_SECONDARY_COLOR'; payload: string }
  | { type: 'SET_ACTIVE_PALETTE'; payload: PaletteId }
  | { type: 'SET_CANVAS_SIZE'; payload: { width: number; height: number } }
  | { type: 'SET_SHOW_GRID'; payload: boolean }
  | { type: 'SET_SHOW_HITBOXES'; payload: boolean }
  | { type: 'DRAW_PIXEL'; payload: PixelData }
  | { type: 'DRAW_PIXELS'; payload: PixelData[] }
  | { type: 'ERASE_PIXEL'; payload: PixelData }
  | { type: 'FILL_AREA'; payload: { x: number; y: number; color: string } }
  | { type: 'SELECT_AREA'; payload: SelectionBox }
  | { type: 'ADD_HITBOX'; payload: StudioHitbox }
  | { type: 'UPDATE_HITBOX'; payload: StudioHitbox }
  | { type: 'DELETE_HITBOX'; payload: string }
  | { type: 'ADD_FRAME'; payload: { state: AnimationState; frame: AnimationFrame } }
  | { type: 'UPDATE_FRAME'; payload: { state: AnimationState; index: number; frame: AnimationFrame } }
  | { type: 'DELETE_FRAME'; payload: { state: AnimationState; index: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_SELECTION' }
  | { type: 'SET_DIRTY'; payload: boolean };

// ============================================================================
// Resolution Validation
// ============================================================================

export const VALID_RESOLUTIONS: Resolution[] = [16, 32, 64];

export function isValidResolution(resolution: number): resolution is Resolution {
  return VALID_RESOLUTIONS.includes(resolution as Resolution);
}

export function getResolutionOptions(): { value: Resolution; label: string }[] {
  return VALID_RESOLUTIONS.map((res) => ({
    value: res,
    label: `${res}×${res}`,
  }));
}

// ============================================================================
// Entity Categories
// ============================================================================

export interface EntityCategory {
  label: string;
  roles: EntityRole[];
  icon?: string;
}

export const ENTITY_CATEGORIES: EntityCategory[] = [
  { label: 'Players', roles: ['player_1', 'player_2'], icon: '👤' },
  { label: 'Enemies', roles: ['enemy'], icon: '👹' },
  { label: 'Hazards', roles: ['hazard'], icon: '⚠️' },
  { label: 'Items', roles: ['pickup', 'goal'], icon: '✨' },
  { label: 'Environment', roles: ['tile'], icon: '⬛' },
];

// ============================================================================
// Auto-Bounds
// ============================================================================

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function calculateBounds(pixels: PixelData[]): Bounds | null {
  if (pixels.length === 0) {
    return null;
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const pixel of pixels) {
    minX = Math.min(minX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxX = Math.max(maxX, pixel.x);
    maxY = Math.max(maxY, pixel.y);
  }
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
