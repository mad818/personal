const MAX_BOT_HISTORY_ENTRIES = 120;

export function pruneBotHistory<T>(history: T[] | null | undefined): T[] {
  if (!Array.isArray(history)) return [];
  if (history.length <= MAX_BOT_HISTORY_ENTRIES) return history;
  return history.slice(-MAX_BOT_HISTORY_ENTRIES);
}
