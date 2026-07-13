import { useEffect, useState } from 'react';

import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isMemoryInjectionSupported } from '../../../utils/tauriRuntime';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

export default function AdvancedSection() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [memoryInjectionSupported, setMemoryInjectionSupported] = useState(false);

  useEffect(() => {
    isMemoryInjectionSupported().then(setMemoryInjectionSupported);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3">
        <div className="space-y-0.5">
          <Label className="text-base">{t('settings.clipboardMonitoring')}</Label>
          <div className="text-sm text-text-secondary">{t('settings.clipboardMonitoringDesc')}</div>
        </div>
        <Switch
          checked={config.advanced.clipboardMonitoring}
          onCheckedChange={(v) => updateConfig('advanced', 'clipboardMonitoring', v)}
        />
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3">
        <div className="space-y-0.5">
          <Label className="text-base">{t('settings.memoryInjection')}</Label>
          <div className="text-sm text-text-secondary">
            {memoryInjectionSupported
              ? t('settings.memoryInjectionDescSupported')
              : t('settings.memoryInjectionDescUnsupported')}
          </div>
        </div>
        <Switch
          disabled={!memoryInjectionSupported}
          checked={memoryInjectionSupported ? config.advanced.memoryInjectionEnabled : false}
          onCheckedChange={(v) => {
            if (!memoryInjectionSupported) return;
            updateConfig('advanced', 'memoryInjectionEnabled', v);
          }}
        />
      </div>
    </div>
  );
}
