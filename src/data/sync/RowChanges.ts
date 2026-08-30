/**
 * Whether a write actually changes the row it is writing.
 *
 * Sync publishes the whole database, so the cost of a pointless write is not one
 * row — it is a new cloud version, which makes every other device stale and
 * turns its next edit into a conflict it has to be asked about. Saving a form
 * without editing anything is exactly that write: the dialog hands back the row
 * it was given, Dexie fires the `updating` hook, and a push used to be armed
 * behind it.
 *
 * So a write that changes nothing claims nothing. This is read by the hook in
 * `database.ts` and by `AutoSyncService`, which is why it lives outside both.
 */

/** A stored row, judged only by its own fields. */
export type StoredRow = Record<string, unknown>;

function sameValue(next: unknown, current: unknown): boolean {
  if (next === current) return true;
  if (next instanceof Date && current instanceof Date) return next.getTime() === current.getTime();
  if (next === null || current === null) return false;
  if (typeof next !== 'object' || typeof current !== 'object') return false;
  // Settings blocks and allocation arrays are written whole, so a re-save of an
  // identical one is still a re-save of nothing.
  return JSON.stringify(next) === JSON.stringify(current);
}

export function isNoOpUpdate(
  modifications: Record<string, unknown>,
  existing: StoredRow | undefined
): boolean {
  if (!existing) return false;
  return Object.keys(modifications).every(key => sameValue(modifications[key], existing[key]));
}
