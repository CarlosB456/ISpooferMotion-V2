import { invoke } from '@tauri-apps/api/core';
import { Sliders } from 'lucide-react';

import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { logIsm } from '../../../utils/robloxProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

export default function BehaviorCard() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();

  const handleDesktopNotificationsChange = async (enabled: boolean) => {
    updateConfig('general', 'desktopNotifications', enabled);
    if (!enabled) {
      logIsm('info', t('misc.notificationsDisabledTitle'));
      return;
    }

    try {
      const shown = await invoke<boolean>('show_notification', {
        options: {
          title: 'ISpooferMotion',
          body: t('misc.desktopNotificationsEnabled'),
        },
      });
      logIsm(
        shown ? 'success' : 'warn',
        shown ? t('misc.notificationsEnabledTitle') : t('misc.notificationsFailed'),
      );
    } catch (err) {
      logIsm('error', `Desktop notifications failed: ${String(err)}`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sliders size={18} className="text-primary" />
          {t('settings.behavior')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground leading-none">
            {t('settings.desktopNotifications')}
          </Label>
          <Switch
            checked={config.general.desktopNotifications}
            onCheckedChange={handleDesktopNotificationsChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <Label className="text-sm font-medium text-foreground leading-none">
              {t('settings.hideToTray')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('settings.hideToTrayDesc')}</p>
          </div>
          <Switch
            checked={config.general.hideToTrayOnClose}
            onCheckedChange={(v) => updateConfig('general', 'hideToTrayOnClose', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <Label className="text-sm font-medium text-foreground leading-none">
              {t('settings.telemetry')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('settings.telemetryDesc')}</p>
          </div>
          <Switch
            checked={config.general.telemetryEnabled}
            onCheckedChange={(v) => updateConfig('general', 'telemetryEnabled', v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
