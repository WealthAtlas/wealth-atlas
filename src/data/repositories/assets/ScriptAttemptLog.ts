import { Logger } from '@/domain/utils/Logger';

/**
 * When each asset's value script last failed, on this device.
 *
 * The freshness gate for a value script is `scriptValueUpdatedAt`, and that
 * stamp is only written when a run *succeeds* — so a script that fails is
 * retried on the next launch, and the one after that, for ever. On an installed
 * PWA opened a dozen times a day that is a dozen calls a day to someone's API,
 * every one of them silent, while the user sees only that the value never
 * populates.
 *
 * Recording the failure is what closes it, and the record has to survive a
 * reload to be worth anything: the repeat this exists to stop *is* a reload, so
 * the in-memory throttle `CurrencyService.updateRate` keeps would not catch a
 * single one of them.
 *
 * `localStorage` rather than a column, by `NewsCache`'s argument. Which device
 * last failed to reach an API is not the user's data: it is device-local, has
 * nothing to contribute to a sync snapshot, and would be actively wrong to
 * restore from a backup — a six-month-old failure is not a reason to skip
 * today's price. It also keeps this out of the four-way version bump a persisted
 * row costs, which would buy nothing.
 */
const STORAGE_KEY = 'assets.scriptFailure.v1';

/**
 * How long a failed script is left alone.
 *
 * An hour rather than the 24 the freshness gate uses: a script that failed
 * because the network was down while the app was starting should recover within
 * the same day, not be written off until tomorrow. It still turns "every reload"
 * into at most one attempt an hour.
 */
export const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;

type FailureLog = Record<string, number>;

function readLog(): FailureLog {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing and blocked site data both throw rather than return null.
    return {};
  }
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as FailureLog;
  } catch {
    return {};
  }
}

function writeLog(log: FailureLog): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch (error) {
    // A full or blocked store costs us the throttle, not the refresh.
    Logger.warn('Could not record a value-script failure:', error);
  }
}

/**
 * Whether enough time has passed since this asset's script last failed.
 *
 * True when it has never failed, which is the ordinary case — the log holds only
 * the assets currently in a failing state.
 */
export function shouldAttemptScript(assetId: number, now: number = Date.now()): boolean {
  const failedAt = readLog()[String(assetId)];
  if (typeof failedAt !== 'number' || !Number.isFinite(failedAt)) return true;
  // A clock moved backwards would otherwise park an asset in the future.
  if (failedAt > now) return true;
  return now - failedAt >= RETRY_AFTER_FAILURE_MS;
}

export function recordScriptFailure(assetId: number, now: number = Date.now()): void {
  const log = readLog();

  // Pruning on write is what stops a deleted asset holding an entry for ever:
  // an expired stamp already means "attempt it", so dropping it changes nothing.
  const pruned: FailureLog = {};
  for (const [id, failedAt] of Object.entries(log)) {
    if (
      typeof failedAt === 'number' &&
      failedAt <= now &&
      now - failedAt < RETRY_AFTER_FAILURE_MS
    ) {
      pruned[id] = failedAt;
    }
  }

  pruned[String(assetId)] = now;
  writeLog(pruned);
}

/** Clears the entry after a run that worked, so the next failure starts fresh. */
export function clearScriptFailure(assetId: number): void {
  const log = readLog();
  if (!(String(assetId) in log)) return;
  delete log[String(assetId)];
  writeLog(log);
}
