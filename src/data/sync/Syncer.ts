import type { IAsset } from '@/domain/entities/assets/Asset';
import type { IInvestment } from '@/domain/entities/assets/Investment';
import type { ISIP } from '@/domain/entities/assets/SIP';
import type { IExpense } from '@/domain/entities/expenses/Expense';
import type { IAllocation } from '@/domain/entities/goals/Allocation';
import type { IGoal } from '@/domain/entities/goals/Goal';
import type { IEMI } from '@/domain/entities/loans/EMI';
import type { ILoan } from '@/domain/entities/loans/Loan';
import type { IPayment } from '@/domain/entities/loans/Payment';
import type { ICurrencyRate } from '@/domain/entities/shared/CurrencyRate';
import type { ISettings } from '@/domain/entities/shared/Settings';
import { Logger } from '@/domain/utils/Logger';
import { db } from '../database';
import { IDecisionEntry } from '@/domain/entities/journal/DecisionEntry';
import { rehydrateSnapshotDates } from '../migrations/rehydrateDates';
import { upgradeSnapshotDataToV4 } from '../migrations/v4';
import { upgradeSnapshotDataToV5 } from '../migrations/v5';
import { upgradeSnapshotDataToV6 } from '../migrations/v6';
import { upgradeSnapshotDataToV7 } from '../migrations/v7';
import { upgradeSnapshotDataToV8 } from '../migrations/v8';
import { upgradeSnapshotDataToV9 } from '../migrations/v9';
import { upgradeSnapshotDataToV10 } from '../migrations/v10';
import { upgradeSnapshotDataToV11 } from '../migrations/v11';
import { upgradeSnapshotDataToV12 } from '../migrations/v12';
import { IMemory } from '@/domain/entities/memory/Memory';
import type { IDeletion } from './merge/SyncMeta';
import { hydrateAiProviderSettings } from '../llm/state';
import { emitDatabaseReplaced } from '../databaseEvents';
import { BackupData, BackupService } from '@/domain/services/BackupService';
import { buildSyncApiUrl } from './config';
import {
  clearSyncConflict,
  decidePull,
  decidePush,
  getSyncConflict,
  setSyncConflict,
  SyncConflict,
  SyncConflictError,
  SyncDirection,
  SyncDowngradeError,
  MAX_LISTED_IMPACTS,
} from './conflict';
import { CryptoMeta, decryptJson, encryptJson } from './crypto';
import { applyMerge, type MergeReport } from './merge/ApplyMerge';
import type { MergeableRow } from './merge/MergeRows';
import { SYNCED_TABLES } from './merge/SyncedTables';
import { newUid } from './merge/SyncMeta';
import { preserveCloud, preserveDevice } from './recovery';
import {
  clearHighestSnapshotVersion,
  clearPendingChange,
  getAutoSyncEnabled,
  getHighestSnapshotVersion,
  getKeyId,
  getLastRemoteVersion,
  getLastSyncAt,
  getMergeLineage,
  getPassphrase,
  getPendingChangeSince,
  recordSnapshotVersion,
  setAutoSyncEnabled,
  setKeyId,
  setLastRemoteVersion,
  setLastSyncAt,
  setMergeLineage,
  setPassphrase,
} from './state';
import { RemoteDataResponse, Snapshot, SyncStatus } from './types';

/** What the cloud holds, read without touching either side. */
export interface RemoteInspection {
  version: number;
  schemaVersion: number;
  /** Whether this device could merge it, or would have to replace instead. */
  sameLineage: boolean;
  updatedAt?: string;
  /** Row count per table, which is what "is my data still there" comes down to. */
  counts: Record<string, number>;
}

/** Saves a string to a file, so a recovery path needs no Dexie write at all. */
function downloadJson(json: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export class SyncApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'SyncApiError';
  }
}

