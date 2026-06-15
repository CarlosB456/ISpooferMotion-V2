const MAX_SPOOFING_LOG_CHARS = 512_000;

// appends a log chunk and trims the oldest logs if we exceed the max character limit
export function appendSpoofingLog(prev: string, chunk: string): string {
  const next = prev + chunk;
  if (next.length <= MAX_SPOOFING_LOG_CHARS) return next;
  const overflow = next.length - MAX_SPOOFING_LOG_CHARS;
  // try to cut at a newline so we don't end up with half a log message
  const cutAt = next.indexOf('\n', overflow);
  return cutAt === -1 ? next.slice(-MAX_SPOOFING_LOG_CHARS) : next.slice(cutAt + 1);
}
