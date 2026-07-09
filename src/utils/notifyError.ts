import { invoke } from '@tauri-apps/api/core';

import { isTauriRuntime } from './tauriRuntime';

// Show native OS notification in Tauri, fallback to console.
export async function notifyError(title: string, message?: string) {
  let displayMessage = message ?? title;

  // Parse structured backend errors.
  if (message) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.message && parsed.debug) {
        displayMessage = parsed.message;
        console.error(`[Backend Error Context] ${title}`, parsed.debug);
      }
    } catch {
      // Normal string error.
    }
  }

  const body = displayMessage !== title ? displayMessage : '';

  if (isTauriRuntime()) {
    try {
      await invoke('show_notification', { options: { title, body } });
      return;
    } catch {}
  }
  console.error(title, displayMessage);
}