// Simple fetch wrapper with configurable API base URL
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildSyncApiUrl(path);
  // Content-Type only goes on requests that carry a body. On a GET it makes an
  // otherwise "simple" request preflighted, which doubles the calls billed
  // against the API for every poll.
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new SyncApiError(res.status, `API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Backends predating the /version route answer 403 ("Missing Authentication
 * Token" — API Gateway's response to an unmatched path). Remembered per session
 * so we probe once rather than on every poll.
 */
let versionEndpointSupported = true;

/**
 * Asks only for the version, which is all a poll needs. Returns undefined when
 * the answer isn't trustworthy, which means "check the slow way" — never
 * "nothing changed", or a real update would be skipped.
 */
async function fetchRemoteVersion(keyId: string): Promise<number | undefined> {
  if (!versionEndpointSupported) return undefined;
  try {
    const resp = await api<{ version: number }>(`/data/${encodeURIComponent(keyId)}/version`);
    return resp.version;
  } catch (error) {
    if (error instanceof SyncApiError && error.status === 403) {
      versionEndpointSupported = false;
      Logger.info('Sync backend has no /version endpoint; falling back to full pulls');
    }
    return undefined;
  }
}

/**
 * Sync snapshot version. This is its own counter and does NOT track the Dexie
 * version — v8 snapshots predate this comment. Bump it whenever the shape of a
 * persisted row changes and add an upgrade step to `upgradeSnapshot` below.
 *
 * v9: investments.price -> totalAmount (sells positive), expense currency
 *     stored as ISO code rather than symbol.
 * v10: adds the `settings` singleton (base currency) and `currencyRates`. New
 *     tables only, so an older snapshot just needs the settings seed.
 * v11: settings.currencies — the configurable currency list.
 * v12: settings.ai — the AI provider configuration, which used to be
 *     device-local. An older snapshot just gets an empty block.
 * v13: settings.targetAllocation — the intended share per asset category. An
 *     older snapshot gets an empty allocation, meaning "no policy set".
 * v14: settings.news — the news provider key. An older snapshot gets an empty
 *     block, meaning "no news configured".
 * v15: the `decisions` table — the decision journal. An older snapshot has no
 *     such key at all, and `bulkPut(undefined)` is not `bulkPut([])`.
 * v16: the `memories` table — what the assistant remembers about the user — plus
 *     settings.memory, the switch that governs it. An older snapshot has no such
 *     key, and gains an empty memory with the feature on.
 * v17: row-level merge. Every row carries `uid` and `updatedAt`, the `deletions`
 *     table carries tombstones, and the snapshot carries a `lineage`. An older
 *     snapshot is stamped on the way in — with uids minted *here*, which is
 *     exactly why it has no lineage and cannot be merged against until some
 *     device has published one.
 */
const SNAPSHOT_VERSION = 17;
const OLDEST_SUPPORTED_SNAPSHOT_VERSION = 8;

function getSchemaVersion(): number {
  return SNAPSHOT_VERSION;
}

/**
 * Brings an older snapshot up to SNAPSHOT_VERSION in place. Older builds wrote
 * v8; rejecting those outright would make a pull silently unusable, so migrate
 * instead.
 */
function upgradeSnapshot(snapshot: Snapshot): Snapshot {
  if (snapshot.schemaVersion === SNAPSHOT_VERSION) return snapshot;

  if (snapshot.schemaVersion < OLDEST_SUPPORTED_SNAPSHOT_VERSION) {
    throw new Error(
      `Remote snapshot is too old to migrate (remote=${snapshot.schemaVersion}, ` +
        `oldest supported=${OLDEST_SUPPORTED_SNAPSHOT_VERSION}).`
    );
  }

  if (snapshot.schemaVersion > SNAPSHOT_VERSION) {
    throw new Error(
      `Remote snapshot is newer than this app (remote=${snapshot.schemaVersion}, ` +
        `local=${SNAPSHOT_VERSION}). Update this device before syncing.`
    );
  }

  const data = snapshot.data as unknown as Record<string, Record<string, unknown>[]>;
  // Each step is gated on the version that introduced it: the v4 transforms are
  // idempotent, but re-running them on a v9 snapshot would be needless work and
  // makes the upgrade path harder to read as more steps land.
  if (snapshot.schemaVersion < 9) {
    upgradeSnapshotDataToV4(data);
  }
  if (snapshot.schemaVersion < 10) {
    upgradeSnapshotDataToV5(data);
  }
  if (snapshot.schemaVersion < 11) {
    upgradeSnapshotDataToV6(data);
  }
  if (snapshot.schemaVersion < 12) {
    upgradeSnapshotDataToV7(data);
  }
  if (snapshot.schemaVersion < 13) {
    upgradeSnapshotDataToV8(data);
  }
  if (snapshot.schemaVersion < 14) {
    upgradeSnapshotDataToV9(data);
  }
  if (snapshot.schemaVersion < 15) {
    upgradeSnapshotDataToV10(data);
  }
  if (snapshot.schemaVersion < 16) {
    upgradeSnapshotDataToV11(data);
  }
  if (snapshot.schemaVersion < 17) {
    upgradeSnapshotDataToV12(data);
  }
  Logger.info(`Upgraded sync snapshot from v${snapshot.schemaVersion} to v${SNAPSHOT_VERSION}`);
  return { ...snapshot, schemaVersion: SNAPSHOT_VERSION };
}

/**
 * Snapshots travel as JSON, so every Date column arrives as a string. Convert
 * them back before writing or the store ends up with mixed types.
 */
function rehydrateSnapshot(snapshot: Snapshot): void {
  rehydrateSnapshotDates(snapshot.data as unknown as Record<string, Record<string, unknown>[]>);
}

/**
 * The uid lineage this device's rows belong to, minting one if it has none.
 *
 * A push declares this device's rows canonical for the version it writes, so the
 * snapshot has to name the uid space they are in. Publishing `undefined`
 * instead — which is what a device linked before merging existed did, because
 * the lineage is a new key in local storage and nothing backfills it — unsets
 * the lineage in the cloud, and `mergeAllowed` then refuses to merge *any*
 * snapshot. Every sync degrades to a whole-database replace, and a replace only
 * keeps what the cloud already holds.
 *
 * Worse, two such devices never escape it: each import mints a lineage locally
 * that the cloud is never told about, so the next snapshot mismatches again.
 * They replace each other in turn, or deadlock on a conflict apiece, for ever.
 *
 * Minting here cannot fuse two uid spaces, which is the thing the lineage exists
 * to prevent: a device that has one keeps it, and a device that has none has
 * never adopted anyone else's rows. Every other device sees a lineage it has not
 * adopted, replaces once, and merges from then on.
 */
function requireMergeLineage(): string {
  const existing = getMergeLineage();
  if (existing) return existing;
  const minted = newUid();
  setMergeLineage(minted);
  Logger.info('This device had no merge lineage; minting one for the snapshot it is publishing');
  return minted;
}

async function exportSnapshot(): Promise<Snapshot> {
  const [
    assets,
    investments,
    sips,
    expenses,
    loans,
    emis,
    payments,
    goals,
    allocations,
    settings,
    currencyRates,
    decisions,
    memories,
    deletions,
  ] = await Promise.all([
    db.assets.toArray(),
    db.investments.toArray(),
    db.sips.toArray(),
    db.expenses.toArray(),
    db.loans.toArray(),
    db.emis.toArray(),
    db.payments.toArray(),
    db.goals.toArray(),
    db.allocations.toArray(),
    db.settings.toArray(),
    db.currencyRates.toArray(),
    db.decisions.toArray(),
    db.memories.toArray(),
    db.deletions.toArray(),
  ]);
  return {
    schemaVersion: getSchemaVersion(),
    // Carried forward where there is one, minted where there is not: a push
    // publishing a merged result must stay in the lineage it merged against, and
    // a push that names no lineage at all sends every other device back to
    // replacing for ever.
    lineage: requireMergeLineage(),
    data: {
      assets,
      investments,
      sips,
      expenses,
      loans,
      emis,
      payments,
      goals,
      allocations,
      settings,
      currencyRates,
      decisions,
      memories,
      deletions,
    },
  };
}

/**
 * Whether this device holds records of its own.
 *
 * `settings` and `currencyRates` are deliberately not counted: a migration
 * creates them on first run, so counting them would make every device look
 * occupied and the check would never say no.
 */
async function hasLocalData(): Promise<boolean> {
  const counts = await Promise.all([
    db.assets.count(),
    db.investments.count(),
    db.sips.count(),
    db.expenses.count(),
    db.loans.count(),
    db.goals.count(),
    db.decisions.count(),
    db.memories.count(),
  ]);
  return counts.some(count => count > 0);
}

/**
 * Reads the remote version, whatever the backend supports.
 *
 * A push must know what it is overwriting, and `fetchRemoteVersion` answers
 * `undefined` for "could not tell" — which for a poll means "check the slow way"
 * and for a push must never mean "go ahead". Downloading the blob to read one
 * number beside it is the price of not overwriting blindly, and it is only paid
 * on backends predating the /version route.
 */
async function requireRemoteVersion(keyId: string): Promise<number> {
  const probed = await fetchRemoteVersion(keyId);
  if (probed !== undefined) return probed;
  const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
  return resp.version;
}

/**
 * Runs remote operations one at a time.
 *
 * Pull and push were free to interleave, and did: the periodic poll fires on a
 * timer, on `visibilitychange` and on `online`, any of which could land inside
 * the push debounce. A pull would clear every table and the push already in
 * flight would then upload what the pull had just written — or worse, upload the
 * pre-pull export over the newer remote. Compare-and-swap cannot help there,
 * because both halves are this same device. Serialising is what settles it.
 */
let sequence: Promise<unknown> = Promise.resolve();

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = sequence.then(() => operation());
  // The chain itself must never carry a rejection forward, or one failed sync
  // would fail every later one.
  sequence = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function raiseConflict(
  direction: SyncDirection,
  baseVersion: number | undefined,
  remoteVersion: number
): never {
  const conflict: SyncConflict = {
    direction,
    baseVersion,
    remoteVersion,
    pendingSince: getPendingChangeSince(),
    detectedAt: new Date().toISOString(),
  };
  setSyncConflict(conflict);
  Logger.warn(
    `Sync ${direction} refused: local base v${baseVersion ?? '?'} against remote v${remoteVersion}`
  );
  throw new SyncConflictError(conflict);
}

/**
 * Refuses a snapshot written by an earlier build of the app.
 *
 * A snapshot older than this app is normal and is migrated forward: that is
 * every cloud nobody has pushed to since an upgrade. A snapshot older than one
 * this device has *already read from this key* is a different thing entirely —
 * some device overwrote the blob with a shape that predates it, and everything
 * that shape has no field for is already gone from the cloud: the tombstones, so
 * deleted rows come back, and the lineage, so every device that reads it drops
 * from merging to replacing itself.
 *
 * It has to be caught here because it cannot be caught there. An older build is
 * already installed and will never run a check added now; what it does do is
 * refuse to *read* a snapshot newer than itself and refuse to push over a
 * version it is behind, so a device left alone locks itself out. The hole is a
 * user answering that lockout with "keep this device", which forces the older
 * snapshot over the newer one — and this is the far side of it.
 */
function guardAgainstDowngrade(snapshot: Snapshot, remoteVersion: number): void {
  const highest = getHighestSnapshotVersion();
  if (highest === undefined || snapshot.schemaVersion >= highest) return;

  const conflict: SyncConflict = {
    kind: 'downgrade',
    // The refused operation is the one that would have taken it in.
    direction: 'pull',
    baseVersion: getLastRemoteVersion(),
    remoteVersion,
    snapshotVersion: snapshot.schemaVersion,
    expectedSnapshotVersion: highest,
    pendingSince: getPendingChangeSince(),
    detectedAt: new Date().toISOString(),
  };
  setSyncConflict(conflict);
  Logger.warn(
    `Sync paused: the cloud holds snapshot v${snapshot.schemaVersion}, ` +
      `older than the v${highest} this device has already read`
  );
  throw new SyncDowngradeError(conflict);
}

/**
 * Refuses a merge that would change records already on this device, until the
 * user has said so.
 *
 * The line is drawn at cost, not at divergence — and that distinction is the
 * whole design. Two devices holding different records is the *ordinary* state of
 * one person with a phone and a laptop, and a merge that only adds rows takes
 * nothing away from anybody: asking there would be a prompt on almost every
 * session, which trains people to click through it and spends the one moment of
 * attention that actually matters.
 *
 * A merge that *replaces* or *removes* a local row is a different thing. Because
 * merging is row-level, a replacement carries the whole incoming row, so a
 * device that was read before it was refreshed writes its stale fields forward
 * under a fresh timestamp and the newer values are gone. That is worth stopping
 * for, and it is rare enough to be worth stopping for.
 */
function raiseMergeConfirmation(
  preview: MergeReport,
  baseVersion: number | undefined,
  remoteVersion: number
): never {
  const impacts = [
    ...preview.overwrites.map(impact => ({ ...impact, removed: false })),
    ...preview.removals.map(impact => ({ ...impact, removed: true })),
  ];
  const conflict: SyncConflict = {
    kind: 'overwrite',
    direction: 'pull',
    baseVersion,
    remoteVersion,
    overwriteCount: preview.overwrites.length,
    removalCount: preview.removals.length,
    impacts: impacts.slice(0, MAX_LISTED_IMPACTS),
    pendingSince: getPendingChangeSince(),
    detectedAt: new Date().toISOString(),
  };
  setSyncConflict(conflict);
  Logger.warn(
    `Merge held for confirmation: ${preview.overwrites.length} would be replaced, ` +
      `${preview.removals.length} removed`
  );
  throw new SyncConflictError(conflict);
}

async function importSnapshot(incoming: Snapshot): Promise<void> {
  const snapshot = upgradeSnapshot(incoming);
  rehydrateSnapshot(snapshot);

  // Suppressed, because `bulkPut` fires the `creating` hooks: without this every
  // pull armed a push of what it had just imported, and left the device looking
  // as though it had unpushed edits of its own.
  const { AutoSyncService } = await import('./AutoSyncService');
  await AutoSyncService.withoutScheduling(() =>
    db.transaction(
      'rw',
      [
        db.assets,
        db.investments,
        db.sips,
        db.expenses,
        db.loans,
        db.emis,
        db.payments,
        db.goals,
        db.allocations,
        db.settings,
        db.currencyRates,
        db.decisions,
        db.memories,
        db.deletions,
      ],
      async () => {
        await Promise.all([
          db.deletions.clear(),
          db.memories.clear(),
          db.decisions.clear(),
          db.currencyRates.clear(),
          db.settings.clear(),
          db.allocations.clear(),
          db.goals.clear(),
          db.payments.clear(),
          db.emis.clear(),
          db.loans.clear(),
          db.expenses.clear(),
          db.sips.clear(),
          db.investments.clear(),
          db.assets.clear(),
        ]);
        const d = snapshot.data as {
          assets?: IAsset[];
          investments?: IInvestment[];
          sips?: ISIP[];
          expenses?: IExpense[];
          loans?: ILoan[];
          emis?: IEMI[];
          payments?: IPayment[];
          goals?: IGoal[];
          allocations?: IAllocation[];
          settings?: ISettings[];
          currencyRates?: ICurrencyRate[];
          decisions?: IDecisionEntry[];
          memories?: IMemory[];
          deletions?: IDeletion[];
        };
        // Order respects dependencies
        await db.assets.bulkPut(d.assets || []);
        await db.investments.bulkPut(d.investments || []);
        await db.sips.bulkPut(d.sips || []);
        await db.expenses.bulkPut(d.expenses || []);
        await db.loans.bulkPut(d.loans || []);
        await db.emis.bulkPut(d.emis || []);
        await db.payments.bulkPut(d.payments || []);
        await db.goals.bulkPut(d.goals || []);
        await db.allocations.bulkPut(d.allocations || []);
        await db.settings.bulkPut(d.settings || []);
        await db.currencyRates.bulkPut(d.currencyRates || []);
        await db.decisions.bulkPut(d.decisions || []);
        await db.memories.bulkPut(d.memories || []);
        await db.deletions.bulkPut(d.deletions || []);
      }
    )
  );

  // Every local row is now the remote's, so there is nothing unpushed and
  // nothing left to disagree about.
  clearPendingChange();
  clearSyncConflict();
  // What the cloud actually held, not what it was migrated to: the floor a later
  // read has to clear is the shape some device is really writing.
  recordSnapshotVersion(incoming.schemaVersion);

  // This device now holds the snapshot's rows, so it is in the snapshot's uid
  // space and may merge against it. A snapshot from before merging existed has
  // no lineage to adopt: its uids were minted here a moment ago by
  // `upgradeSnapshot`, so a second device doing the same would mint different
  // ones. One is recorded anyway, and published by this device's next push —
  // whoever publishes first defines the lineage and the others replace once
  // more before they can merge.
  setMergeLineage(snapshot.lineage ?? newUid());

  // The pulled row carries the AI provider configuration, and it is read from a
  // synchronous cache — refill it or this device keeps talking to the provider
  // the snapshot just replaced.
  await hydrateAiProviderSettings();

  // Views hold what they read on mount, so without this the pull is invisible
  // until the user navigates away and back.
  emitDatabaseReplaced();
}

/**
 * Presents a snapshot's rows as a backup file's rows, for filing a copy of
 * whatever is about to be discarded.
 */
function backupRowsFromSnapshot(snapshot: Snapshot): BackupData['data'] {
  let data = snapshot.data;
  try {
    data = upgradeSnapshot(snapshot).data;
  } catch (error) {
    // A snapshot written by a newer build cannot be brought to this shape. It is
    // filed unmodified anyway: a rescue file this app cannot restore still holds
    // the rows, and discarding it is the one outcome that leaves nothing.
    Logger.warn('Filing the cloud snapshot without upgrading it:', error);
  }
  return data as unknown as BackupData['data'];
}

async function pushSnapshot(
  passphrase: string | undefined,
  options: { force: boolean; recordConflict?: boolean }
): Promise<{ version: number }> {
  const keyId = getKeyId();
  if (!keyId) throw new Error('Sync not set up');

  const actualPassphrase = passphrase || getPassphrase();
  if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

  const baseVersion = getLastRemoteVersion();

  // The compare-and-swap the API cannot do for us: its PUT takes no expected
  // version, so the check is made here, as late as possible before the write.
  // Forced only by a conflict the user has resolved in this device's favour.
  if (!options.force) {
    const remoteVersion = await requireRemoteVersion(keyId);
    if (decidePush({ baseVersion, remoteVersion }) === 'conflict') {
      if (options.recordConflict === false) {
        throw new Error(
          'The cloud changed while this device was syncing. Nothing was written; ' +
            'the next sync will merge it.'
        );
      }
      raiseConflict('push', baseVersion, remoteVersion);
    }
  }

  const snapshot = await exportSnapshot();
  const { payload, meta } = await encryptJson(snapshot, actualPassphrase, snapshot.schemaVersion);
  const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`, {
    method: 'PUT',
    body: JSON.stringify({ payload, meta }),
  });
  setLastRemoteVersion(resp.version);
  setLastSyncAt(new Date().toISOString());
  // The cloud now holds this build's shape, so nothing older may replace it.
  recordSnapshotVersion(snapshot.schemaVersion);
  // Only a completed push clears this. A failed one leaves the device marked as
  // holding work the cloud has not seen, which is what stops the next pull.
  clearPendingChange();
  clearSyncConflict();

  // Store passphrase if auto-sync is enabled and passphrase was provided manually
  if (getAutoSyncEnabled() && passphrase && !getPassphrase()) {
    setPassphrase(passphrase);
  }

  return { version: resp.version };
}

