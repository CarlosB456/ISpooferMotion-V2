import { describe, expect, it } from 'vitest';

import { appendSpoofingLog } from './spoofingLogs';

describe('appendSpoofingLog', () => {
  it('appends a single line', () => {
    const result = appendSpoofingLog([], '[INFO] hello');
    expect(result).toEqual(['[INFO] hello']);
  });

  it('preserves multi-line chunks as a single entry for color formatting', () => {
    const result = appendSpoofingLog([], 'line1\nline2\nline3');
    expect(result).toEqual(['line1\nline2\nline3']);
  });

  it('ignores empty or whitespace-only chunks', () => {
    expect(appendSpoofingLog(['existing'], '')).toEqual(['existing']);
    expect(appendSpoofingLog(['existing'], '   ')).toEqual(['existing']);
  });

  it('trims chunk before appending', () => {
    const result = appendSpoofingLog([], '  [WARN] trimmed  ');
    expect(result).toEqual(['[WARN] trimmed']);
  });

  it('caps the log at 750 lines', () => {
    const existing = Array.from({ length: 749 }, (_, i) => `line ${i}`);
    const result = appendSpoofingLog(existing, 'new entry');
    expect(result).toHaveLength(750);
    expect(result[result.length - 1]).toBe('new entry');
  });

  it('slices from the end when over the limit', () => {
    const existing = Array.from({ length: 750 }, (_, i) => `old ${i}`);
    const result = appendSpoofingLog(existing, 'new line');
    expect(result).toHaveLength(750);
    expect(result[result.length - 1]).toBe('new line');
    expect(result[0]).toBe('old 1');
  });

  it('accumulates multiple appends correctly', () => {
    let logs: string[] = [];
    logs = appendSpoofingLog(logs, '[INFO] start');
    logs = appendSpoofingLog(logs, '[SUCCESS] done');
    expect(logs).toEqual(['[INFO] start', '[SUCCESS] done']);
  });
});
