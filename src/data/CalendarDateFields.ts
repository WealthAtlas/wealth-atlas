import { utcDay } from '@/domain/utils/DateUtils';

/**
 * The date-only columns, and the write-side half of the UTC-day rule.
 *
 * The read side is the entity constructors: every one of these fields is
 * truncated by `utcDay` on the way into its domain object, so nothing in the
 * domain ever compares a day against a value carrying a time. That alone is
 * enough to make the *arithmetic* right, but it leaves the store holding
 * whatever it was given — a legacy row written by the old local-time schedule
 * stepping, or a future repository that forgets. This normalises on the way in
 * too, in Dexie's own hooks, so no repository can forget and the store converges
 * on clean values as rows are rewritten, with no migration needed.
 *
 * There is no migration precisely because nothing reads these columns raw. No
 * repository does an indexed date-range query — every date comparison in the app
 * happens in memory, on an entity that has already truncated. So a legacy row
 * behaves correctly the moment it is read, and is cleaned the next time it is
 * written; a schema bump, with the mesh lockout it forces on every other device,
 * would buy nothing.
 *
 * What is deliberately NOT here matters as much as what is. Every machine
 * timestamp keeps its time:
 *
 * - `assets.manualValueUpdatedAt` / `scriptValueUpdatedAt` and
 *   `currencyRates.manualUpdatedAt` / `scriptUpdatedAt` drive "is this value
 *   stale?" checks against a one-day threshold (`Asset.isScriptValueStale`), so
 *   the time of day is the content.
 * - `goals.createdAt`, `decisions.createdAt` / `reviewedAt`, `memories.createdAt`
 *   record when something happened rather than which day it is *for*.
 */
export const CALENDAR_DATE_FIELDS: Record<string, readonly string[]> = {
  assets: ['maturityDate'],
  investments: ['date'],
  sips: ['startDate', 'endDate', 'lastGeneratedDate'],
  expenses: ['date'],
  loans: ['startDate'],
  emis: ['startDate', 'endDate', 'lastGeneratedDate'],
  payments: ['date'],
  goals: ['maturityDate'],
};

/** Truncates a row's calendar dates in place, for Dexie's `creating` hook. */
export function normaliseCalendarDates(tableName: string, row: Record<string, unknown>): void {
  const fields = CALENDAR_DATE_FIELDS[tableName];
  if (!fields) return;
  for (const field of fields) {
    const value = row[field];
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      row[field] = utcDay(value);
    }
  }
}

/**
 * The truncations a write needs, for Dexie's `updating` hook, which takes extra
 * modifications as a return value rather than letting the hook mutate.
 *
 * Only fields actually being written are considered. Normalising a stored field
 * the write never mentioned would turn an unrelated edit into a date change —
 * and, through `isNoOpUpdate`, into a push nobody asked for.
 */
export function calendarDateModifications(
  tableName: string,
  modifications: Record<string, unknown>
): Record<string, unknown> {
  const fields = CALENDAR_DATE_FIELDS[tableName];
  if (!fields) return {};
  const extra: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field in modifications)) continue;
    const value = modifications[field];
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const day = utcDay(value);
      if (day.getTime() !== value.getTime()) extra[field] = day;
    }
  }
  return extra;
}