/**
 * Replaces every local table with a snapshot's rows.
 *
 * The pre-merge behaviour, still needed for the cases a merge cannot cover: a
 * snapshot from another uid lineage, and a conflict the user has settled in the
 * cloud's favour. It is refused outright while this device holds work the cloud
 * has never seen, because the import is a whole-database wipe.
 */
async function replaceFromSnapshot(
  snapshot: Snapshot,
  version: number,
  baseVersion: number | undefined,
  options: { force: boolean; reason: 'pull' | 'take-remote' | 'link' }
): Promise<{ version: number | null }> {
  // Counted before deciding, not after: whether this device holds records is the
  // decision, and it is also what says whether there is anything to file.
  const holdsRecords = await hasLocalData();

  if (!options.force) {
    const decision = decidePull({
      baseVersion,
      remoteVersion: version,
      hasUnpushedChanges: Boolean(getPendingChangeSince()),
      hasLocalRecords: holdsRecords,
    });
    if (decision === 'skip') return { version: null };
    if (decision === 'conflict') raiseConflict('pull', baseVersion, version);
  }

  // The copy that is losing, kept before the wipe. Throws rather than proceeding
  // if it cannot be written — a wipe with no net is the thing this exists to
  // prevent. Skipped only when there is provably nothing to keep, so a fresh
  // device's first pull cannot fill the store with empty files.
  if (holdsRecords) await preserveDevice(options.reason);

  await importSnapshot(snapshot);
  setLastRemoteVersion(version);
  setLastSyncAt(new Date().toISOString());
  return { version };
}

