import { itemVariants, pageVariants } from '../../utils/animations';
import { motion } from 'framer-motion';

import AppearanceCard from './settings/AppearanceCard';
import BehaviorCard from './settings/BehaviorCard';
import DangerCard from './settings/DangerCard';
import DebugCard from './settings/DebugCard';

/**
 * Container view for all user-configurable settings.
 *
 * Settings are instantly saved to disk via Tauri and synchronized to the `ConfigContext`
 * so other components can reactively update when things like "upload audio" or "language" change.
 */
export default function SettingsView() {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="w-full h-full overflow-y-auto overflow-x-hidden"
    >
      <div className="w-full h-full p-4 lg:p-8">
        <motion.div
          variants={itemVariants}
          className="w-full max-w-3xl mx-auto flex flex-col gap-6 pb-12"
        >
          <AppearanceCard />
          <BehaviorCard />
          <DebugCard />
          <DangerCard />
        </motion.div>
      </div>
    </motion.div>
  );
}
