import { ALL_TABLES, db, tableByName } from '@/data/database';
import { Logger } from '@/domain/utils/Logger';
import { AutoSyncService } from '../AutoSyncService';
import {
  buildIdMap,
  identityOf,
  mergeTable,
  pruneTombstones,
  remapForeignKeys,
  type MergeableRow,
  type Tombstone,
} from './MergeRows';
import type { IDeletion } from './SyncMeta';
import { SYNCED_TABLES, type SyncedTableName } from './SyncedTables';
import { tombstonesFor } from './Tombstones';

/**
 * Applies an incoming snapshot to this device by merging it, row by row, in one
 * transaction.
 *
 * The decisions all live in `MergeRows`, which is pure and tested. What is here
 * is the part that cannot be: reading and writing the store, and the id
 * translation that makes another device's rows mean anything locally.
 *
 * Every write goes through `withoutScheduling`, for two reasons that happen to
 * be the same reason. It must not wake a push — the caller pushes deliberately,
 * once, if the merge left this device ahead. And it must not re-stamp
 * `updatedAt`: an incoming row has to keep the time the *other* device changed
 * it, or it would arrive dated "now" and win every comparison for ever after.
 */

export interface MergeReport {
  /** Whether the merged result differs from the cloud's, so a push is owed. */
  localAhead: boolean;
  written: number;
  removed: number;
  /**
   * Incoming rows dropped because the row they belonged to is gone — a
   * transaction whose asset another device deleted. Only incoming rows: a local
   * row left pointing at a parent the merge removed is not swept, because it is
   * unreachable through every query that goes via that parent, and scanning for
   * it on every merge cost more than the dead row does.
   */
  orphaned: number;
}

type SnapshotData = Record<string, MergeableRow[] | undefined>;

export async function applyMerge(data: SnapshotData, now = Date.now()): Promise<MergeReport> {
  const report: MergeReport = { localAhead: false, written: 0, removed: 0, orphaned: 0 };
  const incomingTombstones = (data.deletions ?? []) as unknown as IDeletion[];

  await AutoSyncService.withoutScheduling(() =>
    db.transaction('rw', ALL_TABLES, async () => {
      const localTombstones = await db.deletions.toArray();
      const tombstones: Tombstone[] = [];
      // Filled table by table, parents first, so a child's remap always finds a
      // parent that has already been resolved.
      const idMaps: Record<string, Map<number, number>> = {};

      for (const spec of SYNCED_TABLES) {
        const table = tableByName(spec.name);
        const local = await table.toArray();
        const incoming = (data[spec.name] ?? []) as MergeableRow[];

        const plan = mergeTable({
          table: spec,
          local,
          incoming,
          localTombstones: tombstonesFor(localTombstones, spec.name),
          incomingTombstones: tombstonesFor(incomingTombstones, spec.name),
          now,
        });

        report.localAhead = report.localAhead || plan.localAhead;
        tombstones.push(...plan.tombstones);

        const idMap = buildIdMap(spec, local, incoming);
        idMaps[spec.name] = idMap;

        for (const write of plan.writes) {
          const remapped = remapForeignKeys(spec, write.incoming, idMaps);
          if (remapped.orphaned) {
            // The row this one belonged to was deleted on the other device, so
            // there is nothing left for it to be a transaction of.
            report.orphaned++;
            continue;
          }
          if (write.localId !== undefined) {
            // Written over the local row, keeping its id: everything that
            // references it locally goes on referencing the right thing.
            await table.put({ ...remapped.row, id: write.localId });
          } else {
            const key = identityOf(spec, remapped.row);
            const newId = await table.add({ ...remapped.row, id: undefined });
            // Registered so this table's own children can resolve a parent that
            // arrived in the same snapshot.
            if (write.incoming.id !== undefined) idMap.set(write.incoming.id, Number(newId));
            if (key === undefined) Logger.warn(`Merged a ${spec.name} row with no identity`);
          }
          report.written++;
        }

        const removals = plan.removals
          .map(row => row.id)
          .filter((id): id is number => id !== undefined);
        if (removals.length > 0) {
          await table.bulkDelete(removals);
          report.removed += removals.length;
        }
      }

      // Rewritten whole rather than appended to: this is also where the pruning
      // and the de-duplication of two records of one deletion take effect.
      await db.deletions.clear();
      await db.deletions.bulkAdd(
        pruneTombstones(tombstones, now).map(tomb => ({
          table: tomb.table as SyncedTableName,
          key: tomb.key,
          deletedAt: tomb.deletedAt,
        }))
      );
    })
  );

  Logger.info(
    `Merged a snapshot: ${report.written} written, ${report.removed} removed, ` +
      `${report.orphaned} orphaned, local ${report.localAhead ? 'ahead' : 'in step'}`
  );
  return report;
}