async function pullSnapshot(
  passphrase: string | undefined,
  options: { force: boolean }
): Promise<{ version: number | null }> {
  const keyId = getKeyId();
  if (!keyId) throw new Error('Sync not set up');

  const actualPassphrase = passphrase || getPassphrase();
  if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

  const baseVersion = getLastRemoteVersion();
  const last = baseVersion ?? 0;

  // The overwhelmingly common outcome of a poll is "nothing changed", so settle
  // that against a few bytes instead of downloading the whole snapshot.
  const remoteVersion = await fetchRemoteVersion(keyId);
  if (remoteVersion !== undefined && remoteVersion <= last) return { version: null };

  const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
  // Re-checked against the payload's own version: the pointer can sit one
  // ahead of the blob after an interrupted push.
  if (resp.version <= last) return { version: null };

  // Decrypted before anything is filed or cleared: a wrong passphrase must cost
  // nothing but the request.
  const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, actualPassphrase);
  // Not under `force`: taking the cloud copy on purpose is the user's call, and
  // the downgrade card does not offer it in the first place.
  if (!options.force) guardAgainstDowngrade(snapshot, resp.version);

  const result = await replaceFromSnapshot(snapshot, resp.version, baseVersion, {
    force: options.force,
    reason: options.force ? 'take-remote' : 'pull',
  });

  // Store passphrase if auto-sync is enabled and passphrase was provided manually
  if (getAutoSyncEnabled() && passphrase && !getPassphrase()) {
    setPassphrase(passphrase);
  }

  return result;
}

