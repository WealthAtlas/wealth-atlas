/** Returns a YYYY-MM string for the given date, used as a month grouping key. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns a YYYY-MM-DD string. This is the only date format exchanged with a
 * model, in both directions — see `ImportPromptBuilder` and `ChatPromptBuilder`.
 */
export function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
