import { invoke } from '@tauri-apps/api/core';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useConfigStore } from '../../../stores/configStore';
import {
  detectCookie,
  logIsm,
  mergeCachedUser,
  validateCookieProfile,
} from '../../../utils/robloxProfiles';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

type AuthStatus = 'idle' | 'loading' | 'success' | 'error';
type ApiKeyOwnerDetectResult = {
  ok: boolean;
  ownerUserId?: string | null;
  message?: string;
};

export default function CredentialsSection() {
  const { t } = useLanguage();
  const { config, updateConfig, updateCategory } = useConfig();
  const [manualCookieEdit, setManualCookieEdit] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [apiKeyStatus, setApiKeyStatus] = useState<AuthStatus>('idle');
  const { saveSecrets } = useConfigStore();

  const autoDetectEnabled = config.advanced.autoCookieStudio || config.advanced.autoCookieBrowser;
  const cookieReadOnly = autoDetectEnabled && !manualCookieEdit;

  const getCookieDetectionMode = () => {
    if (config.advanced.autoCookieStudio) return 'studio';
    if (config.advanced.autoCookieBrowser) return 'browser';
    return 'none';
  };

  const applyValidatedCookie = (result: Awaited<ReturnType<typeof validateCookieProfile>>) => {
    mergeCachedUser(result.user);
    updateCategory('spoofing', {
      cookie: result.cookie,
      selectedUser: String(result.user.id),
      selectedGroup: 'none',
    });
    setAuthStatus('success');
    logIsm('info', 'Cookie validated for the selected profile.');

    // Save the validated profile to the OS keyring.
    void saveSecrets();
  };

  const runAutoDetect = async (mode: string) => {
    if (mode === 'none') return;
    setAuthStatus('loading');
    logIsm('info', `Auto detecting Roblox cookie from ${mode}.`);

    try {
      const detected = await detectCookie(
        mode as 'studio' | 'browser',
        config.spoofing.selectedUser === 'none' ? null : config.spoofing.selectedUser,
      );
      if (!detected) {
        setAuthStatus('idle');
        const extraMsg =
          mode === 'browser'
            ? ' (Chromium v127+ cookies are encrypted and cannot be auto-detected, please add manually)'
            : ' (Please add it manually)';
        logIsm('info', `No Roblox cookie was found.${extraMsg}`);
        updateCategory('advanced', {
          autoCookieStudio: false,
          autoCookieBrowser: false,
        });
        setManualCookieEdit(true);
        return;
      }
      const result = await validateCookieProfile(detected);
      applyValidatedCookie(result);
    } catch (e: unknown) {
      const errStr = String(e);
      // Only treat explicit Roblox auth rejections (HTTP 401/403) as "cookie invalid".
      // Network timeouts, transient 429 rate-limits, and other connectivity issues should
      // NOT cause the cookie to be discarded - the token itself may still be valid.
      const isAuthFailure =
        errStr.includes('401') ||
        errStr.includes('403') ||
        errStr.includes('Unauthorized') ||
        errStr.includes('Forbidden') ||
        errStr.includes('authenticated user') ||
        errStr.includes('invalid or expired');
      if (isAuthFailure) {
        setAuthStatus('idle');
        updateCategory('advanced', {
          autoCookieStudio: false,
          autoCookieBrowser: false,
        });
        setManualCookieEdit(true);
        logIsm(
          'warn',
          'Auto-detected cookie was invalid or expired. Please add it manually.',
          true,
        );
      } else {
        // Transient error - keep auto-detect enabled, leave the existing cookie in place.
        setAuthStatus('idle');
        logIsm(
          'warn',
          `Auto-detect encountered a temporary error (${errStr}). Keeping the existing cookie. It will retry on next launch.`,
        );
      }
    }
  };

  const handleCookieDetectionChange = (val: string) => {
    updateCategory('advanced', {
      autoCookieStudio: val === 'studio',
      autoCookieBrowser: val === 'browser',
    });
    setManualCookieEdit(false);
    if (val !== 'none') {
      void runAutoDetect(val);
    }
  };

  // Auto-detect on mount if already configured.
  useEffect(() => {
    const mode = getCookieDetectionMode();
    if (mode !== 'none') {
      void runAutoDetect(mode);
    }
  }, []);

  useEffect(() => {
    const cookie = config.spoofing.cookie.trim();
    if (cookieReadOnly) return;
    if (!cookie || cookie.length < 50) return;

    const timer = window.setTimeout(async () => {
      try {
        const result = await validateCookieProfile(cookie);
        applyValidatedCookie(result);
      } catch {
        setAuthStatus('idle');
        logIsm('warn', 'The manually entered Roblox cookie could not be validated.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [config.spoofing.cookie, cookieReadOnly]);

  const handleValidateApiKey = async () => {
    const key = config.spoofing.apiKey.trim();
    if (key.length < 20) {
      setApiKeyStatus('error');
      logIsm('warn', 'Paste an Open Cloud API key before validating.', true);
      return;
    }

    setApiKeyStatus('loading');
    try {
      const result = await invoke<ApiKeyOwnerDetectResult>('detect_opencloud_api_key_owner', {
        key,
      });
      const message = result.message || 'No validation details returned.';
      if (result.ok) {
        setApiKeyStatus('success');
        logIsm('success', message, true);
        void saveSecrets(); // Save API key on successful validation
      } else if (/invalid|unauthorized/i.test(message)) {
        setApiKeyStatus('error');
        logIsm('warn', message, true);
      } else {
        setApiKeyStatus('idle');
        logIsm('warn', `Could not fully verify the Open Cloud API key: ${message}`, true);
      }
    } catch (error) {
      setApiKeyStatus('error');
      logIsm('warn', `Open Cloud API key validation failed: ${String(error)}`, true);
    }
  };

  const handleOpenApiDashboard = async () => {
    await invoke('open_external', {
      url: 'https://create.roblox.com/dashboard/credentials?activeTab=ApiKeys',
    }).catch(() => null);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-1.5 w-full">
        <Label className="flex items-center gap-2">
          {t('config.autoDetectCookie')}
          <AnimatePresence>
            {authStatus === 'loading' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 size={14} className="animate-spin text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </Label>
        <Select
          value={getCookieDetectionMode()}
          onValueChange={(val) => {
            if (val) handleCookieDetectionChange(val);
          }}
        >
          <SelectTrigger className="w-50 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('explorer.disabled')}</SelectItem>
            <SelectItem value="studio">{t('explorer.robloxStudio')}</SelectItem>
            <SelectItem value="browser">{t('explorer.webBrowser')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full flex flex-col gap-1.5 mt-2">
        <Label>{t('spoof.cookie')}</Label>
        <Input
          type="password"
          placeholder={
            cookieReadOnly ? t('config.autoDetectCookieReadonly') : t('config.pasteCookieManually')
          }
          readOnly={cookieReadOnly}
          value={cookieReadOnly ? '' : config.spoofing.cookie}
          onChange={(e) => updateConfig('spoofing', 'cookie', e.target.value)}
          className={cookieReadOnly ? 'opacity-60 h-9' : 'h-9'}
        />
      </div>

      <div className="flex flex-col gap-1.5 w-full relative">
        <Label>{t('spoof.apiKey')}</Label>
        <div className="relative">
          <Input
            type="password"
            placeholder={t('spoof.apiKeyPlaceholder')}
            value={config.spoofing.apiKey}
            onChange={(e) => {
              setApiKeyStatus('idle');
              updateConfig('spoofing', 'apiKey', e.target.value);
            }}
            className="pr-20 h-9"
          />
          <div className="absolute right-0 top-0 h-full flex items-center px-1">
            <button
              type="button"
              onClick={handleValidateApiKey}
              className="p-1 rounded text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              aria-label={t('common.apply')}
              title={t('misc.validateOpenCloudKey')}
              disabled={apiKeyStatus === 'loading'}
            >
              {apiKeyStatus === 'loading' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck
                  size={16}
                  className={
                    apiKeyStatus === 'success'
                      ? 'text-green-500'
                      : apiKeyStatus === 'error'
                        ? 'text-red-500'
                        : undefined
                  }
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleOpenApiDashboard()}
              className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
              aria-label={t('spoof.openApiDashboard')}
              title={t('spoof.openApiDashboard')}
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