/**
 * Whether an incoming snapshot's rows are in the same uid space as this
 * device's.
 *
 * The one precondition for merging, and it cannot be inferred from timestamps or
 * versions: uids are minted per device, so a snapshot from a lineage this device
 * has not adopted names the same asset by a different uid. Merging that would
 * insert every one of the other device's rows alongside this device's own — a
 * duplicated database, which is harder to recover from than a replaced one.
 */
function mergeAllowed(snapshot: Snapshot): boolean {
  const lineage = getMergeLineage();
  return Boolean(lineage) && snapshot.lineage === lineage;
}

/**
 * One pass of: take what the cloud has, keep both sides where they do not
 * overlap, take the later change where they do, then publish the result.
 */
async function reconcileOnce(
  passphrase: string | undefined,
  options: { approveMerge?: boolean } = {}
): Promise<{ version: number | null }> {
  const keyId = getKeyId();
  if (!keyId) throw new Error('Sync not set up');

  const actualPassphrase = passphrase || getPassphrase();
  if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

  const baseVersion = getLastRemoteVersion();
  const last = baseVersion ?? 0;
  const pending = Boolean(getPendingChangeSince());

  // Nothing has changed on either side: settle it against a few bytes.
  const probed = await fetchRemoteVersion(keyId);
  if (probed !== undefined && probed <= last && !pending) return { version: null };

  const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);

  if (resp.version <= last) {
    // The cloud is where we left it, so there is nothing to merge — only our own
    // work to publish, under the usual compare-and-swap.
    if (!pending) return { version: null };
    return pushSnapshot(actualPassphrase, { force: false });
  }

  const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, actualPassphrase);
  guardAgainstDowngrade(snapshot, resp.version);

  if (!mergeAllowed(snapshot)) {
    // Not the same uid space. Fall back to replacing, which is refused outright
    // if this device holds work the cloud has never seen — the user picks a copy,
    // and that choice is what establishes a shared lineage to merge against from
    // then on.
    Logger.info('Snapshot is from another lineage; replacing rather than merging');
    return replaceFromSnapshot(snapshot, resp.version, baseVersion, {
      force: false,
      reason: 'pull',
    });
  }

  const upgraded = upgradeSnapshot(snapshot);
  rehydrateSnapshot(upgraded);
  const incoming = upgraded.data as unknown as Record<string, MergeableRow[]>;

  // Computed by the real merge with its writes withheld, so what the user is
  // shown is what would actually happen rather than a second guess at it.
  if (!options.approveMerge) {
    const preview = await applyMerge(incoming, Date.now(), { dryRun: true });
    // Overwrites ask; removals do not, and the asymmetry is the point. A removal
    // carries a tombstone naming the delete that caused it — someone chose that,
    // on purpose, on another device, and re-asking here would nag every other
    // device about every deletion the user has already made. An overwrite is the
    // opposite: nobody chose to discard the field values it discards. They are
    // still *listed* when the question is asked for another reason, because they
    // are part of what the user is agreeing to.
    if (preview.overwrites.length > 0) {
      raiseMergeConfirmation(preview, baseVersion, resp.version);
    }
  }

  const report = await applyMerge(incoming);

  recordSnapshotVersion(snapshot.schemaVersion);
  setLastRemoteVersion(resp.version);
  setLastSyncAt(new Date().toISOString());
  await hydrateAiProviderSettings();
  emitDatabaseReplaced();

  // Store passphrase if auto-sync is enabled and passphrase was provided manually
  if (getAutoSyncEnabled() && passphrase && !getPassphrase()) {
    setPassphrase(passphrase);
  }

  if (!report.localAhead) {
    // The cloud already holds everything this device does.
    clearPendingChange();
    clearSyncConflict();
    return { version: resp.version };
  }

  // Publishing the merged result. `recordConflict: false` because a device that
  // pushed while we were merging has not created a question: its changes are the
  // same mergeable divergence again, and the next reconcile settles them. Raising
  // a conflict here would put a banner in front of the user asking them to choose
  // a copy, for something that resolves itself.
  return pushSnapshot(actualPassphrase, { force: false, recordConflict: false });
}

