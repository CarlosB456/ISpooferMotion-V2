import { z } from 'zod';
import { create } from 'zustand';

import { isTauriRuntime } from '../utils/tauriRuntime';

export const AppConfigSchema = z.object({
  general: z.object({
    desktopNotifications: z.boolean().default(true),
    hideToTrayOnClose: z.boolean().default(false),
    telemetryEnabled: z.boolean().default(true),
  }),
  advanced: z.object({
    autoCookieStudio: z.boolean().default(true),
    autoCookieBrowser: z.boolean().default(true),
    skipOwned: z.boolean().default(false),
    enablePluginSpoofing: z.boolean().default(false),
    memoryInjectionEnabled: z.boolean().default(false),
    clipboardMonitoring: z.boolean().default(false),
    forcePlaceIds: z.string().default(''),
    excludedUserIds: z.string().default(''),
    excludedGroupIds: z.string().default(''),
    concurrentSpoofing: z.boolean().default(true),
    maxConcurrency: z.number().default(50),
    enableArchiveRecovery: z.boolean().default(false),
    proxyUrl: z.string().default(''),
  }),
  debug: z.object({
    debugMode: z.boolean().default(false),
    enableCache: z.boolean().default(true),
  }),
  spoofing: z.object({
    selectedUser: z.string().default('none'),
    selectedGroup: z.string().default('none'),
    animation: z.boolean().default(true),
    audio: z.boolean().default(true),
    images: z.boolean().default(true),
    meshes: z.boolean().default(true),
    videos: z.boolean().default(true),
    scriptRefs: z.boolean().default(true),
    cookie: z.string().default(''),
    apiKey: z.string().default(''),
    enableSpoofing: z.boolean().default(false),
    uploadTypes: z.array(z.string()).default(['animation', 'audio', 'image', 'mesh', 'script_ref']),
    downloadPath: z.string().default(''),
    extraAssetIds: z.string().default(''),
    preserveMetadata: z.boolean().default(true),
  }),
  ui: z.object({
    activeTab: z.string().default('spoofing'),
    assetExplorerOpen: z.boolean().default(false),
    homeUpdateSections: z.array(z.string()).default(['changelog']),
    settingsSections: z.array(z.string()).default(['account', 'general', 'quickSettings', 'debug']),
    configSections: z
      .array(z.string())
      .default(['credentials', 'assetProcessing', 'routing', 'exclusions']),
    spoofingSections: z.array(z.string()).default(['targets', 'execution']),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const DEFAULT_APP_CONFIG: AppConfig = {
  general: {
    desktopNotifications: true,
    hideToTrayOnClose: false,
    telemetryEnabled: true,
  },
  advanced: {
    autoCookieStudio: true,
    autoCookieBrowser: false,
    skipOwned: false,
    enablePluginSpoofing: false,
    memoryInjectionEnabled: false,
    clipboardMonitoring: false,
    forcePlaceIds: '',
    excludedUserIds: '',
    excludedGroupIds: '',
    concurrentSpoofing: true,
    maxConcurrency: 100,
    enableArchiveRecovery: false,
    proxyUrl: '',
  },
  debug: {
    debugMode: false,
    enableCache: true,
  },
  spoofing: {
    selectedUser: 'none',
    selectedGroup: 'none',
    animation: true,
    audio: true,
    images: true,
    meshes: true,
    videos: true,
    scriptRefs: true,
    cookie: '',
    apiKey: '',
    enableSpoofing: false,
    uploadTypes: ['animation', 'audio', 'image', 'mesh', 'script_ref'],
    downloadPath: '',
    extraAssetIds: '',
    preserveMetadata: true,
  },
  ui: {
    activeTab: 'spoofing',
    assetExplorerOpen: false,
    homeUpdateSections: ['changelog'],
    settingsSections: ['account', 'general', 'quickSettings', 'debug'],
    configSections: ['credentials', 'assetProcessing', 'routing', 'exclusions'],
    spoofingSections: ['targets', 'execution'],
  },
};

/**
 * Merges the saved configuration from disk with the application's default settings.
 *
 * This prevents crashes if new settings are added in an update by ensuring every
 * expected key exists, while preserving whatever custom values the user already set.
 */
const mergeKnownKeys = <T extends Record<string, unknown>>(
  defaults: T,
  saved: Partial<T> | undefined,
): T => {
  const next = { ...defaults };
  Object.keys(defaults).forEach((key) => {
    if (saved && Object.prototype.hasOwnProperty.call(saved, key)) {
      next[key as keyof T] = saved[key as keyof T] as T[keyof T];
    }
  });
  return next;
};

/**
 * Sanitizes UI sections to prevent rendering invalid or removed config blocks.
 *
 * If a setting tab gets renamed or removed in an update, this strips it out
 * and forces the UI back to a safe default.
 */
const mergeSections = (savedSections: unknown, defaultSections: string[]) => {
  if (!Array.isArray(savedSections)) return defaultSections;
  const next = savedSections.filter((section: string) => defaultSections.includes(section));
  return next.length > 0 ? next : defaultSections;
};

interface ConfigState {
  config: AppConfig;
  updateConfig: <C extends keyof AppConfig, K extends keyof AppConfig[C]>(
    c: C,
    k: K,
    v: AppConfig[C][K],
  ) => void;
  updateCategory: <C extends keyof AppConfig>(c: C, vals: Partial<AppConfig[C]>) => void;
  resetConfig: () => void;
  loadSecrets: () => Promise<void>;
  saveSecrets: () => Promise<void>;
}

/**
 * The global configuration store.
 *
 * Manages user preferences, spoofing targets, and UI state. It automatically syncs
 * secure credentials (like the .ROBLOSECURITY cookie) to the native OS keyring via Tauri,
 * keeping them out of plaintext `localStorage`.
 */
export const useConfigStore = create<ConfigState>((set, get) => {
  // Load config from localstorage or fallback to defaults.
  const saved = localStorage.getItem('ISpooferMotion_Config');
  let initConfig = DEFAULT_APP_CONFIG;
  if (saved) {
    try {
      const p = JSON.parse(saved);
      initConfig = {
        general: mergeKnownKeys(DEFAULT_APP_CONFIG.general, p.general),
        advanced: mergeKnownKeys(DEFAULT_APP_CONFIG.advanced, p.advanced),
        debug: mergeKnownKeys(DEFAULT_APP_CONFIG.debug, p.debug),
        spoofing: mergeKnownKeys(DEFAULT_APP_CONFIG.spoofing, p.spoofing),
        ui: {
          ...mergeKnownKeys(DEFAULT_APP_CONFIG.ui, p.ui),
          settingsSections: mergeSections(
            p.ui?.settingsSections,
            DEFAULT_APP_CONFIG.ui.settingsSections,
          ),
          configSections: mergeSections(p.ui?.configSections, DEFAULT_APP_CONFIG.ui.configSections),
          spoofingSections: mergeSections(
            p.ui?.spoofingSections,
            DEFAULT_APP_CONFIG.ui.spoofingSections,
          ),
        },
      };
      initConfig.spoofing.cookie = '';
      initConfig.spoofing.apiKey = '';
    } catch (e) {
      console.warn('Failed to parse saved config from localStorage', e);
    }
  }

  const saveToStorage = (c: AppConfig) => {
    // Cookies and API keys must be saved in the Rust keyring, not standard config storage.
    localStorage.setItem(
      'ISpooferMotion_Config',
      JSON.stringify({
        ...c,
        spoofing: { ...c.spoofing, cookie: '', apiKey: '' },
      }),
    );
  };

  return {
    config: initConfig,
    updateConfig: (cat, key, val) =>
      set((state) => {
        const n = {
          ...state.config,
          [cat]: { ...state.config[cat], [key]: val },
        };
        saveToStorage(n);
        return { config: n };
      }),
    updateCategory: (cat, vals) =>
      set((state) => {
        const n = { ...state.config, [cat]: { ...state.config[cat], ...vals } };
        saveToStorage(n);
        return { config: n };
      }),
    resetConfig: () =>
      set(() => {
        saveToStorage(DEFAULT_APP_CONFIG);
        return { config: DEFAULT_APP_CONFIG };
      }),
    loadSecrets: async () => {
      if (!isTauriRuntime()) return;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        interface ProfileSecrets {
          cookie?: string;
          apiKey?: string;
          profileCookies?: Record<string, string>;
        }
        const s: ProfileSecrets = await invoke('load_profile_secrets');
        if (s && (s.cookie || s.apiKey)) {
          set((state) => {
            const selectedUser = state.config.spoofing.selectedUser;
            const profileCookie =
              selectedUser !== 'none' && typeof s.profileCookies?.[selectedUser] === 'string'
                ? s.profileCookies[selectedUser]
                : '';
            return {
              config: {
                ...state.config,
                spoofing: {
                  ...state.config.spoofing,
                  cookie:
                    profileCookie ||
                    (typeof s.cookie === 'string' ? s.cookie : state.config.spoofing.cookie),
                  apiKey: typeof s.apiKey === 'string' ? s.apiKey : state.config.spoofing.apiKey,
                },
              },
            };
          });
        }
      } catch (e) {
        console.warn('Failed to load profile secrets from backend', e);
      }
    },
    saveSecrets: async () => {
      if (!isTauriRuntime()) return;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const c = get().config.spoofing;
        const profileCookies: Record<string, string> = {};
        if (c.selectedUser !== 'none' && c.cookie) {
          profileCookies[c.selectedUser] = c.cookie;
        }
        await invoke('save_profile_secrets', {
          data: {
            cookie: c.cookie,
            apiKey: c.apiKey,
            profileCookies,
          },
        });
      } catch (e) {
        console.error('Failed to save secrets:', e);
      }
    },
  };
});
