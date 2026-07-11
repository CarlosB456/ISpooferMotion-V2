import { renderHook } from '@testing-library/react';
import { useStudioConnection } from './useStudioConnection';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as tauriCore from '@tauri-apps/api/core';
import * as pluginBridge from '../utils/pluginBridge';

vi.mock('../utils/pluginBridge', () => ({
  findPluginBridgePort: vi.fn(),
}));

describe('useStudioConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with disconnected state if no port found', async () => {
    (pluginBridge.findPluginBridgePort as any).mockResolvedValue(null);

    const { result } = renderHook(() => useStudioConnection());

    expect(result.current.studioConnected).toBe(false);
    expect(result.current.scanStatus).toBeNull();
  });

  it('sets connected and reads place ID if bridge port active and synced', async () => {
    (pluginBridge.findPluginBridgePort as any).mockResolvedValue(55055);
    (tauriCore.invoke as any).mockResolvedValue({
      synced: true,
      scanStatus: null,
      studioPlaceId: '123456789',
    });

    const { result } = renderHook(() => useStudioConnection());

    await vi.advanceTimersByTimeAsync(100);

    await vi.advanceTimersByTimeAsync(100);
    expect(result.current.studioConnected).toBe(true);
    expect(result.current.studioPlaceId).toBe('123456789');

    expect(window.localStorage.getItem('ISpooferMotion_LastStudioPlaceId')).toBe('123456789');
  });

  it('caches and loads place ID from local storage', async () => {
    window.localStorage.setItem('ISpooferMotion_LastStudioPlaceId', '987654321');
    (pluginBridge.findPluginBridgePort as any).mockResolvedValue(null);

    const { result } = renderHook(() => useStudioConnection());

    expect(result.current.studioPlaceId).toBe('987654321');
  });

  it('updates scan status', async () => {
    (pluginBridge.findPluginBridgePort as any).mockResolvedValue(55055);
    const mockStatus = {
      scanning: true,
      current_service: 'Animations',
      scanned: 10,
      total: 100,
    };
    (tauriCore.invoke as any).mockResolvedValue({
      synced: true,
      scanStatus: mockStatus,
      studioPlaceId: '12345',
    });

    const { result } = renderHook(() => useStudioConnection());

    await vi.advanceTimersByTimeAsync(100);

    await vi.advanceTimersByTimeAsync(100);
    expect(result.current.scanStatus).toEqual(mockStatus);
  });

  it('backs off polling interval on failure', async () => {
    (pluginBridge.findPluginBridgePort as any).mockResolvedValue(null);

    renderHook(() => useStudioConnection());

    // First check completes
    await vi.advanceTimersByTimeAsync(100);

    // Advance 1300ms, total elapsed = 1400ms. Shouldn't trigger (needs 1500ms)
    await vi.advanceTimersByTimeAsync(1300);
    expect(pluginBridge.findPluginBridgePort).toHaveBeenCalledTimes(1);

    // Advance 200ms, total elapsed = 1600ms. Should trigger.
    await vi.advanceTimersByTimeAsync(200);
    expect(pluginBridge.findPluginBridgePort).toHaveBeenCalledTimes(2);

    // Next delay is 2250. Advance 2100ms. Shouldn't trigger.
    await vi.advanceTimersByTimeAsync(2100);
    expect(pluginBridge.findPluginBridgePort).toHaveBeenCalledTimes(2);

    // Advance 200ms. Should trigger.
    await vi.advanceTimersByTimeAsync(200);
    expect(pluginBridge.findPluginBridgePort).toHaveBeenCalledTimes(3);
  });
});
