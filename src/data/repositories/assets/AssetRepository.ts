import { IAsset } from '../../../domain/entities/assets/Asset';
import { db } from '../../database';

/**
 * Whether this row still carries the copies of its own transactions that a past
 * whole-row value write left inside it.
 *
 * `updateValue` used to build its row by spreading an `Asset` instance, and a
 * class instance's own properties include the entity's `investments` and `sips`
 * collections — so every scripted asset accumulated a duplicate of its own
 * transactions inside its row, in IndexedDB, in every sync snapshot and in every
 * backup. Nothing ever read them back (`toAsset` supplies the real ones from
 * their own tables), which is why the bug was invisible; what it costs is size,
 * and sync publishes the whole database on every push.
 *
 * A key test rather than a truthiness one: an asset written while it had no
 * transactions carries two empty arrays, which are just as much dead weight.
 */
export function hasEmbeddedCollections(asset: IAsset): boolean {
  const row = asset as IAsset & Record<string, unknown>;
  return 'investments' in row || 'sips' in row;
}

export class AssetRepository {
  async create(asset: IAsset): Promise<IAsset> {
    // Auto-sync: This operation will automatically trigger sync if enabled
    const id = await db.assets.add(asset);
    return { ...asset, id };
  }

  async getAll(): Promise<IAsset[]> {
    return await db.assets.toArray();
  }

  async getById(id: number): Promise<IAsset> {
    return (await db.assets.get(id))!;
  }

  async update(updates: IAsset): Promise<IAsset> {
    // Auto-sync: This operation will automatically trigger sync if enabled
    await db.assets.update(updates.id, updates);
    return { ...updates };
  }

  /**
   * Writes the two script-value columns and nothing else.
   *
   * A whole-row write is wrong here twice over. It would carry the copy of the
   * asset that was read *before* the script's network call, so an edit the user
   * made while it was in flight is overwritten by the pre-edit copy — silently,
   * because a value refresh runs under `withoutScheduling` and so is claimed as
   * automatic: no push, no unpushed mark, no trace that the edit existed. And
   * spreading an `Asset` to build that row copies the entity's own `investments`
   * and `sips` arrays into the asset record, storing a duplicate of every
   * transaction inside it — in IndexedDB, in the sync snapshot and in the backup.
   * Neither is visible to `tsc`: spread properties are exempt from excess
   * property checks.
   */
  async updateScriptValue(id: number, scriptValue: number, updatedAt: Date): Promise<void> {
    await db.assets.update(id, { scriptValue, scriptValueUpdatedAt: updatedAt });
  }

  /**
   * Removes the transaction arrays a past whole-row write embedded in the row.
   *
   * Dexie deletes a property whose value in the changes object is `undefined`,
   * which is what makes this a two-key edit rather than a rewrite — the row is
   * left otherwise exactly as it stands, including any field this build has no
   * name for.
   */
  async clearEmbeddedCollections(id: number): Promise<void> {
    await db.assets.update(id, { investments: undefined, sips: undefined } as Partial<IAsset>);
  }

  async delete(id: number): Promise<void> {
    await db.assets.delete(id);
  }
}
