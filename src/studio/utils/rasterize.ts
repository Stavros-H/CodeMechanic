import { PixelData } from '../types';

export interface ShapeDraw {
  type: 'rectangle' | 'circle' | 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export function rasterizeRectangle(shape: ShapeDraw): PixelData[] {
  const pixels: PixelData[] = [];
  for (let y = shape.y1; y <= shape.y2; y++) {
    for (let x = shape.x1; x <= shape.x2; x++) {
      pixels.push({ x, y, color: shape.color });
    }
  }
  return pixels;
}

export function rasterizeCircle(shape: ShapeDraw): PixelData[] {
  const pixels: PixelData[] = [];
  const centerX = (shape.x1 + shape.x2) / 2;
  const centerY = (shape.y1 + shape.y2) / 2;
  const radiusX = Math.abs(shape.x2 - shape.x1) / 2;
  const radiusY = Math.abs(shape.y2 - shape.y1) / 2;

  for (let y = shape.y1; y <= shape.y2; y++) {
    for (let x = shape.x1; x <= shape.x2; x++) {
      const dx = (x - centerX) / (radiusX || 0.5);
      const dy = (y - centerY) / (radiusY || 0.5);
      if (dx * dx + dy * dy <= 1) {
        pixels.push({ x, y, color: shape.color });
      }
    }
  }
  return pixels;
}

export function rasterizeLine(shape: ShapeDraw): PixelData[] {
  const pixels: PixelData[] = [];
  let { x1, y1 } = shape;
  const { x2, y2 } = shape;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    pixels.push({ x: x1, y: y1, color: shape.color });
    if (x1 === x2 && y1 === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x1 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y1 += sy;
    }
  }
  return pixels;
}

export function rasterizeShape(shape: ShapeDraw): PixelData[] {
  switch (shape.type) {
    case 'rectangle':
      return rasterizeRectangle(shape);
    case 'circle':
      return rasterizeCircle(shape);
    case 'line':
      return rasterizeLine(shape);
  }
}
