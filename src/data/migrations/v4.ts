import { toCurrencyCode } from '@/domain/entities/shared/Currency';

/**
 * Schema v4 row transforms.
 *
 * These are written as in-place mutations over loosely-typed rows so the exact
 * same logic can be applied from three places: the Dexie upgrade, a restored
 * backup file, and a pulled sync snapshot. Each is idempotent.
 */

type LegacyRow = Record<string, unknown>;

/**
 * investments.price -> investments.totalAmount.
 *
 * Sells are stored positive from v4 onwards (direction comes from `type`), so a
 * sell that was hand-entered as a negative number is flipped to positive here.
 * Buys are left exactly as they were, including any negative values, so existing
 * totals do not shift underneath the user.
 */
export function upgradeInvestmentRowToV4(row: LegacyRow): void {
  if (row.totalAmount === undefined) {
    row.totalAmount = typeof row.price === 'number' ? row.price : 0;
  }
  delete row.price;

  if (row.type === undefined) {
    row.type = 'buy';
  }

  if (row.type === 'sell') {
    if (typeof row.totalAmount === 'number' && row.totalAmount < 0) {
      row.totalAmount = Math.abs(row.totalAmount);
    }
    if (typeof row.quantity === 'number' && row.quantity < 0) {
      row.quantity = Math.abs(row.quantity);
    }
  }
}

/** expenses.currency: '₹' -> 'INR'. Unrecognised values fall back to INR. */
export function upgradeExpenseRowToV4(row: LegacyRow): void {
  row.currency = toCurrencyCode(typeof row.currency === 'string' ? row.currency : undefined);
}

/**
 * Assets, loans and goals already stored ISO codes, but a hand-edited backup or
 * an older build could carry a symbol. Coerce defensively.
 */
export function upgradeCurrencyBearingRowToV4(row: LegacyRow): void {
  if (row.currency !== undefined) {
    row.currency = toCurrencyCode(typeof row.currency === 'string' ? row.currency : undefined);
  }
}

/** Applies every v4 transform to a full set of table arrays, in place. */
export function upgradeSnapshotDataToV4(data: Record<string, LegacyRow[] | undefined>): void {
  data.investments?.forEach(upgradeInvestmentRowToV4);
  data.expenses?.forEach(upgradeExpenseRowToV4);
  data.assets?.forEach(upgradeCurrencyBearingRowToV4);
  data.loans?.forEach(upgradeCurrencyBearingRowToV4);
  data.goals?.forEach(upgradeCurrencyBearingRowToV4);
}