export class SyncService {
  static getStatus(): SyncStatus {
    return {
      enabled: Boolean(getKeyId()),
      keyId: getKeyId(),
      lastRemoteVersion: getLastRemoteVersion(),
      lastSyncAt: getLastSyncAt(),
      autoSyncEnabled: getAutoSyncEnabled(),
      hasStoredPassphrase: Boolean(getPassphrase()),
      pendingChangeSince: getPendingChangeSince(),
      conflict: getSyncConflict(),
    };
  }

  static async setupSync(
    passphrase: string,
    enableAutoSync = false
  ): Promise<{ keyId: string; version: number }> {
    return runExclusive(async () => {
      // A new lineage: this device's uids are the ones every other device will
      // adopt, and it has to be minted before the snapshot is built so the
      // snapshot carries it.
      setMergeLineage(newUid());
      const snapshot = await exportSnapshot();
      const { payload, meta } = await encryptJson(snapshot, passphrase, snapshot.schemaVersion);
      const resp = await api<RemoteDataResponse<CryptoMeta>>('/data', {
        method: 'POST',
        body: JSON.stringify({ payload, meta }),
      });
      setKeyId(resp.keyId);
      setLastRemoteVersion(resp.version);
      setLastSyncAt(new Date().toISOString());
      recordSnapshotVersion(snapshot.schemaVersion);
      // The cloud now holds exactly this device, whatever it was marked as
      // owing before it was linked.
      clearPendingChange();
      clearSyncConflict();

      if (enableAutoSync) {
        setPassphrase(passphrase);
        setAutoSyncEnabled(true);
      }

      return { keyId: resp.keyId, version: resp.version };
    });
  }

