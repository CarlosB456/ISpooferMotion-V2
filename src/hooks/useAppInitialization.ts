import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { useEffect, useState } from 'react';

import { useConfig } from '../contexts/ConfigContext';
import { isTauriRuntime } from '../utils/tauriRuntime';

export function useAppInitialization() {
  const { config } = useConfig();
  const [maintenance, setMaintenance] = useState<{ mode: boolean; message: string }>({
    mode: false,
    message: '',
  });
  const [isRobloxApiDown, setIsRobloxApiDown] = useState(false);

  // 1. Check Roblox API Status
  useEffect(() => {
    if (!isTauriRuntime()) return;

    const checkStatus = async () => {
      try {
        const isUp: boolean = await invoke('check_roblox_api_status');
        setIsRobloxApiDown(!isUp);
      } catch (e) {
        setIsRobloxApiDown(true);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch remote config (Maintenance Mode)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const baseUrl =
          import.meta.env.VITE_API_BASE_URL === undefined
            ? 'https://ispoofermotion.com'
            : import.meta.env.VITE_API_BASE_URL;
        let res;
        if (isTauriRuntime()) {
          const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
          res = await tauriFetch(`${baseUrl}/api/config`);
        } else {
          res = await fetch(`${baseUrl}/api/config`);
        }
        if (res.ok) {
          const data = await res.json();
          if (data.maintenanceMode) {
            setMaintenance({ mode: true, message: data.maintenanceMessage });
          }
        }
      } catch (e) {
        console.warn('Could not connect to app config server:', e);
      }
    };
    fetchConfig();
  }, []);

  // 3. Heartbeat
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const sendHeartbeat = async () => {
      try {
        const baseUrl =
          import.meta.env.VITE_API_BASE_URL === undefined
            ? 'https://ispoofermotion.com'
            : import.meta.env.VITE_API_BASE_URL;
        if (isTauriRuntime()) {
          const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
          await tauriFetch(`${baseUrl}/api/dev/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'spoofer' }),
          });
        } else {
          await fetch(`${baseUrl}/api/dev/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'spoofer' }),
          });
        }
      } catch (e) {
        // ignore network errors for heartbeat
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, []);

  // 4. Global Shortcuts & Dragging Prevention
  useEffect(() => {
    const preventDrag = (e: Event) => e.preventDefault();
    window.addEventListener('dragover', preventDrag);
    window.addEventListener('drop', preventDrag);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')) {
        invoke('open_frontend_devtools').catch(console.error);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const shortcut = 'Alt+I';
    let isCancelled = false;
    let didRegisterShortcut = false;
    const registerShortcut = async () => {
      if (!isTauriRuntime()) return;
      try {
        if (await isRegistered(shortcut)) return;
        await register(shortcut, async (event) => {
          if (event.state === 'Pressed') {
            const win = getCurrentWindow();
            await win.show();
            await win.setFocus();
          }
        });
        didRegisterShortcut = true;
        if (isCancelled) {
          await unregister(shortcut);
          didRegisterShortcut = false;
        }
      } catch (error) {
        if (!String(error).includes('already registered')) {
          console.error(error);
        }
      }
    };

    void registerShortcut();

    return () => {
      isCancelled = true;
      window.removeEventListener('dragover', preventDrag);
      window.removeEventListener('drop', preventDrag);
      window.removeEventListener('keydown', handleKeyDown);
      if (!didRegisterShortcut) return;
      unregister(shortcut).catch((error) => {
        if (!String(error).toLowerCase().includes('not registered')) {
          console.error(error);
        }
      });
    };
  }, []);

  // 5. Economy Metadata fetch
  useEffect(() => {
    if (config.spoofing.cookie) {
      invoke('get_economy_metadata', { cookie: config.spoofing.cookie }).catch(() => {});
    }
  }, [config.spoofing.cookie]);

  return { maintenance, isRobloxApiDown };
}
