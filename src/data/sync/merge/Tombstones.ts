import { db, tableByName } from '@/data/database';
import { Logger } from '@/domain/utils/Logger';
import { identityOf, type Tombstone } from './MergeRows';
import type { IDeletion } from './SyncMeta';
import { syncedTable, type SyncedTableName } from './SyncedTables';

/**
 * The only way a synced row is deleted.
 *
 * The delete and its tombstone are written in one transaction, because a
 * tombstone that can be lost by a crash the delete survives is precisely the
 * case that resurrects a row on the next merge. That is also why this is not a
 * Dexie `deleting` hook: a hook cannot write to a table outside its
 * transaction's scope, so it could only record the deletion afterwards, outside
 * the guarantee.
 */
export async function deleteSynced(
  name: SyncedTableName,
  ids: readonly (number | undefined)[]
): Promise<void> {
  const keys = ids.filter((id): id is number => id !== undefined);
  if (keys.length === 0) return;

  const table = tableByName(name);
  const spec = syncedTable(name);

  await db.transaction('rw', [table, db.deletions], async () => {
    const rows = await table.bulkGet(keys);
    const deletedAt = new Date();
    const tombstones: IDeletion[] = [];
    for (const row of rows) {
      if (!row) continue;
      const key = identityOf(spec, row);
      if (key === undefined) {
        // Nothing can name this row to another device, so its deletion cannot
        // travel. Said out loud rather than dropped silently: it means a row
        // reached the store past the stamping hooks.
        Logger.warn(`Deleting a ${name} row with no sync identity; the deletion will not sync`);
        continue;
      }
      tombstones.push({ table: name, key, deletedAt });
    }
    await table.bulkDelete(keys);
    await db.deletions.bulkAdd(tombstones);
  });
}

/** The tombstones belonging to one table. */
export function tombstonesFor(rows: readonly IDeletion[], name: SyncedTableName): Tombstone[] {
  return rows.filter(row => row.table === name);
}
