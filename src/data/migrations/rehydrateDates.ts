/**
 * Any path that moves rows through JSON — a backup file, an encrypted sync
 * snapshot — turns Date columns into ISO strings. Writing those straight back
 * into IndexedDB leaves the store with strings where the rest of the app expects
 * Dates, which silently breaks every `tx.date <= till` comparison.
 *
 * Rehydrate before writing.
 */

const DATE_FIELDS: Record<string, readonly string[]> = {
  assets: ['maturityDate', 'manualValueUpdatedAt', 'scriptValueUpdatedAt'],
  investments: ['date'],
  sips: ['startDate', 'endDate', 'lastGeneratedDate'],
  expenses: ['date'],
  loans: ['startDate'],
  emis: ['startDate', 'endDate', 'lastGeneratedDate'],
  payments: ['date'],
  goals: ['maturityDate', 'createdAt'],
  allocations: [],
  settings: [],
  currencyRates: ['manualUpdatedAt', 'scriptUpdatedAt'],
  // `evidence` deliberately holds no Date: only top-level fields are walked, so
  // a nested one would arrive from a snapshot as a string and stay a string.
  decisions: ['createdAt', 'reviewedAt'],
  memories: ['createdAt', 'updatedAt'],
};

type LooseRow = Record<string, unknown>;

function toDate(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

/** Converts the known date columns of one table's rows to Date objects, in place. */
export function rehydrateTableDates(tableName: string, rows: LooseRow[] | undefined): void {
  const fields = DATE_FIELDS[tableName];
  if (!fields || !rows) return;
  for (const row of rows) {
    for (const field of fields) {
      if (field in row) {
        row[field] = toDate(row[field]);
      }
    }
  }
}

/** Rehydrates every table in a snapshot/backup `data` object, in place. */
export function rehydrateSnapshotDates(data: Record<string, LooseRow[] | undefined>): void {
  for (const tableName of Object.keys(DATE_FIELDS)) {
    rehydrateTableDates(tableName, data[tableName]);
  }
}
