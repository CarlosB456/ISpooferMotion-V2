import { addDebugLog } from './debugLogger';
import { findPluginBridgePort } from './pluginBridge';
import { isTauriRuntime } from './tauriRuntime';

/**
 * Safely fetches the current active Place ID from Studio when the Tauri bridge state isn't perfectly in sync.
 *
 * First checks local storage cache (updated by the heartbeat). If that fails, it manually
 * pings the local Studio HTTP server directly as a last resort before giving up.
 */
export async function getStudioPlaceIdFallback(): Promise<string> {
  try {
    const cached = window.localStorage.getItem('ISpooferMotion_LastStudioPlaceId') || '';
    if (/^\d+$/.test(cached) && cached !== '0') return cached;
  } catch (e) {
    addDebugLog('warn', ['Failed to read cached Studio place ID', e]);
  }

  // Tauri state might not be synced immediately after clicking.
  // Fallback: ping the local Studio plugin for the PlaceId.
  try {
    const activePort = await findPluginBridgePort();
    if (!activePort) return '';
    const response = await fetch(`http://localhost:${activePort}/studio-health?t=${Date.now()}`, {
      signal: AbortSignal.timeout(800),
      cache: 'no-store',
    });
    if (!response.ok) return '';
    const result = (await response.json()) as { studioPlaceId?: string };
    const placeId = String(result.studioPlaceId || '').trim();
    return /^\d+$/.test(placeId) && placeId !== '0' ? placeId : '';
  } catch (e) {
    addDebugLog('warn', ['Failed to ping Studio for fallback placeId', e]);
    return '';
  }
}

/**
 * Wrapper for HTTP requests that automatically routes through Tauri's native networking layer
 * if we're in the desktop app, or standard browser fetch if running in a webview debug environment.
 */
export async function fetchTelemetry(url: string, options?: RequestInit): Promise<Response> {
  if (isTauriRuntime()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    // @ts-ignore
    return tauriFetch(url, options);
  } else {
    return fetch(url, options);
  }
}
