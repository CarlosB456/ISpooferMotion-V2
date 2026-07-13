import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, ScanLine, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

/**
 * The primary navigation sidebar for the application.
 *
 * Controls routing between the Spoofing workspace, the Activity logs, and the global Settings.
 * Uses Framer Motion for layout transitions when switching active tabs.
 */
export default function Sidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs = [
    { id: 'spoofing', label: t('nav.spoofing'), icon: <ScanLine size={18} /> },
    { id: 'activity', label: t('nav.activity'), icon: <History size={18} /> },
    { id: 'settings', label: t('nav.settings'), icon: <Settings size={18} /> },
  ];

  return (
    <TooltipProvider delay={200}>
      <motion.div
        animate={{ width: isCollapsed ? 72 : 220 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full bg-transparent border-r border-border-subtle p-3 flex flex-col shrink-0 relative z-20"
      >
        <div className="flex-1 flex flex-col gap-1.5 mt-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            const buttonContent = (
              <motion.button
                type="button"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                whileTap={{ scale: 0.96 }}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'w-full text-left h-10 transition-colors duration-150 flex items-center gap-3 rounded-md relative outline-none [-webkit-tap-highlight-color:transparent]',
                  isCollapsed ? 'px-0 justify-center' : 'px-3',
                  isActive
                    ? 'bg-bg-elevated text-text-primary border border-border-strong shadow-subtle'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/70',
                )}
              >
                <div
                  className={cn(
                    'transition-opacity shrink-0',
                    isActive ? 'opacity-100' : 'opacity-60',
                  )}
                >
                  {tab.icon}
                </div>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className={cn(
                      'text-[13px] tracking-wide whitespace-nowrap overflow-hidden',
                      isActive ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {tab.label}
                  </motion.span>
                )}
              </motion.button>
            );

            return isCollapsed ? (
              <Tooltip key={tab.id}>
                <TooltipTrigger>{buttonContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-semibold text-xs py-1 px-2">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={tab.id}>{buttonContent}</div>
            );
          })}
        </div>

        <div className="mt-auto pt-4 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-muted-foreground hover:bg-bg-elevated/70"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
