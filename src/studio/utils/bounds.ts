import { Bounds } from '../types';
import { BoundingBoxResponse, analyzeAlphaBounds } from './alphaBounds';

export function computeBoundsSync(imageData: ImageData): Bounds | null {
  const result = analyzeAlphaBounds(imageData.data, imageData.width, imageData.height);
  if (!result) return null;
  return {
    minX: result.minX,
    minY: result.minY,
    maxX: result.minX + result.width - 1,
    maxY: result.minY + result.height - 1,
    width: result.width,
    height: result.height,
  };
}

export function computeBoundsFromImageData(imageData: ImageData): Promise<Bounds | null> {
  return new Promise((resolve) => {
    if (typeof Worker === 'undefined') {
      resolve(computeBoundsSync(imageData));
      return;
    }

    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/boundingBox.worker.ts', import.meta.url));
    } catch {
      resolve(computeBoundsSync(imageData));
      return;
    }

    const finish = (bounds: Bounds | null) => {
      worker.terminate();
      resolve(bounds);
    };

    worker.onmessage = (event: MessageEvent<BoundingBoxResponse>) => {
      const result = event.data.bounds;
      finish(
        result
          ? {
              minX: result.minX,
              minY: result.minY,
              maxX: result.minX + result.width - 1,
              maxY: result.minY + result.height - 1,
              width: result.width,
              height: result.height,
            }
          : null
      );
    };

    worker.onerror = () => finish(computeBoundsSync(imageData));

    const buffer = imageData.data.buffer as ArrayBuffer;
    worker.postMessage({ data: buffer, width: imageData.width, height: imageData.height }, [
      buffer,
    ]);
  });
}

export async function loadImageDataFromUrl(url: string): Promise<ImageData | null> {
  const image = new Image();
  image.crossOrigin = 'anonymous';

  return new Promise((resolve) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(image, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
