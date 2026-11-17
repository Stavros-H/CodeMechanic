/**
 * Studio Store
 * 
 * Zustand store for managing Pixel & Hitbox Studio state (Phase 4)
 * This store manages:
 * - Active sprite and selection
 * - Canvas state and layers
 * - Drawing tools and colors
 * - Animation frames
 * - Hitbox editing
 * - Undo/redo history
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  StudioState,
  DrawingTool,
  DrawingMode,
  PixelData,
  SelectionBox,
  StudioHitbox,
  AnimationState,
  AnimationFrame,
  PaletteId,
  calculateBounds,
  getDefaultPalette,
} from '../types';
import { Sprite, EntityRole, Resolution } from '@/schemas/projectSchemas';

// ============================================================================
// Initial State
// ============================================================================

function getInitialCanvasState(resolution: Resolution = 32): CanvasState {
  return {
    width: resolution,
    height: resolution,
    scale: 1,
    gridSize: 1,
    showGrid: true,
    showHitboxes: true,
  };
}

function getInitialLayers(resolution: Resolution = 32): CanvasLayer[] {
  return [
    {
      id: 'art-layer',
      name: 'Art Layer',
      type: 'art',
      visible: true,
      opacity: 1,
      pixels: [],
    },
    {
      id: 'hitbox-layer',
      name: 'Hitbox Layer',
      type: 'hitbox',
      visible: true,
      opacity: 0.7,
      pixels: [],
    },
  ];
}

function getInitialHitboxLayer(): HitboxLayer {
  return {
    hitboxes: [],
    showCollision: true,
  };
}

const initialState: StudioState = {
  // Active sprite
  activeSpriteId: null,
  activeSprite: null,
  
  // Canvas
  canvas: getInitialCanvasState(),
  layers: getInitialLayers(),
  activeLayerId: 'art-layer',
  
  // Tools
  activeTool: 'pencil',
  drawingMode: 'pixel',
  
  // Colors
  primaryColor: '#FF004D', // PICO-8 red
  secondaryColor: '#00E436', // PICO-8 green
  activePalette: 'pico8',
  
  // Selection
  selection: {
    isSelecting: false,
    box: null,
    selectedPixels: [],
  },
  
  // Animation
  currentAnimationState: 'idle',
  currentFrameIndex: 0,
  isPlaying: false,
  
  // Hitbox
  hitboxLayer: getInitialHitboxLayer(),
  activeHitboxId: null,
  
  // History
  history: [],
  historyIndex: -1,
  
  // Dirty state
  isDirty: false,
};

// ============================================================================
// Store Definition
// ============================================================================

interface StudioStore {
  // State
  studio: StudioState;
  
  // Actions
  // Sprite actions
  setActiveSprite: (sprite: Sprite | null) => void;
  
  // Canvas actions
  setCanvasSize: (width: number, height: number) => void;
  setShowGrid: (show: boolean) => void;
  setShowHitboxes: (show: boolean) => void;
  setActiveLayer: (layerId: string) => void;
  
  // Tool actions
  setActiveTool: (tool: DrawingTool) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  
  // Color actions
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setActivePalette: (paletteId: PaletteId) => void;
  swapColors: () => void;
  
  // Drawing actions
  drawPixel: (pixel: PixelData) => void;
  drawPixels: (pixels: PixelData[]) => void;
  erasePixel: (pixel: PixelData) => void;
  fillArea: (x: number, y: number, color: string) => void;
  clearLayer: (layerId?: string) => void;
  clearSelection: () => void;
  
  // Selection actions
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  
  // Hitbox actions
  addHitbox: (hitbox: StudioHitbox) => void;
  updateHitbox: (hitbox: StudioHitbox) => void;
  deleteHitbox: (hitboxId: string) => void;
  setActiveHitbox: (hitboxId: string | null) => void;
  
  // Animation actions
  setCurrentAnimationState: (state: AnimationState) => void;
  setCurrentFrameIndex: (index: number) => void;
  addFrame: (state: AnimationState, frame: AnimationFrame) => void;
  updateFrame: (state: AnimationState, index: number, frame: AnimationFrame) => void;
  deleteFrame: (state: AnimationState, index: number) => void;
  playAnimation: () => void;
  stopAnimation: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // Dirty state
  setDirty: (dirty: boolean) => void;
  
  // Utility getters
  getActiveLayer: () => CanvasLayer | undefined;
  getLayerById: (layerId: string) => CanvasLayer | undefined;
  getSelectedBounds: () => Bounds | null;
  getSpriteBounds: (spriteId: string) => Bounds | null;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useStudioStore = create<StudioStore>()(
  devtools(
    persist(
      (set, get) => ({
        studio: initialState,
        
        // Sprite actions
        setActiveSprite: (sprite) => {
          set({
            studio: {
              ...get().studio,
              activeSprite: sprite,
              activeSpriteId: sprite?.id || null,
            },
          });
        },
        
        // Canvas actions
        setCanvasSize: (width, height) => {
          const newCanvas = {
            ...get().studio.canvas,
            width,
            height,
          };
          set({
            studio: {
              ...get().studio,
              canvas: newCanvas,
            },
          });
        },
        
        setShowGrid: (show) => {
          set({
            studio: {
              ...get().studio,
              canvas: {
                ...get().studio.canvas,
                showGrid: show,
              },
            },
          });
        },
        
        setShowHitboxes: (show) => {
          set({
            studio: {
              ...get().studio,
              canvas: {
                ...get().studio.canvas,
                showHitboxes: show,
              },
            },
          });
        },
        
        setActiveLayer: (layerId) => {
          set({
            studio: {
              ...get().studio,
              activeLayerId: layerId,
            },
          });
        },
        
        // Tool actions
        setActiveTool: (tool) => {
          set({
            studio: {
              ...get().studio,
              activeTool: tool,
            },
          });
        },
        
        setDrawingMode: (mode) => {
          set({
            studio: {
              ...get().studio,
              drawingMode: mode,
            },
          });
        },
        
        // Color actions
        setPrimaryColor: (color) => {
          set({
            studio: {
              ...get().studio,
              primaryColor: color,
            },
          });
        },
        
        setSecondaryColor: (color) => {
          set({
            studio: {
              ...get().studio,
              secondaryColor: color,
            },
          });
        },
        
        setActivePalette: (paletteId) => {
          set({
            studio: {
              ...get().studio,
              activePalette: paletteId,
            },
          });
        },
        
        swapColors: () => {
          const { primaryColor, secondaryColor } = get().studio;
          set({
            studio: {
              ...get().studio,
              primaryColor: secondaryColor,
              secondaryColor: primaryColor,
            },
          });
        },
        
        // Drawing actions
        drawPixel: (pixel) => {
          const layer = get().getActiveLayer();
          if (!layer) return;
          
          const newLayer = {
            ...layer,
            pixels: [...layer.pixels, pixel],
          };
          
          set({
            studio: {
              ...get().studio,
              layers: get().studio.layers.map((l) =>
                l.id === layer.id ? newLayer : l
              ),
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        drawPixels: (pixels) => {
          const layer = get().getActiveLayer();
          if (!layer) return;
          
          const newLayer = {
            ...layer,
            pixels: [...layer.pixels, ...pixels],
          };
          
          set({
            studio: {
              ...get().studio,
              layers: get().studio.layers.map((l) =>
                l.id === layer.id ? newLayer : l
              ),
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        erasePixel: (pixel) => {
          const layer = get().getActiveLayer();
          if (!layer) return;
          
          const newLayer = {
            ...layer,
            pixels: layer.pixels.filter(
              (p) => !(p.x === pixel.x && p.y === pixel.y)
            ),
          };
          
          set({
            studio: {
              ...get().studio,
              layers: get().studio.layers.map((l) =>
                l.id === layer.id ? newLayer : l
              ),
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        fillArea: (x, y, color) => {
          // Flood fill algorithm
          const layer = get().getActiveLayer();
          if (!layer) return;
          
          const targetColor = layer.pixels.find(
            (p) => p.x === x && p.y === y
          )?.color;
          
          if (!targetColor || targetColor === color) return;
          
          const newPixels = floodFill(layer.pixels, x, y, targetColor, color);
          
          const newLayer = {
            ...layer,
            pixels: newPixels,
          };
          
          set({
            studio: {
              ...get().studio,
              layers: get().studio.layers.map((l) =>
                l.id === layer.id ? newLayer : l
              ),
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        clearLayer: (layerId?) => {
          const targetLayerId = layerId || get().studio.activeLayerId;
          const newLayers = get().studio.layers.map((layer) =>
            layer.id === targetLayerId ? { ...layer, pixels: [] } : layer
          );
          
          set({
            studio: {
              ...get().studio,
              layers: newLayers,
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        clearSelection: () => {
          set({
            studio: {
              ...get().studio,
              selection: {
                isSelecting: false,
                box: null,
                selectedPixels: [],
              },
            },
          });
        },
        
        // Selection actions
        startSelection: (x, y) => {
          set({
            studio: {
              ...get().studio,
              selection: {
                isSelecting: true,
                box: { x, y, width: 0, height: 0 },
                selectedPixels: [],
              },
            },
          });
        },
        
        updateSelection: (x, y) => {
          const { selection } = get().studio;
          if (!selection.isSelecting || !selection.box) return;
          
          const width = x - selection.box.x;
          const height = y - selection.box.y;
          
          set({
            studio: {
              ...get().studio,
              selection: {
                ...selection,
                box: {
                  ...selection.box,
                  width,
                  height,
                },
              },
            },
          });
        },
        
        endSelection: () => {
          const { selection, layers, activeLayerId } = get().studio;
          if (!selection.box || !activeLayerId) return;
          
          const layer = layers.find((l) => l.id === activeLayerId);
          if (!layer) return;
          
          // Get all pixels within the selection box
          const selectedPixels = layer.pixels.filter((pixel) =>
            pixel.x >= selection.box!.x &&
            pixel.x <= selection.box!.x + selection.box!.width &&
            pixel.y >= selection.box!.y &&
            pixel.y <= selection.box!.y + selection.box!.height
          );
          
          set({
            studio: {
              ...get().studio,
              selection: {
                isSelecting: false,
                box: selection.box,
                selectedPixels,
              },
            },
          });
        },
        
        // Hitbox actions
        addHitbox: (hitbox) => {
          const newHitboxes = [...get().studio.hitboxLayer.hitboxes, hitbox];
          
          set({
            studio: {
              ...get().studio,
              hitboxLayer: {
                ...get().studio.hitboxLayer,
                hitboxes: newHitboxes,
              },
              activeHitboxId: hitbox.id,
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        updateHitbox: (hitbox) => {
          const newHitboxes = get().studio.hitboxLayer.hitboxes.map((h) =>
            h.id === hitbox.id ? hitbox : h
          );
          
          set({
            studio: {
              ...get().studio,
              hitboxLayer: {
                ...get().studio.hitboxLayer,
                hitboxes: newHitboxes,
              },
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        deleteHitbox: (hitboxId) => {
          const newHitboxes = get().studio.hitboxLayer.hitboxes.filter(
            (h) => h.id !== hitboxId
          );
          
          set({
            studio: {
              ...get().studio,
              hitboxLayer: {
                ...get().studio.hitboxLayer,
                hitboxes: newHitboxes,
              },
              activeHitboxId: null,
              isDirty: true,
            },
          });
          
          get().saveToHistory();
        },
        
        setActiveHitbox: (hitboxId) => {
          set({
            studio: {
              ...get().studio,
              activeHitboxId: hitboxId,
            },
          });
        },
        
        // Animation actions
        setCurrentAnimationState: (state) => {
          set({
            studio: {
              ...get().studio,
              currentAnimationState: state,
              currentFrameIndex: 0,
            },
          });
        },
        
        setCurrentFrameIndex: (index) => {
          set({
            studio: {
              ...get().studio,
              currentFrameIndex: index,
            },
          });
        },
        
        addFrame: (state, frame) => {
          // This would be implemented with actual sprite data
          set({
            studio: {
              ...get().studio,
              isDirty: true,
            },
          });
        },
        
        updateFrame: (state, index, frame) => {
          set({
            studio: {
              ...get().studio,
              isDirty: true,
            },
          });
        },
        
        deleteFrame: (state, index) => {
          set({
            studio: {
              ...get().studio,
              isDirty: true,
            },
          });
        },
        
        playAnimation: () => {
          set({
            studio: {
              ...get().studio,
              isPlaying: true,
            },
          });
        },
        
        stopAnimation: () => {
          set({
            studio: {
              ...get().studio,
              isPlaying: false,
              currentFrameIndex: 0,
            },
          });
        },
        
        // History actions
        saveToHistory: () => {
          const { history, historyIndex, studio } = get();
          
          // If we're not at the end of history, truncate
          const newHistory = history.slice(0, historyIndex + 1);
          const newLayers = studio.layers.map((layer) => ({
            ...layer,
            pixels: [...layer.pixels],
          }));
          
          newHistory.push(newLayers);
          
          set({
            studio: {
              ...studio,
              history: newHistory,
              historyIndex: newHistory.length - 1,
            },
          });
        },
        
        undo: () => {
          const { history, historyIndex } = get().studio;
          
          if (historyIndex <= 0) return;
          
          const newIndex = historyIndex - 1;
          const previousLayers = history[newIndex];
          
          set({
            studio: {
              ...get().studio,
              layers: previousLayers,
              historyIndex: newIndex,
            },
          });
        },
        
        redo: () => {
          const { history, historyIndex } = get().studio;
          
          if (historyIndex >= history.length - 1) return;
          
          const newIndex = historyIndex + 1;
          const nextLayers = history[newIndex];
          
          set({
            studio: {
              ...get().studio,
              layers: nextLayers,
              historyIndex: newIndex,
            },
          });
        },
        
        // Dirty state
        setDirty: (dirty) => {
          set({
            studio: {
              ...get().studio,
              isDirty: dirty,
            },
          });
        },
        
        // Utility getters
        getActiveLayer: () => {
          return get().studio.layers.find(
            (l) => l.id === get().studio.activeLayerId
          );
        },
        
        getLayerById: (layerId) => {
          return get().studio.layers.find((l) => l.id === layerId);
        },
        
        getSelectedBounds: () => {
          return calculateBounds(get().studio.selection.selectedPixels);
        },
        
        getSpriteBounds: (spriteId) => {
          // This would calculate bounds for a specific sprite
          return null;
        },
      }),
      {
        name: 'studio-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          studio: {
            activeSpriteId: state.studio.activeSpriteId,
            canvas: state.studio.canvas,
            activeLayerId: state.studio.activeLayerId,
            activeTool: state.studio.activeTool,
            drawingMode: state.studio.drawingMode,
            primaryColor: state.studio.primaryColor,
            secondaryColor: state.studio.secondaryColor,
            activePalette: state.studio.activePalette,
            hitboxLayer: state.studio.hitboxLayer,
            activeHitboxId: state.studio.activeHitboxId,
          },
        }),
      }
    ),
    { name: 'StudioStore' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Flood fill algorithm for bucket tool
 */
function floodFill(
  pixels: PixelData[],
  x: number,
  y: number,
  targetColor: string,
  replacementColor: string
): PixelData[] {
  const visited = new Set<string>();
  const stack: [number, number][] = [[x, y]];
  const result: PixelData[] = [];
  
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    const key = `${cx},${cy}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // Find pixel at this position
    const pixel = pixels.find((p) => p.x === cx && p.y === cy);
    
    if (pixel && pixel.color === targetColor) {
      result.push({ x: cx, y: cy, color: replacementColor });
      
      // Add neighbors to stack
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }
  }
  
  // Merge with existing pixels
  const pixelMap = new Map<string, PixelData>();
  
  // Add existing pixels (excluding filled area)
  for (const pixel of pixels) {
    const key = `${pixel.x},${pixel.y}`;
    if (!visited.has(key)) {
      pixelMap.set(key, pixel);
    }
  }
  
  // Add new pixels
  for (const pixel of result) {
    const key = `${pixel.x},${pixel.y}`;
    pixelMap.set(key, pixel);
  }
  
  return Array.from(pixelMap.values());
}

// ============================================================================
// Exports
// ============================================================================

export type { StudioState };
export default useStudioStore;
