import { Logger } from '@/domain/utils/Logger';
import { BackupService, BackupData } from '@/domain/services/BackupService';
import { SyncSafetyError } from './conflict';

/**
 * A local copy of whatever a sync operation is about to discard.
 *
 * Sync replaces a whole database in one transaction, and the API keeps no
 * history: a PUT overwrites the blob, and `version` is a counter, not a log. So
 * before anything is replaced, the copy that is losing is written here, and the
 * wipe is abandoned if that write fails. The invariant is that no sync operation
 * can destroy data that cannot be handed back.
 *
 * Each copy is *exactly a backup file*, so recovery is the Import Data flow the
 * user already has rather than a rescue path of its own that nobody has ever
 * run.
 *
 * Deliberately its own IndexedDB database rather than a Dexie table. A recovery
 * copy is device-local wreckage, not the user's records: it has nothing to add
 * to a sync snapshot, restoring a months-old one from a backup file would be
 * worse than not having it, and keeping it out of Dexie's schema means it needs
 * none of the version bumps a real table does. localStorage was the other
 * option and is far too small — a whole database of assets and transactions
 * would blow the 5MB budget for everything else stored there.
 */
const DB_NAME = 'WealthAtlasRecovery';
const DB_VERSION = 1;
const STORE = 'snapshots';

/**
 * How many copies are kept. Enough that one bad replacement followed by another
 * does not push the good copy out, small enough that a database of any size
 * cannot fill the origin's quota and start failing the writes it is there to
 * guarantee.
 *
 * Only *replacements* are filed, which is what keeps this a single number: a
 * merge removes only rows another device deleted, and the app files no copy when
 * the user deletes something on this device either.
 */
const KEEP = 3;

export type RecoveryReason =
  /** A pull that replaced this device with the cloud's copy. */
  | 'pull'
  /** Linking this device to an existing sync key, which adopts the cloud's copy. */
  | 'link'
  /** A conflict the user resolved in the cloud's favour. */
  | 'take-remote'
  /** A conflict the user resolved in this device's favour; the copy is the cloud's. */
  | 'keep-local';

export interface RecoverySnapshotMeta {
  id: number;
  reason: RecoveryReason;
  takenAt: string;
  sizeBytes: number;
  /** Whose data this is — this device's, or the cloud copy it replaced. */
  origin: 'device' | 'cloud';
}

interface RecoveryRow extends RecoverySnapshotMeta {
  /** A backup file, verbatim. */
  json: string;
}

function openRecoveryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the recovery store'));
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Recovery store request failed'));
  });
}

/**
 * Stores a backup file and prunes to the newest `KEEP`.
 *
 * Throws — wrapped by the caller in `SyncSafetyError` — rather than logging and
 * carrying on. A recovery copy that quietly failed to save would leave the user
 * believing a wipe is undoable when it is not, which is worse than a sync that
 * refuses to run.
 */
export async function saveRecoverySnapshot(
  reason: RecoveryReason,
  origin: 'device' | 'cloud',
  json: string
): Promise<RecoverySnapshotMeta> {
  const db = await openRecoveryDb();
  try {
    const row: Omit<RecoveryRow, 'id'> = {
      reason,
      origin,
      takenAt: new Date().toISOString(),
      sizeBytes: json.length,
      json,
    };
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const id = (await promisify(store.add(row))) as IDBValidKey;
    const keys = (await promisify(store.getAllKeys())) as IDBValidKey[];
    // Newest last: the key auto-increments, so the oldest are at the front.
    for (const stale of keys.slice(0, Math.max(0, keys.length - KEEP))) {
      store.delete(stale);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Recovery store transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Recovery store transaction aborted'));
    });
    Logger.info(`Saved a recovery copy (${reason}, ${json.length} bytes)`);
    return { ...row, id: Number(id) };
  } finally {
    db.close();
  }
}

/** Newest first — the copy a user asking for one almost always wants. */
export async function listRecoverySnapshots(): Promise<RecoverySnapshotMeta[]> {
  const db = await openRecoveryDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const rows = (await promisify(tx.objectStore(STORE).getAll())) as RecoveryRow[];
    // The file bodies are dropped here: a caller listing them wants the labels,
    // and holding three whole databases in memory to render three rows is waste.
    return rows
      .map(({ json: _json, ...meta }) => meta)
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  } finally {
    db.close();
  }
}

/** Hands one copy back as a download, in the format Import Data accepts. */
export async function downloadRecoverySnapshot(id: number): Promise<void> {
  const db = await openRecoveryDb();
  let row: RecoveryRow | undefined;
  try {
    const tx = db.transaction(STORE, 'readonly');
    row = (await promisify(tx.objectStore(STORE).get(id))) as RecoveryRow | undefined;
  } finally {
    db.close();
  }
  if (!row) throw new Error('That recovery copy is no longer stored on this device.');

  const blob = new Blob([row.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = row.takenAt.replace(/[:.]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `wealth-atlas-recovery-${row.origin}-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  Logger.info(`Downloaded the recovery copy taken at ${row.takenAt}`);
}

/**
 * Captures this device before it is replaced. Any failure becomes a
 * `SyncSafetyError`, which the caller lets abort the operation.
 */
export async function preserveDevice(reason: RecoveryReason): Promise<void> {
  try {
    await saveRecoverySnapshot(reason, 'device', await BackupService.exportData());
  } catch (error) {
    throw new SyncSafetyError(error);
  }
}

/**
 * Captures the cloud copy a forced push is about to overwrite.
 *
 * Best effort, unlike `preserveDevice`: the data at risk is the other device's,
 * that device still holds it, and refusing to let the user resolve a conflict
 * because the losing copy could not be filed would leave them stuck with a
 * device that can no longer sync at all.
 */
export async function preserveCloud(rows: BackupData['data']): Promise<void> {
  try {
    await saveRecoverySnapshot('keep-local', 'cloud', BackupService.toBackupFile(rows));
  } catch (error) {
    Logger.warn('Could not file a recovery copy of the cloud snapshot:', error);
  }
}
