import { invoke } from '@tauri-apps/api/core';

import { DEFAULT_PLUGIN_PORT, findPluginBridgePort } from './pluginBridge';

// pushes a batch of replaced asset IDs to the roblox studio plugin so it can rewrite scripts and instances
export async function queueStudioReplacements(
  replacements: Record<string, string>,
  preferredPort?: string,
) {
  if (Object.keys(replacements).length === 0) {
    throw new Error('No new spoofed assets found to apply to Studio.');
  }
  const pluginPort =
    (await findPluginBridgePort(preferredPort)) || preferredPort || DEFAULT_PLUGIN_PORT;
  const result = await invoke<string | boolean>('push_to_studio', {
    replacementsMap: replacements,
    pluginPort,
  });
  // legacy bool support: true == ok, false == generic failure
  const reason = typeof result === 'boolean' ? (result ? 'ok' : 'bridge_unavailable') : result;
  if (reason === 'ok') return;

  switch (reason) {
    case 'empty_mappings':
      throw new Error(
        'No usable replacements were generated. Every successful asset was either already cached, downloaded-only, or had no new ID assigned.',
      );
    case 'plugin_not_connected':
      throw new Error(
        "Couldn't reach the Roblox Studio plugin. Open Studio, make sure the ISpooferMotion plugin is installed and enabled, then click Scan Studio before retrying.",
      );
    case 'bridge_unavailable':
      throw new Error(
        'The internal studio bridge is not running. Restart ISpooferMotion (ports 14285-14289 may have been in use at startup).',
      );
    default:
      throw new Error(`Studio replacement queue rejected the mappings (${reason}).`);
  }
}
