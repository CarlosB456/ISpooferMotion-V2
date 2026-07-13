import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { motion } from 'framer-motion';
import { Minus, Settings2, Terminal, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import AppIconDark from '../../assets/app_icon.png';
import AppIconLight from '../../assets/app_icon_light.png';
import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSpooferStore } from '../../stores/spooferStore';
import { isTauriRuntime } from '../../utils/tauriRuntime';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/**
 * Custom window titlebar replacing the native OS frame.
 *
 * Provides window dragging, minimize/close controls, and a quick-access toolbar
 * for toggling advanced settings and the debug console. Ensures visual consistency
 * across Windows, macOS, and Linux.
 */
export default function Titlebar() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const showAdvanced = useSpooferStore((s) => s.showAdvanced);
  const setShowAdvanced = useSpooferStore((s) => s.setShowAdvanced);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    // Display the current Tauri version under the app name.
    invoke<string>('get_app_version')
      .then((v) => setAppVersion(v))
      .catch(() => setAppVersion(''));
  }, []);

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleClose = async () => {
    // Hide the window instead of closing the process if hide-to-tray is enabled.
    if (config.general.hideToTrayOnClose) {
      await getCurrentWindow().hide();
      return;
    }
    await invoke('quit_app');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      // Allow users to drag the window by clicking the titlebar.
      data-tauri-drag-region
      className="h-14 w-full flex items-center justify-between px-5 bg-transparent border-b border-border select-none shrink-0 z-50 relative"
    >
      {/* App Logo & Name */}
      <div className="flex items-center pointer-events-none gap-3">
        <div className="w-8 h-8 flex items-center justify-center">
          {isTauriRuntime() ? (
            <>
              <img
                src={AppIconLight}
                className="w-full h-full object-contain block dark:hidden"
                alt="Logo Light"
              />

              <img
                src={AppIconDark}
                className="w-full h-full object-contain hidden dark:block"
                alt="Logo Dark"
              />
            </>
          ) : (
            <img
              src="/ispoofermotion-logo-dark.png"
              className="w-full h-full object-contain"
              alt="Logo"
            />
          )}
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[13px] font-semibold tracking-tight text-foreground leading-tight">
            ISpooferMotion
          </span>
          <span className="text-[9px] font-mono text-muted-foreground mt-0.5 opacity-80">
            {appVersion ? `v${appVersion}` : 'v?'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5" data-tauri-drag-region={false}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={
                  showAdvanced ? 'text-primary hover:text-primary' : 'text-muted-foreground'
                }
                onClick={() => {
                  if (!showAdvanced) {
                    updateConfig('ui', 'activeTab', 'spoofing');
                  }
                  setShowAdvanced(!showAdvanced);
                }}
              />
            }
          >
            <Settings2 size={16} />
          </TooltipTrigger>
          <TooltipContent>{t('settings.advanced')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={
                  config.debug?.debugMode
                    ? 'text-primary hover:text-primary'
                    : 'text-muted-foreground'
                }
                onClick={() => updateConfig('debug', 'debugMode', !config.debug?.debugMode)}
              />
            }
          >
            <Terminal size={16} />
          </TooltipTrigger>
          <TooltipContent>{t('debug.toggleDebugConsole')}</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMinimize}
                className="text-muted-foreground"
              />
            }
          >
            <Minus size={16} />
          </TooltipTrigger>
          <TooltipContent>{t('debug.minimize')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              />
            }
          >
            <X size={16} />
          </TooltipTrigger>
          <TooltipContent>{t('common.close')}</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}