  /**
   * Adopts an existing sync key, replacing this device with the cloud's copy.
   *
   * Unconditionally destructive by design — that is what linking means — so the
   * device is filed first when it holds records of its own. `SettingsPage` says
   * so before calling this; the recovery copy is what makes the sentence true.
   */
  static async linkSync(keyId: string, passphrase: string, enableAutoSync = false): Promise<void> {
    return runExclusive(async () => {
      const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
      const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, passphrase);
      // A different key has its own history. Carried over, a floor learned from
      // the previous one would refuse this key's first read as a downgrade.
      clearHighestSnapshotVersion();
      // Forced: adopting someone else's key is a deliberate replacement, and the
      // recovery copy is what makes that recoverable.
      await replaceFromSnapshot(snapshot, resp.version, undefined, {
        force: true,
        reason: 'link',
      });
      setKeyId(resp.keyId);

      if (enableAutoSync) {
        setPassphrase(passphrase);
        setAutoSyncEnabled(true);
      }
    });
  }

  /**
   * Brings this device and the cloud into step, merging where it can.
   *
   * The operation everything automatic now uses. Where the two sides changed
   * different rows both survive; where they changed the same row the later change
   * wins; and only what a merge genuinely cannot settle — a snapshot from another
   * uid lineage — still comes back to the user as a question.
   */
  static async reconcile(passphrase?: string): Promise<{ version: number | null }> {
    return runExclusive(() => reconcileOnce(passphrase));
  }

  /**
   * Runs the merge the user has just approved.
   *
   * Deliberately re-reads and re-merges rather than applying a stored plan: the
   * cloud may have moved again while the dialog was open, and applying a plan
   * computed against a snapshot that is no longer there is how a confirmation
   * turns into the very overwrite it was asked about. If the new snapshot would
   * cost something different, the question is simply asked again.
   */
  static async confirmMerge(passphrase?: string): Promise<{ version: number | null }> {
    return runExclusive(() => reconcileOnce(passphrase, { approveMerge: true }));
  }

  /**
   * Replaces this device with the cloud's copy, refusing while this device holds
   * anything unpushed. Kept as an explicit override; `reconcile` is what runs by
   * itself.
   */
  static async pull(passphrase?: string): Promise<{ version: number | null }> {
    return runExclusive(() => pullSnapshot(passphrase, { force: false }));
  }

  static async push(passphrase?: string): Promise<{ version: number }> {
    return runExclusive(() => pushSnapshot(passphrase, { force: false }));
  }

  /**
   * What the cloud is holding, without taking any of it.
   *
   * Every other way to see the cloud copy replaces something first: Pull wipes
   * this device, and resolving a conflict wipes one side or the other. So the
   * question a user actually has when records go missing — is my data still up
   * there? — could only be answered by performing the very thing they were
   * afraid of. This reads and decrypts, and writes nothing on either side.
   *
   * The counts are per table because that is what answers it: an assets count of
   * 0 and one of 34 are different situations, and neither is visible from a
   * version number.
   */
  static async inspectRemote(passphrase?: string): Promise<RemoteInspection> {
    return runExclusive(async () => {
      const keyId = getKeyId();
      if (!keyId) throw new Error('Sync not set up');
      const actualPassphrase = passphrase || getPassphrase();
      if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

      const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
      const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, actualPassphrase);
      const data = snapshot.data as unknown as Record<string, unknown[] | undefined>;

      const counts: Record<string, number> = {};
      for (const table of SYNCED_TABLES) counts[table.name] = data[table.name]?.length ?? 0;
      counts.deletions = data.deletions?.length ?? 0;

      return {
        version: resp.version,
        schemaVersion: snapshot.schemaVersion,
        sameLineage: mergeAllowed(snapshot),
        updatedAt: resp.updatedAt,
        counts,
      };
    });
  }

  /**
   * Hands the cloud copy back as a backup file, importing nothing.
   *
   * The same format `recovery.ts` files and Import Data reads, so what comes
   * down can be opened in a text editor and restored deliberately — or simply
   * kept as the off-device copy no sync operation can reach. Recovering should
   * not require betting the device on it.
   */
  static async downloadRemoteCopy(passphrase?: string): Promise<void> {
    return runExclusive(async () => {
      const keyId = getKeyId();
      if (!keyId) throw new Error('Sync not set up');
      const actualPassphrase = passphrase || getPassphrase();
      if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

      const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
      const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, actualPassphrase);
      downloadJson(
        BackupService.toBackupFile(backupRowsFromSnapshot(snapshot)),
        `wealth-atlas-cloud-v${resp.version}.json`
      );
      Logger.info(`Downloaded the cloud copy at version ${resp.version}`);
    });
  }

  /**
   * Settles a refused sync the only way it can be settled without row-level
   * merge metadata: the user says which copy is the one to keep, and the other
   * is filed as a recovery copy rather than dropped.
   */
  static async resolveConflict(
    resolution: 'keep-local' | 'take-remote',
    passphrase?: string
  ): Promise<void> {
    return runExclusive(async () => {
      const conflict = getSyncConflict();
      if (!conflict) return;

      if (resolution === 'take-remote') {
        await pullSnapshot(passphrase, { force: true });
        return;
      }

      const keyId = getKeyId();
      if (!keyId) throw new Error('Sync not set up');
      const actualPassphrase = passphrase || getPassphrase();
      if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

      // The cloud copy is about to be overwritten, and it is the other device's
      // work. Best effort: that device still holds it, and a failure here must
      // not leave this one unable to sync at all.
      try {
        const resp = await api<RemoteDataResponse<CryptoMeta>>(
          `/data/${encodeURIComponent(keyId)}`
        );
        const remote = await decryptJson<Snapshot>(resp.payload, resp.meta, actualPassphrase);
        await preserveCloud(backupRowsFromSnapshot(remote));
      } catch (error) {
        Logger.warn('Could not read the cloud snapshot before overwriting it:', error);
      }

      // A new lineage, because this device's rows are being declared canonical
      // and its uids are not the cloud's. Every other device will see a lineage
      // it has not adopted and replace once, rather than merging two uid spaces
      // into a doubled database.
      setMergeLineage(newUid());
      await pushSnapshot(actualPassphrase, { force: true });
    });
  }

  /** Drops the conflict without syncing, leaving both copies where they are. */
  static dismissConflict(): void {
    clearSyncConflict();
  }

  static async changePassphrase(oldPass: string, newPass: string): Promise<void> {
    return runExclusive(async () => {
      const keyId = getKeyId();
      if (!keyId) throw new Error('Sync not set up');
      const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
      const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, oldPass);
      const { payload, meta } = await encryptJson(snapshot, newPass, snapshot.schemaVersion);

      // Re-encrypting writes the snapshot back, so a device that pushed while we
      // were working would be overwritten by its own older data. Checked as late
      // as possible; the residual window is the request itself.
      const current = await requireRemoteVersion(keyId);
      if (current !== resp.version) {
        throw new Error(
          'Another device changed the cloud data while the passphrase was being changed. ' +
            'Nothing was written — try again.'
        );
      }

      await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`, {
        method: 'PUT',
        body: JSON.stringify({ payload, meta }),
      });
      setLastSyncAt(new Date().toISOString());

      // Update stored passphrase if auto-sync is enabled
      if (getAutoSyncEnabled()) {
        setPassphrase(newPass);
      }
    });
  }

  static async unlink(): Promise<void> {
    setKeyId(undefined);
    setLastRemoteVersion(undefined);
    setLastSyncAt(undefined);
    setPassphrase(undefined);
    setAutoSyncEnabled(false);
    // Nothing to be out of step with any more, and a stale conflict would keep
    // asking the user to resolve against a key this device no longer has.
    clearPendingChange();
    clearSyncConflict();
    // The lineage belonged to that key. Kept, it would authorise merging against
    // whatever the next key happens to hold.
    setMergeLineage(undefined);
    // So did the snapshot version: a different key has its own history, and a
    // floor carried over from this one would refuse the next key's first read.
    clearHighestSnapshotVersion();
  }

  static setAutoSyncEnabled(enabled: boolean): void {
    setAutoSyncEnabled(enabled);
    if (!enabled) {
      setPassphrase(undefined);
      // Import AutoSyncService here to avoid circular dependency
      import('./AutoSyncService').then(({ AutoSyncService }) => {
        AutoSyncService.stopListening();
      });
    } else {
      // Import AutoSyncService here to avoid circular dependency
      import('./AutoSyncService').then(({ AutoSyncService }) => {
        AutoSyncService.startListening();
      });
    }
  }

  static async autoSync(): Promise<{ version: number | null }> {
    const keyId = getKeyId();
    const passphrase = getPassphrase();
    const autoSyncEnabled = getAutoSyncEnabled();

    if (!keyId || !passphrase || !autoSyncEnabled) {
      return { version: null };
    }

    try {
      return await this.reconcile();
    } catch (error) {
      // A conflict is not a failure to retry: it is recorded, the banner is
      // showing it, and the user's answer is the only thing that clears it.
      if (error instanceof SyncConflictError) {
        Logger.warn('Auto-sync stopped: this device and the cloud have both changed');
        return { version: null };
      }
      // Also recorded and also showing in the banner, and equally not something
      // retrying can clear — the other device has to be updated.
      if (error instanceof SyncDowngradeError) {
        Logger.warn('Auto-sync stopped: the cloud was written by an older build');
        return { version: null };
      }
      // Log error but don't throw - auto-sync should be non-intrusive
      Logger.warn('Auto-sync failed:', error);
      return { version: null };
    }
  }
}
