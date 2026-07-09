import { IconButton, Toolbar } from '@codycon/ism-library';
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

export default function Titlebar() {
  const { t } = useLanguage();

  const { config, updateConfig } = useConfig();
  const showAdvanced = useSpooferStore((s) => s.showAdvanced);
  const setShowAdvanced = useSpooferStore((s) => s.setShowAdvanced);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    // grab the current version from tauri to display under the app name
    invoke<string>('get_app_version')
      .then((v) => setAppVersion(v))
      .catch(() => setAppVersion(''));
  }, []);

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleClose = async () => {
    // if they enabled hide-to-tray, just hide the window instead of fully killing the process
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
      // this attribute allows the user to drag the window by clicking anywhere on the titlebar
      data-tauri-drag-region
      className="h-14 w-full flex items-center justify-between px-5 bg-transparent border-b border-border-subtle select-none shrink-0 z-50 relative"
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
          <span className="text-[13px] font-semibold tracking-tight text-text-primary leading-tight">
            ISpooferMotion
          </span>
          <span className="text-[9px] font-mono text-text-muted mt-0.5 opacity-80">
            {appVersion ? `v${appVersion}` : 'v?'}
          </span>
        </div>
      </div>

      <Toolbar>
        <IconButton
          label={t('settings.advanced')}
          tone={showAdvanced ? 'primary' : undefined}
          onClick={() => {
            if (!showAdvanced) {
              updateConfig('ui', 'activeTab', 'spoofing');
            }
            setShowAdvanced(!showAdvanced);
          }}
        >
          <Settings2 size={16} />
        </IconButton>
        <IconButton
          label={t('debug.toggleDebugConsole')}
          tone={config.debug?.debugMode ? 'primary' : undefined}
          onClick={() => updateConfig('debug', 'debugMode', !config.debug?.debugMode)}
        >
          <Terminal size={16} />
        </IconButton>
        <div className="mx-1 h-5 w-px shrink-0 bg-border-subtle" aria-hidden="true" />
        <IconButton label={t('debug.minimize')} onClick={handleMinimize}>
          <Minus size={16} />
        </IconButton>
        <IconButton label={t('common.close')} tone="danger" onClick={handleClose}>
          <X size={16} />
        </IconButton>
      </Toolbar>
    </motion.div>
  );
}
