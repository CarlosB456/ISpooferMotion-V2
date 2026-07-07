const MAX_LOG_LINES = 750;

export function appendSpoofingLog(prev: string[], chunk: string): string[] {
  const stripped = chunk.trim();
  if (!stripped) return prev;
  const newLogs = [...prev, stripped];
  if (newLogs.length > MAX_LOG_LINES) {
    return newLogs.slice(newLogs.length - MAX_LOG_LINES);
  }
  return newLogs;
}
