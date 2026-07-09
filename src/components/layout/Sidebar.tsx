import { AnimatePresence, motion } from 'framer-motion';
import { History, ScanLine, Settings } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/cn';

export default function Sidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'spoofing', label: t('nav.spoofing'), icon: <ScanLine size={18} /> },
    { id: 'activity', label: t('nav.activity'), icon: <History size={18} /> },
    { id: 'settings', label: t('nav.settings'), icon: <Settings size={18} /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-55 h-full bg-transparent border-r border-border-subtle p-5 flex flex-col shrink-0 relative z-20"
    >
      {}
      <div className="flex-1 flex flex-col gap-1.5 mt-2">
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                type="button"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.01 }}
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'w-full text-left h-10 px-3 transition-colors duration-150 flex items-center gap-3 rounded-md relative outline-none [-webkit-tap-highlight-color:transparent]',
                  isActive
                    ? 'bg-bg-elevated text-text-primary border border-border-strong shadow-subtle'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/70',
                )}
              >
                <div className={cn('transition-opacity', isActive ? 'opacity-100' : 'opacity-60')}>
                  {tab.icon}
                </div>
                <span
                  className={cn(
                    'text-[13px] tracking-wide',
                    isActive ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
