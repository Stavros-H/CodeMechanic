/**
 * Drawing Tools Hook
 * 
 * Custom hook for handling drawing operations in the Pixel & Hitbox Studio
 */

import { useCallback, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { PixelData, DrawingTool } from '../types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Bresenham's line algorithm for drawing straight lines
 */
export function bresenhamLine(x1: number, y1: number, x2: number, y2: number): PixelData[] {
  const points: PixelData[] = [];
  
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (true) {
    points.push({ x, y, color: '' });
    
    if (x === x2 && y === y2) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  
  return points;
}

/**
 * Draw a filled rectangle
 */
export function drawRectangle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
): PixelData[] {
  const pixels: PixelData[] = [];
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      pixels.push({ x, y, color });
    }
  }
  
  return pixels;
}

/**
 * Draw a circle using midpoint algorithm
 */
export function drawCircle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
): PixelData[] {
  const pixels: PixelData[] = [];
  
  // Calculate radius and center
  const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const centerX = Math.round((x1 + x2) / 2);
  const centerY = Math.round((y1 + y2) / 2);
  
  // Midpoint circle algorithm
  let x = 0;
  let y = Math.round(radius);
  let d = 1 - radius;
  
  const addPixel = (px: number, py: number) => {
    pixels.push(
      { x: centerX + px, y: centerY + py, color },
      { x: centerX - px, y: centerY + py, color },
      { x: centerX + px, y: centerY - py, color },
      { x: centerX - px, y: centerY - py, color },
      { x: centerX + py, y: centerY + px, color },
      { x: centerX - py, y: centerY + px, color },
      { x: centerX + py, y: centerY - px, color },
      { x: centerX - py, y: centerY - px, color }
    );
  };
  
  addPixel(x, y);
  
  while (y > x) {
    if (d < 0) {
      d += 2 * x + 3;
    } else {
      d += 2 * (x - y) + 5;
      y--;
    }
    x++;
    addPixel(x, y);
  }
  
  return pixels;
}

/**
 * Draw a filled circle
 */
export function drawFilledCircle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
): PixelData[] {
  const pixels: PixelData[] = [];
  
  // Calculate radius and center
  const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const centerX = Math.round((x1 + x2) / 2);
  const centerY = Math.round((y1 + y2) / 2);
  
  // Simple filled circle by checking distance
  const radiusSquared = radius * radius;
  
  for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++) {
    for (let y = -Math.ceil(radius); y <= Math.ceil(radius); y++) {
      if (x * x + y * y <= radiusSquared) {
        pixels.push({ x: centerX + x, y: centerY + y, color });
      }
    }
  }
  
  return pixels;
}

// ============================================================================
// Hook
// ============================================================================

interface ShapeDrawResult {
  pixels: PixelData[];
  bounds: { x1: number; y1: number; x2: number; y2: number };
}

export function useDrawingTools() {
  const { drawPixel, drawPixels, erasePixel, setDirty } = useStudioStore();

  /**
   * Draw a single pixel
   */
  const drawSinglePixel = useCallback((x: number, y: number, color: string) => {
    drawPixel({ x, y, color });
    setDirty(true);
  }, [drawPixel, setDirty]);

  /**
   * Erase a single pixel
   */
  const eraseSinglePixel = useCallback((x: number, y: number) => {
    erasePixel({ x, y, color: '' });
    setDirty(true);
  }, [erasePixel, setDirty]);

  /**
   * Draw a shape (rectangle, circle, or line)
   */
  const drawShape = useCallback((
    type: 'rectangle' | 'circle' | 'line',
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    filled: boolean = true
  ): ShapeDrawResult => {
    let pixels: PixelData[] = [];
    
    if (type === 'rectangle') {
      if (filled) {
        pixels = drawRectangle(x1, y1, x2, y2, color);
      } else {
        // Draw outline only
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        
        // Top and bottom
        for (let x = startX; x <= endX; x++) {
          pixels.push({ x, y: startY, color });
          pixels.push({ x, y: endY, color });
        }
        
        // Left and right (excluding corners already drawn)
        for (let y = startY + 1; y < endY; y++) {
          pixels.push({ x: startX, y, color });
          pixels.push({ x: endX, y, color });
        }
      }
    } else if (type === 'circle') {
      if (filled) {
        pixels = drawFilledCircle(x1, y1, x2, y2, color);
      } else {
        pixels = drawCircle(x1, y1, x2, y2, color);
      }
    } else if (type === 'line') {
      const linePixels = bresenhamLine(x1, y1, x2, y2);
      pixels = linePixels.map((p) => ({ ...p, color }));
    }

    // Draw all pixels
    for (const pixel of pixels) {
      drawPixel(pixel);
    }
    setDirty(true);

    return {
      pixels,
      bounds: { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) },
    };
  }, [drawPixel, setDirty]);

  /**
   * Flood fill (bucket tool)
   */
  const floodFill = useCallback((
    x: number,
    y: number,
    targetColor: string,
    replacementColor: string
  ) => {
    const layer = useStudioStore.getState().studio.layers.find(
      (l) => l.id === useStudioStore.getState().studio.activeLayerId
    );
    
    if (!layer) return;

    const visited = new Set<string>();
    const stack: [number, number][] = [[x, y]];
    const result: PixelData[] = [];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Find pixel at this position
      const pixel = layer.pixels.find((p) => p.x === cx && p.y === cy);

      if (pixel && pixel.color === targetColor) {
        result.push({ x: cx, y: cy, color: replacementColor });

        // Add neighbors to stack
        stack.push([cx + 1, cy]);
        stack.push([cx - 1, cy]);
        stack.push([cx, cy + 1]);
        stack.push([cx, cy - 1]);
      }
    }

    // Draw all pixels
    for (const pixel of result) {
      drawPixel(pixel);
    }
    setDirty(true);

    return result;
  }, [drawPixel, setDirty]);

  /**
   * Eyedropper tool - sample color from canvas
   */
  const sampleColor = useCallback((x: number, y: number): string => {
    const layer = useStudioStore.getState().studio.layers.find(
      (l) => l.id === useStudioStore.getState().studio.activeLayerId
    );
    
    if (!layer) return '#000000';

    const pixel = layer.pixels.find((p) => p.x === x && p.y === y);
    return pixel?.color || '#000000';
  }, []);

  return {
    drawSinglePixel,
    eraseSinglePixel,
    drawShape,
    floodFill,
    sampleColor,
  };
}

export default useDrawingTools;
