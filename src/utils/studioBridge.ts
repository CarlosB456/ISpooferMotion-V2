import { invoke } from '@tauri-apps/api/core';

import { DEFAULT_PLUGIN_PORT, findPluginBridgePort } from './pluginBridge';

export async function queueStudioReplacements(replacements: Record<string, string>) {
  if (Object.keys(replacements).length === 0) {
    console.log('No new spoofed assets found to apply to Studio.');
    return;
  }
  const pluginPort = (await findPluginBridgePort()) || DEFAULT_PLUGIN_PORT;
  try {
    await invoke<string | boolean>('push_to_studio', {
      replacementsMap: replacements,
      pluginPort,
    });
  } catch (err) {
    console.warn('Studio replacement push failed, but ignoring to prevent errors:', err);
  }
}
