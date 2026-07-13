import { motion } from 'framer-motion';

import { useLanguage } from '../../contexts/LanguageContext';
import { useStudioConnectionState } from '../../contexts/StudioConnectionContext';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/badge';

/**
 * Global status bar anchored to the bottom of the window.
 *
 * Displays the real-time connection status with the Roblox Studio plugin bridge
 * so the user knows if it's safe to start a spoofing job.
 */
export default function StatusBar() {
  const { t } = useLanguage();
  const { studioConnected } = useStudioConnectionState();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
      className="h-8 w-full bg-transparent border-t border-border flex items-center justify-between px-4 shrink-0 z-50 select-none"
    >
      <div className="flex items-center gap-2" />

      <div className="flex items-center gap-3">
        <Badge
          variant={studioConnected ? 'default' : 'secondary'}
          className={cn(
            'border-transparent bg-transparent px-0 hover:bg-transparent shadow-none',
            studioConnected ? 'text-primary' : 'text-muted-foreground opacity-50',
          )}
        >
          {studioConnected ? t('misc.syncedToStudio') : t('misc.notSyncedToStudio')}
        </Badge>
      </div>
    </motion.div>
  );
}
