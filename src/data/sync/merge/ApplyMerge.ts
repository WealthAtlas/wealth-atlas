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

/** One local row a merge would not leave as it found it, named for the user. */
export interface MergeImpact {
  table: SyncedTableName;
  /** The row as the user would recognise it, not its id. */
  label: string;
}

export interface MergeReport {
  /** Whether the merged result differs from the cloud's, so a push is owed. */
  localAhead: boolean;
  written: number;
  removed: number;
  /**
   * Local rows the incoming copy would replace outright, and local rows the
   * cloud has deleted. Kept apart from the counts because these are the only
   * two things a merge does that a user could regret: everything else it does
   * is additive, and a merge with nothing here cannot cost anything.
   *
   * A replacement is row-level, so it carries the *whole* incoming row — which
   * is why it is worth naming even when the incoming row is genuinely newer. A
   * device that was read before it was refreshed writes stale fields forward
   * under a fresh timestamp, and those field values are what disappear.
   */
  overwrites: MergeImpact[];
  removals: MergeImpact[];
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

/** How the user would name a row: what the list screens show, not the id. */
function labelOf(row: MergeableRow): string {
  for (const field of ['name', 'description', 'code', 'text', 'category']) {
    const value = row[field];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return `#${row.id ?? '?'}`;
}

/**
 * `dryRun` computes the whole plan and writes none of it, so the app can say
 * what a merge would cost *before* doing it. The same code path as the real
 * thing on purpose: a preview computed by a second implementation is a preview
 * of something else.
 */
export async function applyMerge(
  data: SnapshotData,
  now = Date.now(),
  options: { dryRun?: boolean } = {}
): Promise<MergeReport> {
  const report: MergeReport = {
    localAhead: false,
    written: 0,
    removed: 0,
    orphaned: 0,
    overwrites: [],
    removals: [],
  };
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
            const replaced = local.find(row => row.id === write.localId);
            if (replaced) report.overwrites.push({ table: spec.name, label: labelOf(replaced) });
            // Written over the local row, keeping its id: everything that
            // references it locally goes on referencing the right thing.
            if (!options.dryRun) await table.put({ ...remapped.row, id: write.localId });
          } else {
            const key = identityOf(spec, remapped.row);
            // The id has to be minted even for a preview, or this table's own
            // children resolve against nothing and report as orphans that the
            // real merge would have kept.
            const newId = options.dryRun
              ? -(idMap.size + 1)
              : await table.add({ ...remapped.row, id: undefined });
            // Registered so this table's own children can resolve a parent that
            // arrived in the same snapshot.
            if (write.incoming.id !== undefined) idMap.set(write.incoming.id, Number(newId));
            if (key === undefined) Logger.warn(`Merged a ${spec.name} row with no identity`);
          }
          report.written++;
        }

        for (const row of plan.removals) {
          report.removals.push({ table: spec.name, label: labelOf(row) });
        }
        const removals = plan.removals
          .map(row => row.id)
          .filter((id): id is number => id !== undefined);
        if (removals.length > 0) {
          if (!options.dryRun) await table.bulkDelete(removals);
          report.removed += removals.length;
        }
      }

      if (options.dryRun) return;

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
    `${options.dryRun ? 'Previewed' : 'Merged'} a snapshot: ${report.written} written, ` +
      `${report.removed} removed, ${report.orphaned} orphaned, ` +
      `${report.overwrites.length} overwritten, local ${report.localAhead ? 'ahead' : 'in step'}`
  );
  return report;
}
