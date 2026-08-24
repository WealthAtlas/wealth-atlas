import { db } from '@/data/database';
import { deleteSynced } from '@/data/sync/merge/Tombstones';
import { DecisionEntry, IDecisionEntry } from '@/domain/entities/journal/DecisionEntry';

/**
 * The decision journal. Newest first, because that is the only order it is ever
 * read in — a journal is reviewed from the present backwards.
 */
export class DecisionRepository {
  public async getAll(): Promise<DecisionEntry[]> {
    const rows = await db.decisions.orderBy('createdAt').reverse().toArray();
    return rows.map(row => new DecisionEntry(row));
  }

  public async getByCategory(category: string): Promise<DecisionEntry[]> {
    const rows = await db.decisions.where('category').equals(category).toArray();
    return rows
      .map(row => new DecisionEntry(row))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  public async save(entry: IDecisionEntry): Promise<DecisionEntry> {
    const id = await db.decisions.put({ ...entry, id: entry.id });
    return new DecisionEntry({ ...entry, id });
  }

  public async delete(id: number): Promise<void> {
    await deleteSynced('decisions', [id]);
  }
}
