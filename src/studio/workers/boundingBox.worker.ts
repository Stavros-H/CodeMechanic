import { analyzeAlphaBounds } from '../utils/alphaBounds';

self.onmessage = (event: MessageEvent) => {
  const { data, width, height } = event.data as {
    data: ArrayBuffer;
    width: number;
    height: number;
  };

  const pixels = new Uint8ClampedArray(data);
  const bounds = analyzeAlphaBounds(pixels, width, height);

  self.postMessage({ bounds });
};
