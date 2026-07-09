import { createContext, useContext, useEffect, useMemo } from 'react';

import { type AppConfig, useConfigStore } from '../stores/configStore';
import { applyReplacements, useSpooferStore } from '../stores/spooferStore';
import type {
  SpooferLogPayload,
  SpooferProgressPayload,
  SpooferResultPayload,
  SpooferStartedPayload,
} from '../types/tauriEvents';
import { appendSpoofingLog } from '../utils/spoofingLogs';
import { isTauriRuntime } from '../utils/tauriRuntime';

export type { AppConfig };

interface ConfigContextType {
  config: AppConfig;
  updateConfig: <C extends keyof AppConfig, K extends keyof AppConfig[C]>(
    c: C,
    k: K,
    v: AppConfig[C][K],
  ) => void;
  updateCategory: <C extends keyof AppConfig>(c: C, vals: Partial<AppConfig[C]>) => void;
  resetConfig: () => void;
}

const Context = createContext<ConfigContextType | undefined>(undefined);

// Wraps the config store and initializes Tauri IPC listeners for the spoofer.
// Sits near the root to ensure listeners are always mounted.
export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const configState = useConfigStore();

  useEffect(() => {
    configState.loadSecrets();
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let isMounted = true;
    const unlisteners: Array<() => void> = [];

    // Bind global IPC listeners here.
    // Views read directly from the spooferStore.
    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const {
        setIsSpoofing,
        setSpoofingLogs,
        setActiveSpooferJobId,
        setSpoofProgress,
        setLastAssetResults,
        setKeyframeWarningCount,
        incrementSpoofCompletionVersion,
        setSpoofStatusText,
        setSpoofCurrentCount,
        setSpoofTotalCount,
        setSpoofStartTime,
      } = useSpooferStore.getState();

      const p1 = listen<SpooferStartedPayload>('spoofer-started', (e) => {
        setIsSpoofing(true);
        setSpoofingLogs([]);
        setSpoofProgress(0);
        setSpoofStatusText('Initializing...');
        setSpoofCurrentCount(0);
        setSpoofTotalCount(0);
        setSpoofStartTime(Date.now());
        setActiveSpooferJobId(e.payload.job_id ?? e.payload.jobId);
      });

      const p2 = listen<SpooferLogPayload>('spoofer-log', (e) => {
        let msg = e.payload.message ?? '';
        const rawLevel = (e.payload.level || 'info').toUpperCase();

        // Apply a level prefix to the log if missing.
        // Brackets are required for colorizing logs in the frontend parser.
        if (!msg.startsWith('[')) {
          msg = `[${rawLevel}] ${msg}`;
        }

        setSpoofingLogs((prev) => appendSpoofingLog(prev, msg));
      });

      const p3 = listen<SpooferProgressPayload>('spoofer-progress', (e) => {
        if (e.payload.message) {
          setSpoofStatusText(e.payload.message);
        }

        if (e.payload.current !== undefined) {
          setSpoofCurrentCount(e.payload.current);
        }

        if (e.payload.total !== undefined) {
          setSpoofTotalCount(e.payload.total);
        }

        if (e.payload.progress !== undefined) {
          setSpoofProgress(e.payload.progress);
        } else if (
          e.payload.current !== undefined &&
          e.payload.total !== undefined &&
          e.payload.total > 0
        ) {
          setSpoofProgress((e.payload.current / e.payload.total) * 100);
        }
      });

      const p4 = listen<SpooferResultPayload>('spoofer-result', (e) => {
        setIsSpoofing(false);
        setActiveSpooferJobId(null);
        setSpoofStartTime(null);
        setLastAssetResults(e.payload.assetResults ?? e.payload.results ?? []);
        setKeyframeWarningCount(e.payload.keyframe_warnings ?? 0);
        incrementSpoofCompletionVersion();

        if (e.payload.error) {
          setSpoofingLogs((prev) => appendSpoofingLog(prev, `[ERROR]: ${e.payload.error}`));
        } else if (e.payload.replacements) {
          applyReplacements(e.payload.replacements);
        }
      });

      const uns = await Promise.all([p1, p2, p3, p4]);
      if (!isMounted) {
        uns.forEach((u) => u());
      } else {
        unlisteners.push(...uns);
      }
    };

    setup();
    return () => {
      isMounted = false;
      unlisteners.forEach((u) => u());
    };
  }, []);

  // Memoized to prevent full app re-renders on minor state changes.
    const contextValue = useMemo<ConfigContextType>(
    () => ({
      config: configState.config,
      updateConfig: configState.updateConfig,
      updateCategory: configState.updateCategory,
      resetConfig: configState.resetConfig,
    }),
    [
      configState.config,
      configState.updateConfig,
      configState.updateCategory,
      configState.resetConfig,
    ],
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useConfig = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
};
