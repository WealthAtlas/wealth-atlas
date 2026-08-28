/**
 * Every date the *user* enters is a calendar day, not an instant, and this
 * module is the one place that arithmetic happens — in UTC throughout.
 *
 * The reason is a bug the local-time alternative cannot avoid. A date input
 * yields `YYYY-MM-DD`, which `new Date(...)` reads as UTC midnight, while
 * `setMonth`/`getMonth` and `toLocaleDateString` all work in the *browser's*
 * zone. Mix the two and the day drifts by the offset: a monthly SIP starting
 * 1 Jan walks 1 Jan → 31 Jan → 2 Mar in a UTC-5 zone, an occurrence lands an
 * hour off its own end date under BST, and a 1 Jan expense is grouped into — and
 * displayed as — 31 December. Nothing in the store is wrong; the arithmetic
 * reading it is, and it reads differently on the user's phone and their laptop.
 *
 * So: a calendar date is UTC midnight, produced only by `utcDay`/`parseUtcDay`,
 * stepped only by the `addUtc*` helpers, and rendered only through a formatter
 * pinned to UTC (`UIUtils.formatDay`). Entity constructors truncate on the way
 * in, so a legacy row carrying a time is normalised before anything compares it.
 *
 * Machine timestamps are emphatically *not* calendar dates and keep their time:
 * `updatedAt` and `deletedAt` are what a merge compares to order two writes, and
 * truncating them to a day would make every same-day edit a tie — which sync
 * reads as "in step", so neither device publishes and both keep a different row.
 * `createdAt`, `reviewedAt` and the `*UpdatedAt` value stamps are instants for
 * the same reason: they record when something happened, not which day it is for.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Truncates any Date to the UTC day containing it.
 *
 * Note this is `setUTCHours(0,0,0,0)` and not a local truncation: the input is
 * already meant to be a UTC-midnight day, and the only job here is to strip a
 * time that a legacy row, a generated occurrence or a `new Date()` brought with
 * it. Truncating locally would move the day itself in any zone behind UTC.
 */
export function utcDay(date: Date): Date {
  const day = new Date(date.getTime());
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

/** Today as a calendar day. The upper bound for anything "up to now". */
export function utcToday(): Date {
  return utcDay(new Date());
}

/**
 * Parses a date input's `YYYY-MM-DD` into a calendar day.
 *
 * Returns undefined for an empty or unparseable value rather than an Invalid
 * Date, because an Invalid Date compares false against everything and so passes
 * silently through every `<=` in the domain.
 */
export function parseUtcDay(value: string | number | Date | undefined): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : utcDay(parsed);
}

/** The first day of the UTC month containing `date`. The expense bucket key. */
export function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Adds calendar months, clamping to the end of the target month.
 *
 * Two wrong answers to avoid, and `anchorDay` is what separates them. `Date.UTC`
 * *overflows*: month 1 day 31 becomes 2 March, so a monthly schedule starting on
 * the 31st walks 31 Jan → 2 Mar → 2 Apr and never sees a month end again. That
 * was the old local-time `setMonth` behaviour. But clamping against the previous
 * occurrence *sticks*: 31 Jan → 29 Feb → 29 Mar → 29 Apr, because once a step has
 * been shortened the original day-of-month is gone.
 *
 * So a recurring schedule passes the day-of-month it is anchored to — its
 * `startDate`'s — and each occurrence is that day, or the last of the month when
 * it is shorter. 31 Jan → 29 Feb → 31 Mar → 30 Apr → 31 May. Callers stepping a
 * one-off window bound rather than a schedule can omit it.
 */
export function addUtcMonths(date: Date, months: number, anchorDay?: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = anchorDay ?? date.getUTCDate();
  const lastOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastOfTarget)));
}

/** Adds calendar years, clamping 29 February to the 28th in a common year. */
export function addUtcYears(date: Date, years: number, anchorDay?: number): Date {
  return addUtcMonths(date, years * 12, anchorDay);
}

/** Whole days from `from` to `to`. Both are calendar days, so this is exact. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((utcDay(to).getTime() - utcDay(from).getTime()) / MS_PER_DAY);
}

/** Returns a YYYY-MM string for the given date, used as a month grouping key. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns a YYYY-MM-DD string. This is the only date format exchanged with a
 * model, in both directions — see `ImportPromptBuilder` and `ChatPromptBuilder`.
 */
export function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
