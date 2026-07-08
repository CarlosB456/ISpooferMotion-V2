export type {
  ParsedAssetRef,
  ParseProgress,
  ParseProgressCallback,
  PlaceParseResult,
  RbxInstance,
} from './types';

import type { ParseProgressCallback, PlaceParseResult, RobloxFileType } from './types';

// magic byte detection to figure out if it's binary (.rbxl) or xml (.rbxlx)
function detectFormat(fileName: string, bytes: Uint8Array): RobloxFileType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.rbxlx')) return 'rbxlx';
  if (lower.endsWith('.rbxl')) {
    const MAGIC_START = '<roblox!';
    if (bytes.length >= 8) {
      const start = String.fromCharCode(...bytes.slice(0, 8));
      if (start === MAGIC_START) return 'rbxl';
    }

    const head = new TextDecoder().decode(bytes.slice(0, 64)).trimStart();
    if (head.startsWith('<?xml') || head.startsWith('<roblox')) return 'rbxlx';
    return 'rbxl';
  }
  return 'unknown';
}

// spins up a web worker to parse the place file so we don't lock up the main thread
export async function parsePlaceBytesInWorker(
  bytes: Uint8Array,
  fileName: string,
  onProgress?: ParseProgressCallback,
): Promise<PlaceParseResult> {
  const fmt = detectFormat(fileName, bytes);

  if (fmt === 'rbxl' || fmt === 'rbxlx') {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'progress' && onProgress) {
          onProgress(payload);
        } else if (type === 'success') {
          resolve(payload);
          worker.terminate();
        } else if (type === 'error') {
          reject(new Error(payload));
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage({ bytes, fileName, format: fmt }, [bytes.buffer]);
    });
  }

  return {
    fileType: 'unknown',
    rootInstances: [],
    warnings: [`"${fileName}" does not have a recognised Roblox place extension (.rbxl / .rbxlx).`],
  };
}

export async function parsePlaceUrlInWorker(
  fileUrl: string,
  fileName: string,
  onProgress?: ParseProgressCallback,
): Promise<PlaceParseResult> {
  const lower = fileName.toLowerCase();
  let fmt: RobloxFileType = 'unknown';
  if (lower.endsWith('.rbxlx')) fmt = 'rbxlx';
  else if (lower.endsWith('.rbxl')) fmt = 'rbxl';

  if (fmt === 'rbxl' || fmt === 'rbxlx') {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'progress' && onProgress) {
          onProgress(payload);
        } else if (type === 'success') {
          resolve(payload);
          worker.terminate();
        } else if (type === 'error') {
          reject(new Error(payload));
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage({ fileUrl, fileName, format: fmt });
    });
  }

  return {
    fileType: 'unknown',
    rootInstances: [],
    warnings: [`"${fileName}" does not have a recognised Roblox place extension (.rbxl / .rbxlx).`],
  };
}
