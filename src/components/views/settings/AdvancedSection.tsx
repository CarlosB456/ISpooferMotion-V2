import { FormToggle, Group, Row } from '@codycon/ism-library';
import { useEffect, useState } from 'react';

import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isMemoryInjectionSupported } from '../../../utils/tauriRuntime';

export default function AdvancedSection() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [memoryInjectionSupported, setMemoryInjectionSupported] = useState(false);

  useEffect(() => {
    isMemoryInjectionSupported().then(setMemoryInjectionSupported);
  }, []);

  return (
    <Group>
      <Row>
        <FormToggle
          label={t('settings.clipboardMonitoring')}
          description={t('settings.clipboardMonitoringDesc')}
          checked={config.advanced.clipboardMonitoring}
          onChange={(v: boolean) => updateConfig('advanced', 'clipboardMonitoring', v)}
        />
      </Row>
      <Row>
        <FormToggle
          label={t('settings.memoryInjection')}
          description={
            memoryInjectionSupported
              ? t('settings.memoryInjectionDescSupported')
              : t('settings.memoryInjectionDescUnsupported')
          }
          checked={memoryInjectionSupported ? config.advanced.memoryInjectionEnabled : false}
          onChange={(v: boolean) => {
            if (!memoryInjectionSupported) return;
            updateConfig('advanced', 'memoryInjectionEnabled', v);
          }}
        />
      </Row>
    </Group>
  );
}
