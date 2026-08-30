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
import { rehydrateSnapshotDates } from '../rehydrateDates';
import { IMemory } from '@/domain/entities/memory/Memory';
import { hydrateAiProviderSettings } from '../llm/state';
import { emitDatabaseReplaced } from '../databaseEvents';
import { buildSyncApiUrl } from './config';
import {
  clearSyncConflict,
  clearSyncOverwrite,
  decidePull,
  decidePush,
  getSyncConflict,
  getSyncOverwrite,
  setSyncConflict,
  setSyncOverwrite,
  SyncConflict,
  SyncConflictError,
  SyncDirection,
} from './conflict';
import { CryptoMeta, decryptJson, encryptJson } from './crypto';
import {
  clearPendingChange,
  getAutoSyncEnabled,
  getKeyId,
  getLastRemoteVersion,
  getLastSyncAt,
  getPassphrase,
  getPendingChangeSince,
  setAutoSyncEnabled,
  setKeyId,
  setLastRemoteVersion,
  setLastSyncAt,
  setPassphrase,
} from './state';
import { RemoteDataResponse, Snapshot, SyncStatus } from './types';

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
 * Sync snapshot version. Its own counter, unrelated to the Dexie version.
 *
 * There is no upgrade chain any more, and there is not meant to be one. A
 * snapshot older than this build is imported exactly as it stands: every shape
 * change since v9 has either added a field — which reads as absent, the same
 * thing an upgrade step would have written — or removed one nothing reads. What
 * the number is still for is the one direction that cannot be shrugged off, and
 * that is the check below.
 */
const SNAPSHOT_VERSION = 18;

function getSchemaVersion(): number {
  return SNAPSHOT_VERSION;
}

/**
 * Refuses a snapshot written by a newer build than this one.
 *
 * The asymmetry is the whole point. Reading an older snapshot loses nothing,
 * because this build knows every field in it. Reading a *newer* one silently
 * drops whatever it has no place for — and the drop is invisible, because the
 * very next push writes the truncated shape back over the cloud. So a device
 * behind the mesh stops and says so rather than quietly deleting the fields it
 * cannot name.
 */
function requireReadableSnapshot(snapshot: Snapshot): Snapshot {
  if (snapshot.schemaVersion > SNAPSHOT_VERSION) {
    throw new Error(
      `The cloud copy was written by a newer version of Wealth Atlas ` +
        `(snapshot v${snapshot.schemaVersion} where this device reads v${SNAPSHOT_VERSION}). ` +
        'Update this device before syncing. Nothing here has been changed.'
    );
  }
  return snapshot;
}

/**
 * Snapshots travel as JSON, so every Date column arrives as a string. Convert
 * them back before writing or the store ends up with mixed types.
 */
function rehydrateSnapshot(snapshot: Snapshot): void {
  rehydrateSnapshotDates(snapshot.data as unknown as Record<string, Record<string, unknown>[]>);
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
  ]);
  return {
    schemaVersion: getSchemaVersion(),
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
    },
  };
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
 * Where the cloud actually is, for a conflict card to quote.
 *
 * Best effort and deliberately so: it costs a full GET, it is only ever wanted
 * on the conflict path, and a conflict that could not be raised because this
 * request failed would be the worst possible trade — so a failure here leaves
 * the card less specific rather than leaving the conflict unrecorded.
 */
async function probeRemote(keyId: string): Promise<{ version?: number; updatedAt?: string }> {
  try {
    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
    return { version: resp.version, updatedAt: resp.updatedAt };
  } catch (error) {
    Logger.warn('Could not read the current state of the cloud copy:', error);
    return {};
  }
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
  remoteVersion: number,
  remoteUpdatedAt?: string
): never {
  const conflict: SyncConflict = {
    direction,
    baseVersion,
    remoteVersion,
    pendingSince: getPendingChangeSince(),
    remoteUpdatedAt,
    detectedAt: new Date().toISOString(),
  };
  setSyncConflict(conflict);
  Logger.warn(
    `Sync ${direction} refused: local base v${baseVersion ?? '?'} against remote v${remoteVersion}`
  );
  throw new SyncConflictError(conflict);
}

async function importSnapshot(incoming: Snapshot): Promise<void> {
  const snapshot = requireReadableSnapshot(incoming);
  rehydrateSnapshot(snapshot);

  // Suppressed, because `bulkPut` fires the `creating` hooks: without this every
  // pull armed a push of what it had just imported, and left the device looking
  // as though it had unpushed edits of its own — which is precisely the state
  // `decidePull` refuses to import over.
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
      ],
      async () => {
        await Promise.all([
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
      }
    )
  );

  // Every local row is now the remote's, so there is nothing unpushed and
  // nothing left to disagree about.
  clearPendingChange();
  clearSyncConflict();

  // The pulled row carries the AI provider configuration, and it is read from a
  // synchronous cache — refill it or this device keeps talking to the provider
  // the snapshot just replaced.
  await hydrateAiProviderSettings();

  // Views hold what they read on mount, so without this the pull is invisible
  // until the user navigates away and back.
  emitDatabaseReplaced();
}

