import { renderHook } from '@testing-library/react';
import { useStudioAssetPoll } from './useStudioAssetPoll';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as tauriCore from '@tauri-apps/api/core';

describe('useStudioAssetPoll', () => {
  const defaultBundle = {
    anims: { assets: [], scanning: false, complete: false },
    sounds: { assets: [], scanning: false, complete: false },
    images: { assets: [], scanning: false, complete: false },
    meshes: { assets: [], scanning: false, complete: false },
    scriptRefs: { assets: [], scanning: false, complete: false },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not poll if studioConnected is false', async () => {
    const onComplete = vi.fn();
    const invokeSpy = (tauriCore.invoke as any).mockResolvedValue(defaultBundle);

    renderHook(() => useStudioAssetPoll(false, onComplete));

    await vi.advanceTimersByTimeAsync(5000);
    expect(invokeSpy).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('polls and does not call onComplete if incomplete', async () => {
    const onComplete = vi.fn();
    const invokeSpy = (tauriCore.invoke as any).mockResolvedValue({
      ...defaultBundle,
      anims: { assets: [], scanning: true, complete: false },
    });

    renderHook(() => useStudioAssetPoll(true, onComplete));

    await vi.advanceTimersByTimeAsync(100);

    // Initial poll
    expect(invokeSpy).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    // Fast polling while scanning (1000ms interval)
    await vi.advanceTimersByTimeAsync(1100);
    expect(invokeSpy).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete when all stores are complete', async () => {
    const onComplete = vi.fn();
    const completeBundle = {
      anims: { assets: [{ name: 'anim1' }], scanning: false, complete: true },
      sounds: { assets: [], scanning: false, complete: true },
      images: { assets: [], scanning: false, complete: true },
      meshes: { assets: [], scanning: false, complete: true },
      scriptRefs: { assets: [], scanning: false, complete: true },
    };

    const invokeSpy = (tauriCore.invoke as any).mockResolvedValue(completeBundle);

    renderHook(() => useStudioAssetPoll(true, onComplete));

    await vi.advanceTimersByTimeAsync(100);

    await vi.advanceTimersByTimeAsync(100);
    expect(invokeSpy).toHaveBeenCalled();

    // Resolve the poll promise queue
    await vi.advanceTimersByTimeAsync(100);

    expect(onComplete).toHaveBeenCalledWith(completeBundle);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete twice if bundle hash is unchanged', async () => {
    const onComplete = vi.fn();
    const completeBundle = {
      anims: { assets: [{ name: 'anim1' }], scanning: false, complete: true },
      sounds: { assets: [], scanning: false, complete: true },
      images: { assets: [], scanning: false, complete: true },
      meshes: { assets: [], scanning: false, complete: true },
      scriptRefs: { assets: [], scanning: false, complete: true },
    };

    const invokeSpy = (tauriCore.invoke as any).mockResolvedValue(completeBundle);

    renderHook(() => useStudioAssetPoll(true, onComplete));

    await vi.advanceTimersByTimeAsync(100);

    await vi.advanceTimersByTimeAsync(100);
    expect(invokeSpy).toHaveBeenCalled();

    // First complete
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Fast forward to next poll (1.5s idle interval)
    await vi.advanceTimersByTimeAsync(1600);
    expect(invokeSpy).toHaveBeenCalledTimes(2);

    // Hash is the same, should not trigger onComplete again
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
