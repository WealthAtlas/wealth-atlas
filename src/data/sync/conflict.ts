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
 * only overwrite the exact version it was based on, a pull may only replace a
 * device that has published everything it holds, and anything else is handed to
 * the user as a decision with both copies still intact.
 */

export type SyncDirection = 'push' | 'pull';

/** A divergence that was refused. Held until the user resolves it. */
export interface SyncConflict {
  /** The operation that was refused. */
  direction: SyncDirection;
  /** The remote version this device's data is based on. */
  baseVersion?: number;
  /** The version now in the cloud. */
  remoteVersion: number;
  /** When this device first changed something it has not pushed. */
  pendingSince?: string;
  /**
   * When the cloud copy was last written, as the server reports it.
   *
   * The version number never answered the question the user actually has when
   * choosing between two copies. "Saved 3 hours ago" does. Best effort: it costs
   * a full GET to learn, so it is fetched only on the conflict path, and a
   * failure there leaves it absent rather than blocking the conflict.
   */
  remoteUpdatedAt?: string;
  detectedAt: string;
}

/**
 * A push that landed on top of another device's push.
 *
 * Deliberately *not* stored as a conflict. A conflict is a question with two
 * answers; by the time this is recorded the cloud already holds this device's
 * copy and there is nothing left to choose. It is a report that something was
 * lost, and the only person who can act on it is the user, on the other device,
 * before that device pulls.
 *
 * It therefore does not stop this device syncing: its base is now correct and
 * its next push is legitimate. That is the difference from `SyncConflict`, which
 * `AutoSyncService` treats as a full stop.
 *
 * How it is detected: the API's PUT takes no expected version, so the
 * compare-and-swap in `decidePush` is a read followed by a write with a network
 * round trip in between. Another device can write in that gap; both devices pass
 * the check and both PUTs are accepted. The winner is handed a version *more
 * than one step* on from the one it based on, and that gap is the evidence — it
 * counts exactly the writes that happened in between. Without this the loser's
 * work simply vanished: it had been told its own push succeeded, so it cleared
 * its pending mark and its next pull took the winner's copy over the top with
 * nothing raised.
 *
 * This assumes the backend assigns consecutive versions, which is the contract
 * the client has always relied on. It detects rather than prevents; only a
 * conditional write on the server can prevent it.
 */
export interface SyncOverwrite {
  /** The version this push was based on. */
  baseVersion: number;
  /** The version the server assigned it. More than one step on is the evidence. */
  resultVersion: number;
  detectedAt: string;
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
 * Equality, not "not ahead". The version is minted by the server — every POST
 * and PUT answers with the number it assigned, and no device ever invents one —
 * so a remote version *below* this device's base cannot mean "we are ahead". It
 * means the blob this base refers to is gone: the key was recreated, or the
 * backend was reset. Pushing over that would replace a stranger's data with
 * ours on the strength of a counter that no longer counts the same thing.
 *
 * An unknown `baseVersion` is a conflict rather than a push: a linked device
 * that cannot say what it is based on cannot claim to be current.
 */
export function decidePush(input: { baseVersion?: number; remoteVersion: number }): PushDecision {
  if (input.baseVersion === undefined) return 'conflict';
  return input.remoteVersion === input.baseVersion ? 'push' : 'conflict';
}

/**
 * Whether a pull may replace every local table.
 *
 * Importing is a whole-database wipe, so the question is only ever "is there
 * anything on this device the cloud has not got?". `pendingChangeSince` is that
 * answer: set by the change hooks on the first edit, cleared only by a push or
 * an import that completes. A device that has published everything it holds
 * loses nothing by taking the cloud's copy, and taking it is the whole point —
 * every write publishes under compare-and-swap, so a device that starts up
 * current is a device whose next edit will push cleanly instead of conflicting.
 *
 * This used to refuse on `hasLocalRecords` too, on the grounds that a replace
 * has no per-row reason for what it removes. That belonged to the era when a
 * row-level merge handled the ordinary case and a replace was the exception; as
 * the ordinary path it would open almost every startup with a question about a
 * copy the user has no reason to doubt.
 *
 * A remote version *below* this device's base is not "nothing to do" — see
 * `decidePush`. The counter is the server's, so it can only have gone backwards
 * if the blob was replaced by a different one, and importing it blind would take
 * an unrelated database over this one.
 */
export function decidePull(input: {
  baseVersion?: number;
  remoteVersion: number;
  hasUnpushedChanges: boolean;
}): PullDecision {
  const base = input.baseVersion ?? -1;
  if (input.remoteVersion === base) return 'skip';
  if (input.remoteVersion < base) return 'conflict';
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

/**
 * The last push that overwrote another device, until the user dismisses it.
 *
 * Its own key rather than a field on the conflict record: the two have different
 * lifetimes and different meanings, and only one of them stops syncing.
 */
const OVERWRITE_KEY = 'sync.overwrite';

export function getSyncOverwrite(): SyncOverwrite | undefined {
  const raw = localStorage.getItem(OVERWRITE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SyncOverwrite;
  } catch (error) {
    Logger.warn('Discarding an unreadable sync overwrite record:', error);
    localStorage.removeItem(OVERWRITE_KEY);
    return undefined;
  }
}

export function setSyncOverwrite(overwrite: SyncOverwrite): void {
  localStorage.setItem(OVERWRITE_KEY, JSON.stringify(overwrite));
  notify(getSyncConflict());
}

export function clearSyncOverwrite(): void {
  if (!localStorage.getItem(OVERWRITE_KEY)) return;
  localStorage.removeItem(OVERWRITE_KEY);
  notify(getSyncConflict());
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
