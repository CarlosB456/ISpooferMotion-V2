import { invoke } from '@tauri-apps/api/core';
import { FolderOpen, Settings2, Trash2 } from 'lucide-react';

import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { logIsm } from '../../../utils/robloxProfiles';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

export default function DebugCard() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();

  async function handleClearCache(successMessage = 'Cache cleared.') {
    try {
      await Promise.all([
        invoke('clear_asset_cache'),
        invoke('clear_plugin_cache'),
        invoke('clear_app_cache'),
      ]);

      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith('ISpooferMotion_DetectedGroups_') ||
          key === 'ISpooferMotion_AssetExplorerState'
        ) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      logIsm('success', successMessage);
    } catch (err) {
      logIsm('error', `Failed to clear cache: ${String(err)}`);
    }
  }

  const handleCacheChange = async (enabled: boolean) => {
    updateConfig('debug', 'enableCache', enabled);
    if (enabled) {
      logIsm('success', 'Cache enabled.');
      return;
    }
    await handleClearCache('Cache disabled. Cached runtime data cleared.');
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 size={18} className="text-primary" />
          {t('settings.debugDisplay')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground leading-none">
            {t('settings.debugMode')}
          </Label>
          <Switch
            checked={config.debug.debugMode}
            onCheckedChange={(v) => updateConfig('debug', 'debugMode', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground leading-none">
            {t('settings.enableCache')}
          </Label>
          <Switch checked={config.debug.enableCache} onCheckedChange={handleCacheChange} />
        </div>

        <div className="mt-2 w-full flex gap-2">
          <Button
            variant="outline"
            className="w-full flex-1"
            onClick={() => void handleClearCache()}
          >
            <Trash2 size={16} className="mr-2" />
            {t('settings.clearCache')}
          </Button>

          <Button
            variant="outline"
            className="w-full flex-1"
            onClick={() =>
              invoke('open_logs_folder').catch((err) =>
                logIsm('error', `Failed to open logs folder: ${String(err)}`),
              )
            }
          >
            <FolderOpen size={16} className="mr-2" />
            {t('settings.openLogsFolder')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
