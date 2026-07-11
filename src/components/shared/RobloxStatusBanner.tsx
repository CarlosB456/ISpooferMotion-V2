import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

interface RobloxStatusBannerProps {
  isVisible: boolean;
}

export function RobloxStatusBanner({ isVisible }: RobloxStatusBannerProps) {
  const { t } = useLanguage();
  // Dropdown banner for Roblox API outages.
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full px-4 pt-4 shrink-0"
        >
          <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 flex items-center justify-center gap-3">
            <AlertCircle size={18} className="text-danger shrink-0" strokeWidth={2.5} />
            <span className="text-sm font-medium text-danger truncate text-center">
              {t('misc.robloxApiDown')}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
