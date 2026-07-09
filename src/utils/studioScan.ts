import { invoke } from '@tauri-apps/api/core';

import { fetchPluginBridge } from './pluginBridge';

const SCAN_WAIT_MS = 300_000;
const SCAN_POLL_MS = 1500;

// Poll backend until the studio plugin finishes active scan.
async function waitForStudioScanComplete(): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < SCAN_WAIT_MS) {
    try {
      const health = await invoke<{
        scanStatus?: { scanning?: boolean } | null;
        synced?: boolean;
      }>('get_studio_health_status');
      if (!health.scanStatus || !health.scanStatus.scanning) {
        return;
      }
      if (!health.synced && Date.now() - startedAt > 5000) {
        throw new Error(
          'Roblox Studio is not connected or the ISpooferMotion plugin is disabled. Please open Studio and try again.',
        );
      }
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
    await new Promise((resolve) => setTimeout(resolve, SCAN_POLL_MS));
  }
  throw new Error(
    'Studio scan is taking longer than 5 minutes. Open Roblox Studio and check that the ISpooferMotion plugin is connected, then try again. Very large places may need to be scanned manually from the plugin panel.',
  );
}

export async function triggerStudioScan(): Promise<void> {
  const endpoints = [
    '/request-sounds',
    '/request-animations',
    '/request-images',
    '/request-meshes',
    '/request-script-refs',
  ];

  const { findPluginBridgePort, DEFAULT_PLUGIN_PORT } = await import('./pluginBridge');
  const port = (await findPluginBridgePort()) || DEFAULT_PLUGIN_PORT;

  for (const endpoint of endpoints) {
    const startResponse = await fetchPluginBridge(endpoint, port, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!startResponse.ok) {
      throw new Error('Could not start a Studio scan. Is the plugin connected?');
    }
  }

  await waitForStudioScanComplete();
}