async function pushSnapshot(
  passphrase: string | undefined,
  options: { force: boolean }
): Promise<{ version: number }> {
  const keyId = getKeyId();
  if (!keyId) throw new Error('Sync not set up');

  const actualPassphrase = passphrase || getPassphrase();
  if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

  const baseVersion = getLastRemoteVersion();

  // Checked here first so the ordinary stale device never spends a PUT to find
  // out, and so the conflict is raised before the whole snapshot is encrypted
  // and uploaded. Forced only by a conflict the user has resolved in this
  // device's favour.
  if (!options.force) {
    const remoteVersion = await requireRemoteVersion(keyId);
    if (decidePush({ baseVersion, remoteVersion }) === 'conflict') {
      raiseConflict('push', baseVersion, remoteVersion, (await probeRemote(keyId)).updatedAt);
    }
  }

  const snapshot = await exportSnapshot();
  const { payload, meta } = await encryptJson(snapshot, actualPassphrase, snapshot.schemaVersion);

  // And checked again by the server, atomically, which is the half the check
  // above cannot do. Reading the version and then writing leaves a round trip in
  // between, and another device writing inside it used to be accepted — both
  // pushes taken, the loser silently replaced. `expectedVersion` moves that
  // decision to the one place it can be made without a gap: the write itself.
  //
  // Omitted on a forced push, which is exactly a request to overwrite whatever
  // is there. A backend that does not understand the field ignores it and
  // behaves as it always did, so an older deployment still works.
  const expectedVersion = options.force ? undefined : baseVersion;

  let resp: RemoteDataResponse<CryptoMeta>;
  try {
    resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`, {
      method: 'PUT',
      body: JSON.stringify(
        expectedVersion === undefined ? { payload, meta } : { payload, meta, expectedVersion }
      ),
    });
  } catch (error) {
    // The server refused the swap: something landed between the check above and
    // this write. Nothing was stored, so this is an ordinary conflict — the same
    // question, just caught by the only party that could catch it.
    if (error instanceof SyncApiError && error.status === 409) {
      const remote = await probeRemote(keyId);
      raiseConflict('push', baseVersion, remote.version ?? -1, remote.updatedAt);
    }
    throw error;
  }

  setLastRemoteVersion(resp.version);
  setLastSyncAt(new Date().toISOString());
  // Only a completed push clears this. A failed one leaves the device marked as
  // holding work the cloud has not seen, which is what stops the next pull.
  clearPendingChange();
  clearSyncConflict();

  // A backstop, and with `expectedVersion` honoured it should never fire: the
  // server only accepts a write from the version we named, so the version we get
  // back is always one step on. It stays because that is a promise made by a
  // deployment rather than by this code — an older backend, or one rolled back,
  // silently returns to accepting every PUT, and this is the only thing that
  // would notice.
  //
  // Consecutive versions are what make it work: the server counts exactly the
  // writes that happened, so more than one step on means writes landed in
  // between and this push is sitting on top of them.
  //
  // Recorded rather than raised. This device is in step with the cloud now and
  // its next push is legitimate, so a conflict — which stops syncing until it is
  // answered — would be the wrong shape. Which copy actually survived is not
  // knowable from here, so the alert says the copies diverged and points at the
  // other device rather than claiming this one won.
  //
  // Skipped on a forced push, where the version is expected not to line up: that
  // is the user resolving a conflict in this device's favour, on purpose.
  if (!options.force && baseVersion !== undefined && resp.version > baseVersion + 1) {
    setSyncOverwrite({
      baseVersion,
      resultVersion: resp.version,
      detectedAt: new Date().toISOString(),
    });
    Logger.warn(
      `This push was based on v${baseVersion} but landed as v${resp.version}: ` +
        'writes from another device landed in between, and the server did not ' +
        'refuse this one — check that the backend honours expectedVersion'
    );
  }

  // Store passphrase if auto-sync is enabled and passphrase was provided manually
  if (getAutoSyncEnabled() && passphrase && !getPassphrase()) {
    setPassphrase(passphrase);
  }

  return { version: resp.version };
}

/**
 * Replaces every local table with a snapshot's rows.
 *
 * The only way the cloud reaches this device, and a whole-database wipe, so it
 * is refused while this device holds work the cloud has never seen. That
 * refusal is the whole safeguard: what it protects is asked about rather than
 * inferred, and the user answers with both copies still intact.
 */
async function replaceFromSnapshot(
  snapshot: Snapshot,
  version: number,
  baseVersion: number | undefined,
  options: { force: boolean; remoteUpdatedAt?: string }
): Promise<{ version: number | null }> {
  if (!options.force) {
    const decision = decidePull({
      baseVersion,
      remoteVersion: version,
      hasUnpushedChanges: Boolean(getPendingChangeSince()),
    });
    if (decision === 'skip') return { version: null };
    // The whole response is already in hand here, so this one costs nothing.
    if (decision === 'conflict')
      raiseConflict('pull', baseVersion, version, options.remoteUpdatedAt);
  }

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

  // The overwhelmingly common outcome of a poll is "nothing changed", so settle
  // that against a few bytes instead of downloading the whole snapshot. Only
  // exact equality short-circuits: anything else — including a version *below*
  // this device's base — is a decision `decidePull` has to make with the
  // snapshot in hand, because the downgrade guard runs on the payload.
  const probed = await fetchRemoteVersion(keyId);
  if (probed !== undefined && probed === (baseVersion ?? -1)) return { version: null };

  const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);

  // Decrypted before anything is filed or cleared: a wrong passphrase must cost
  // nothing but the request.
  const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, actualPassphrase);

  const result = await replaceFromSnapshot(snapshot, resp.version, baseVersion, {
    force: options.force,
    remoteUpdatedAt: resp.updatedAt,
  });

  // Store passphrase if auto-sync is enabled and passphrase was provided manually
  if (getAutoSyncEnabled() && passphrase && !getPassphrase()) {
    setPassphrase(passphrase);
  }

  return result;
}

export class SyncService {
  static getStatus(): SyncStatus {
    return {
      enabled: Boolean(getKeyId()),
      keyId: getKeyId(),
      lastSyncAt: getLastSyncAt(),
      autoSyncEnabled: getAutoSyncEnabled(),
      pendingChangeSince: getPendingChangeSince(),
      conflict: getSyncConflict(),
      overwrite: getSyncOverwrite(),
    };
  }

  static async setupSync(
    passphrase: string,
    enableAutoSync = false
  ): Promise<{ keyId: string; version: number }> {
    return runExclusive(async () => {
      const snapshot = await exportSnapshot();
      const { payload, meta } = await encryptJson(snapshot, passphrase, snapshot.schemaVersion);
      const resp = await api<RemoteDataResponse<CryptoMeta>>('/data', {
        method: 'POST',
        body: JSON.stringify({ payload, meta }),
      });
      setKeyId(resp.keyId);
      setLastRemoteVersion(resp.version);
      setLastSyncAt(new Date().toISOString());
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
   * Settings form says so plainly before this runs.
   */
  static async linkSync(keyId: string, passphrase: string, enableAutoSync = false): Promise<void> {
    return runExclusive(async () => {
      const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
      const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, passphrase);
      // Forced: adopting a key is a deliberate replacement of this device, which
      // is what the Settings form warns about before calling here.
      await replaceFromSnapshot(snapshot, resp.version, undefined, { force: true });
      setKeyId(resp.keyId);

      if (enableAutoSync) {
        setPassphrase(passphrase);
        setAutoSyncEnabled(true);
      }
    });
  }

  /**
   * Replaces this device with the cloud's copy, refusing while this device holds
   * anything the cloud has not seen.
   *
   * This is also what runs by itself — on startup, and on every poll. It is safe
   * to run unattended precisely because of that refusal: a device that has
   * published everything it holds loses nothing by taking the newer copy, and a
   * device that has not is stopped and asks.
   */
  static async pull(passphrase?: string): Promise<{ version: number | null }> {
    return runExclusive(() => pullSnapshot(passphrase, { force: false }));
  }

  static async push(passphrase?: string): Promise<{ version: number }> {
    return runExclusive(() => pushSnapshot(passphrase, { force: false }));
  }

  /**
   * Settles a refused sync the only way it can be settled without row-level
   * merge metadata: the user says which copy to keep, and the other is
   * overwritten. This is the only exit from a conflict, which is why the Sync
   * section shows it rather than logging it — a device left in conflict pushes
   * nothing and pulls nothing until it is answered.
   */
  static async resolveConflict(
    resolution: 'keep-local' | 'take-remote',
    passphrase?: string
  ): Promise<void> {
    return runExclusive(async () => {
      if (!getSyncConflict()) return;

      if (resolution === 'take-remote') {
        await pullSnapshot(passphrase, { force: true });
        return;
      }

      await pushSnapshot(passphrase, { force: true });
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
    clearSyncOverwrite();
  }

  /**
   * Acknowledges an overwrite report. It blocks nothing, so this only clears the
   * notice — there is no undo to offer, which is exactly why it is reported.
   */
  static dismissOverwrite(): void {
    clearSyncOverwrite();
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
      return await this.pull();
    } catch (error) {
      // A conflict is not a failure to retry: it is recorded, the Sync section
      // is showing it, and the user's answer is the only thing that clears it.
      if (error instanceof SyncConflictError) {
        Logger.warn('Auto-sync stopped: this device and the cloud have both changed');
        return { version: null };
      }
      // Log error but don't throw - auto-sync should be non-intrusive
      Logger.warn('Auto-sync failed:', error);
      return { version: null };
    }
  }
}
