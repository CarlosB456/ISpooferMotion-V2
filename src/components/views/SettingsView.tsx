import { Group, itemVariants, pageVariants, Window } from '@codycon/ism-library';
import { motion } from 'framer-motion';
import { Globe, Settings2 } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';
import DebugSection from './settings/DebugSection';
import GeneralSection from './settings/GeneralSection';

export default function SettingsView() {
  const { t } = useLanguage();

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="w-full h-full"
    >
      <Window>
        <motion.div
          variants={itemVariants}
          className="w-full flex flex-col xl:flex-row gap-6 h-full"
        >
          {/* Left Column: Core App Settings */}
          <div className="flex flex-col gap-6 w-full xl:w-1/2">
            <Group
              title={t('settings.general')}
              icon={<Globe size={18} className="text-primary" />}
            >
              <GeneralSection />
            </Group>
          </div>

          {/* Right Column: Debug & Advanced */}
          <div className="flex flex-col gap-6 w-full xl:w-1/2">
            <Group
              title={t('settings.debugDisplay')}
              icon={<Settings2 size={18} className="text-primary" />}
            >
              <DebugSection />
            </Group>
          </div>
        </motion.div>
      </Window>
    </motion.div>
  );
}
