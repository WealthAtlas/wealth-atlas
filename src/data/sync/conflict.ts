import { Logger } from '@/domain/utils/Logger';

/**
 * Sync conflict detection.
 *
 * The remote is one opaque encrypted blob behind a monotonic version counter,
 * and the backend cannot merge because it cannot decrypt. So both directions of
 * sync replace *everything*, and this module is the only place a divergence can
 * be caught — after either operation runs, the losing side is simply gone.
 *
 * What used to happen: `push` PUT the whole snapshot with no precondition at
 * all. A device that had been offline for a day needed one edit to replace the
 * cloud with its stale copy, and the device that had done the work then pulled
 * that copy over itself. Two silent whole-database deletions from one edit.
 *
 * The rule here is that neither side is ever discarded by inference. A push may
 * only overwrite the version it was based on, a pull may only replace local rows
 * that are already in the cloud, and anything else is handed to the user as a
 * decision with both copies still intact.
 */

export type SyncDirection = 'push' | 'pull';

/**
 * What kind of refused sync this is, and therefore whether the user has a
 * decision to make at all.
 *
 * `diverged` is the original: both copies moved, neither can be inferred away,
 * and the user picks one. `downgrade` is not a divergence and has no such
 * choice — the cloud blob was overwritten by a device running an earlier build,
 * and both destructive answers are wrong. Absent on records written before this
 * existed, which are all `diverged`.
 */
export type SyncConflictKind = 'diverged' | 'downgrade';

/** A divergence that was refused. Held until the user resolves it. */
export interface SyncConflict {
  /** Absent on records persisted before the kind existed; read as `diverged`. */
  kind?: SyncConflictKind;
  /** The operation that was refused. */
  direction: SyncDirection;
  /** The remote version this device's data is based on. */
  baseVersion?: number;
  /** The version now in the cloud. */
  remoteVersion: number;
  /** When this device first changed something it has not pushed. */
  pendingSince?: string;
  detectedAt: string;
  /** `downgrade` only: the snapshot schema version the cloud now holds. */
  snapshotVersion?: number;
  /** `downgrade` only: the version this device had already read from this key. */
  expectedSnapshotVersion?: number;
}

/** A conflict record's kind, defaulted for records written before it existed. */
export function conflictKind(conflict: SyncConflict): SyncConflictKind {
  return conflict.kind ?? 'diverged';
}

export type PushDecision = 'push' | 'conflict';
export type PullDecision = 'skip' | 'import' | 'conflict';

/**
 * Whether this device may replace the remote blob.
 *
 * A compare-and-swap the client has to perform itself: the API's PUT takes no
 * expected version, so the check is "the cloud is still on the version we last
 * saw" made immediately before the write. That leaves a race of a few hundred
 * milliseconds against another device pushing at the same instant — which is
 * the difference between two people editing in the same breath and a device
 * being a day behind, and the second is what actually loses data.
 *
 * An unknown `baseVersion` is a conflict rather than a push: a linked device
 * that cannot say what it is based on cannot claim to be current.
 */
export function decidePush(input: { baseVersion?: number; remoteVersion: number }): PushDecision {
  if (input.baseVersion === undefined) return 'conflict';
  return input.remoteVersion > input.baseVersion ? 'conflict' : 'push';
}

/**
 * Whether a pull may replace every local table.
 *
 * Importing is a whole-database wipe, so it is only safe while everything local
 * is already in the cloud. `hasUnpushedChanges` is the guard: an edit made
 * offline, inside the push debounce, or after a push that failed, is a row the
 * remote snapshot has never seen and cannot restore.
 */
export function decidePull(input: {
  baseVersion?: number;
  remoteVersion: number;
  hasUnpushedChanges: boolean;
}): PullDecision {
  const base = input.baseVersion ?? -1;
  if (input.remoteVersion <= base) return 'skip';
  return input.hasUnpushedChanges ? 'conflict' : 'import';
}

/**
 * Raised instead of completing a destructive sync. Named so the UI can offer the
 * two resolutions rather than showing a toast the user can only dismiss.
 */
export class SyncConflictError extends Error {
  constructor(readonly conflict: SyncConflict) {
    super(
      conflict.direction === 'push'
        ? 'The cloud has changes this device has not seen, so pushing would delete them. ' +
            'Resolve the conflict in Settings.'
        : 'This device has changes the cloud has not seen, so pulling would delete them. ' +
            'Resolve the conflict in Settings.'
    );
    this.name = 'SyncConflictError';
  }
}

/**
 * Raised when the cloud blob has been replaced by an older build of the app.
 *
 * Not a conflict to resolve, which is why it is its own error: neither answer
 * the conflict card offers is right. Taking the cloud copy absorbs a snapshot
 * that has already lost everything the older build does not know about — every
 * tombstone, so deleted rows come back, and the lineage, so every device drops
 * from merging to replacing. Overwriting it from here leaves the older device
 * unable to read what it finds and pushing the same downgrade again on its next
 * edit. The only fix is on the other device, so the app says so and stops.
 */
export class SyncDowngradeError extends Error {
  constructor(readonly conflict: SyncConflict) {
    super(
      'The cloud copy was last written by an older version of Wealth Atlas ' +
        `(snapshot v${conflict.snapshotVersion} where this device has already read ` +
        `v${conflict.expectedSnapshotVersion}). Sync is paused until that device is updated. ` +
        'Nothing on this device has been changed or deleted.'
    );
    this.name = 'SyncDowngradeError';
  }
}

/**
 * Raised when the recovery copy could not be written. The import is abandoned
 * rather than run without a net — the point of the net is that a wipe is never
 * unrecoverable.
 */
export class SyncSafetyError extends Error {
  constructor(cause: unknown) {
    super(
      'Could not save a recovery copy of this device, so nothing was replaced. ' +
        'Export a backup from Settings, then try again. ' +
        `(${cause instanceof Error ? cause.message : String(cause)})`
    );
    this.name = 'SyncSafetyError';
  }
}

/**
 * Persisted, not just held in memory: a conflict outlives the tab that found it,
 * and a reload must not look like a resolution.
 */
const CONFLICT_KEY = 'sync.conflict';

type Listener = (conflict: SyncConflict | undefined) => void;
const listeners = new Set<Listener>();

export function getSyncConflict(): SyncConflict | undefined {
  const raw = localStorage.getItem(CONFLICT_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SyncConflict;
  } catch (error) {
    // Unreadable is treated as absent, but the key is dropped: leaving it would
    // make every subsequent read fail the same way.
    Logger.warn('Discarding an unreadable sync conflict record:', error);
    localStorage.removeItem(CONFLICT_KEY);
    return undefined;
  }
}

export function setSyncConflict(conflict: SyncConflict): void {
  localStorage.setItem(CONFLICT_KEY, JSON.stringify(conflict));
  notify(conflict);
}

export function clearSyncConflict(): void {
  if (!localStorage.getItem(CONFLICT_KEY)) return;
  localStorage.removeItem(CONFLICT_KEY);
  notify(undefined);
}

/** Returns its own unsubscribe, so a React effect can return it directly. */
export function onSyncConflictChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(conflict: SyncConflict | undefined): void {
  for (const listener of [...listeners]) {
    try {
      listener(conflict);
    } catch (error) {
      Logger.error('A listener failed to handle a sync conflict change:', error);
    }
  }
}
