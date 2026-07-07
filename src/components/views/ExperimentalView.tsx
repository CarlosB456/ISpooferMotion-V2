import {
  Accordion,
  AccordionItem,
  FormToggle,
  Group,
  itemVariants,
  pageVariants,
  Row,
  Window,
} from '@codycon/ism-library';
import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { isMemoryInjectionSupported } from '../../utils/tauriRuntime';

export default function ExperimentalView() {
  const { t } = useLanguage();

  const { config, updateConfig } = useConfig();
  const [memoryInjectionSupported, setMemoryInjectionSupported] = useState(false);

  useEffect(() => {
    // check if the current OS actually supports memory injection (windows only)
    isMemoryInjectionSupported().then(setMemoryInjectionSupported);
  }, []);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="w-full h-full"
    >
      <Window>
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t('experimental.title')}
              </h1>
              <p className="text-sm text-text-secondary mt-1">{t('experimental.description')}</p>
            </div>

            <Accordion
              selectionMode="multiple"
              defaultExpandedKeys={['spooferFeatures']}
              className="flex flex-col gap-6"
            >
              <AccordionItem
                value="spooferFeatures"
                aria-label={t('settings.spooferFeatures')}
                title={
                  <span className="flex items-center gap-3 font-semibold">
                    <Cpu size={18} className="text-primary" /> {t('settings.spooferFeatures')}
                  </span>
                }
              >
                <Group>
                  <Row>
                    <FormToggle
                      label={t('experimental.clipboardMonitoring')}
                      description={t('experimental.clipboardMonitoringDesc')}
                      checked={config.advanced.clipboardMonitoring}
                      onChange={(v: boolean) => updateConfig('advanced', 'clipboardMonitoring', v)}
                    />
                  </Row>
                  <Row>
                    <FormToggle
                      label={t('experimental.memoryInjection')}
                      description={
                        memoryInjectionSupported
                          ? t('experimental.memoryInjectionDescSupported')
                          : t('experimental.memoryInjectionDescUnsupported')
                      }
                      checked={
                        memoryInjectionSupported ? config.advanced.memoryInjectionEnabled : false
                      }
                      onChange={(v: boolean) => {
                        if (!memoryInjectionSupported) return;
                        updateConfig('advanced', 'memoryInjectionEnabled', v);
                      }}
                    />
                  </Row>
                </Group>
              </AccordionItem>
            </Accordion>
          </div>
        </motion.div>
      </Window>
    </motion.div>
  );
}
