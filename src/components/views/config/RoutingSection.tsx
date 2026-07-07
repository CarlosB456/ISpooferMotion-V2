import { FormInput, FormToggle, Group, Row } from '@codycon/ism-library';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function RoutingSection() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Group>
      <FormToggle
        label={t('settings.advanced')}
        description=""
        checked={showAdvanced}
        onChange={setShowAdvanced}
      />

      <motion.div
        initial={false}
        animate={{
          height: showAdvanced ? 'auto' : 0,
          opacity: showAdvanced ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="overflow-hidden flex flex-col"
        aria-hidden={!showAdvanced}
      >
        <div className="pt-4">
          <Row>
            <FormInput
              label={t('settings.proxyUrl')}
              placeholder={t('settings.proxyUrlPlaceholder')}
              value={config.advanced.proxyUrl}
              onChange={(value: string) => updateConfig('advanced', 'proxyUrl', value)}
            />
          </Row>
        </div>
      </motion.div>

      <div className="flex flex-col">
        <Row>
          <FormToggle
            label={t('settings.concurrentSpoofing')}
            description={t('settings.concurrentSpoofingDescription')}
            checked={config.advanced.concurrentSpoofing}
            onChange={(value: boolean) => updateConfig('advanced', 'concurrentSpoofing', value)}
          />
        </Row>
        <motion.div
          initial={false}
          animate={{
            gridTemplateRows: config.advanced.concurrentSpoofing ? '1fr' : '0fr',
            opacity: config.advanced.concurrentSpoofing ? 1 : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="grid overflow-hidden"
          aria-hidden={!config.advanced.concurrentSpoofing}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="pt-3">
              <Row>
                <FormInput
                  label={t('settings.maxConcurrency')}
                  type="number"
                  value={config.advanced.maxConcurrency.toString()}
                  onChange={(value: string) =>
                    updateConfig('advanced', 'maxConcurrency', parseInt(value, 10) || 100)
                  }
                />
              </Row>
            </div>
          </div>
        </motion.div>
      </div>
    </Group>
  );
}
