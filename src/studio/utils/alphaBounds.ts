export interface BoundingBoxResult {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface BoundingBoxResponse {
  bounds: BoundingBoxResult | null;
}

export function analyzeAlphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): BoundingBoxResult | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;

  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
