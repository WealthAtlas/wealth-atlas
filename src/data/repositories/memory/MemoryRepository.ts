import { db } from '@/data/database';
import { deleteSynced } from '@/data/sync/merge/Tombstones';
import { IMemory, Memory } from '@/domain/entities/memory/Memory';

/**
 * The assistant's long-term memory.
 *
 * Always read whole — the entire set goes into every system prompt — so there is
 * no query here and no index beyond the primary key. Ordering is done in memory
 * over a list capped at `MEMORY_LIMIT`, which is cheaper than the index it would
 * otherwise need.
 */
export class MemoryRepository {
  /** Oldest first, so the Settings list is stable as rows are added. */
  public async getAll(): Promise<Memory[]> {
    const rows = await db.memories.toArray();
    return rows
      .map(row => new Memory(row))
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  public async create(memory: IMemory): Promise<Memory> {
    const id = await db.memories.add({ ...memory, id: undefined });
    return new Memory({ ...memory, id });
  }

  public async update(memory: IMemory): Promise<Memory> {
    // `put` with no key inserts, so an id that went missing would silently
    // duplicate the row it meant to replace rather than failing.
    if (memory.id === undefined) throw new Error('Cannot update a memory with no id.');
    await db.memories.put({ ...memory });
    return new Memory(memory);
  }

  public async delete(id: number): Promise<void> {
    await deleteSynced('memories', [id]);
  }
}
