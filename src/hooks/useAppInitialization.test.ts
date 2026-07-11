import { renderHook, act } from '@testing-library/react';
import { useAppInitialization } from './useAppInitialization';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as tauriCore from '@tauri-apps/api/core';

// Mock Tauri plugin HTTP so we don't actually fetch
vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

// Mock tauriRuntime utility
vi.mock('../utils/tauriRuntime', () => ({
  isTauriRuntime: vi.fn(() => true),
}));

// Mock the shortcut plugin
vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  isRegistered: vi.fn().mockResolvedValue(false),
  register: vi.fn().mockResolvedValue(undefined),
  unregister: vi.fn().mockResolvedValue(undefined),
}));

describe('useAppInitialization', () => {
  let mockFetch: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    );

    const tauriHttp = await import('@tauri-apps/plugin-http');
    mockFetch = tauriHttp.fetch as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default state', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    );

    const { result } = renderHook(() => useAppInitialization());

    expect(result.current.isRobloxApiDown).toBe(false);
    expect(result.current.maintenance.mode).toBe(false);
  });

  it('sets Roblox API down if check_roblox_api_status returns false', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    );

    (tauriCore.invoke as any).mockImplementationOnce((cmd: string) => {
      if (cmd === 'check_roblox_api_status') return Promise.resolve(false);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAppInitialization());

    await vi.advanceTimersByTimeAsync(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.isRobloxApiDown).toBe(true);
  });

  it('sets maintenance mode if config returns true', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ maintenanceMode: true, maintenanceMessage: 'Down for updates' }),
      }),
    );

    const { result } = renderHook(() => useAppInitialization());

    await vi.advanceTimersByTimeAsync(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.maintenance.mode).toBe(true);
    expect(result.current.maintenance.message).toBe('Down for updates');
  });

  it('registers keyboard shortcuts and events on mount', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    );

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    renderHook(() => useAppInitialization());

    await vi.advanceTimersByTimeAsync(100);

    await vi.advanceTimersByTimeAsync(100);
    expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
