import { IDecisionEntry } from '@/domain/entities/journal/DecisionEntry';

/**
 * A journal entry only ever arrives from this app's own writer, so there is no
 * legacy shape to normalise. The guard is against a row that lost its evidence
 * block in transit: `reviewDecision` reads `evidence.benchmarkLevel`, and an
 * undefined `evidence` would throw rather than report `no-evidence`.
 */
export function normaliseDecisionRow(row: Record<string, unknown>): void {
  if (typeof row.evidence !== 'object' || row.evidence === null) {
    row.evidence = {} satisfies IDecisionEntry['evidence'];
  }
}

/**
 * Schema v10 adds the `decisions` table: the decision journal.
 *
 * A new table rather than a settings field, because these are rows the user
 * creates over time — the first genuinely new table since v5, and so the first
 * change that has to touch `AutoSyncService.startListening()`, the snapshot's
 * table list and `rehydrateSnapshotDates` as well as the four version bumps.
 *
 * Dexie creates the store from the `version(10).stores()` declaration, so there
 * is no row transform to run: an upgrading device simply gains an empty journal.
 * What this module exists for is the *snapshot* side — a snapshot written before
 * v10 has no `decisions` key at all, and `bulkPut(undefined)` is not the same as
 * `bulkPut([])`.
 *
 * Idempotent.
 */
export function upgradeSnapshotDataToV10(data: Record<string, unknown[] | undefined>): void {
  data.decisions ??= [];
  (data.decisions as Record<string, unknown>[]).forEach(normaliseDecisionRow);
}
