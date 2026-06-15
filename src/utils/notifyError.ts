import { invoke } from '@tauri-apps/api/core';

import { isTauriRuntime } from './tauriRuntime';

// pops up a native OS notification if we're in tauri, otherwise just yells in the console
export async function notifyError(title: string, message?: string) {
  const body = message ?? title;
  if (isTauriRuntime()) {
    try {
      await invoke('show_notification', { options: { title, body } });
      return;
    } catch {}
  }
  console.error(title, message ?? '');
}
