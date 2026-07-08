import { invoke } from '@tauri-apps/api/core';

import { DEFAULT_PLUGIN_PORT, findPluginBridgePort } from './pluginBridge';

export async function queueStudioReplacements(replacements: Record<string, string>) {
  if (Object.keys(replacements).length === 0) {
    console.log('No new spoofed assets found to apply to Studio.');
    return;
  }
  const pluginPort = (await findPluginBridgePort()) || DEFAULT_PLUGIN_PORT;
  const result = await invoke<string | boolean>('push_to_studio', {
    replacementsMap: replacements,
    pluginPort,
  });
  // The Rust command returns machine-readable strings on failure rather than Err().
  // Translate them into thrown errors so callers get accurate feedback.
  if (result === 'plugin_not_connected' || result === 'bridge_unavailable') {
    throw new Error(
      'Could not reach the ISpooferMotion Studio plugin. Make sure Studio is open and the plugin is connected, then try again.',
    );
  }
  if (result === 'empty_mappings') {
    throw new Error('No valid asset mappings were found to send to Studio.');
  }
}

