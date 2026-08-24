// Minimal local storage helpers for sync settings

const KEY_ID = 'sync.keyId';
const LAST_VERSION = 'sync.lastRemoteVersion';
const LAST_SYNC_AT = 'sync.lastSyncAt';
const PASSPHRASE = 'sync.passphrase';
const AUTO_SYNC_ENABLED = 'sync.autoSyncEnabled';

export function getKeyId(): string | undefined {
  return localStorage.getItem(KEY_ID) || undefined;
}

export function setKeyId(keyId: string | undefined): void {
  if (keyId) localStorage.setItem(KEY_ID, keyId);
  else localStorage.removeItem(KEY_ID);
}

export function getLastRemoteVersion(): number | undefined {
  const v = localStorage.getItem(LAST_VERSION);
  return v ? Number(v) : undefined;
}

export function setLastRemoteVersion(version: number | undefined): void {
  if (typeof version === 'number') localStorage.setItem(LAST_VERSION, String(version));
  else localStorage.removeItem(LAST_VERSION);
}

export function getLastSyncAt(): string | undefined {
  return localStorage.getItem(LAST_SYNC_AT) || undefined;
}

export function setLastSyncAt(iso: string | undefined): void {
  if (iso) localStorage.setItem(LAST_SYNC_AT, iso);
  else localStorage.removeItem(LAST_SYNC_AT);
}

export function getPassphrase(): string | undefined {
  return localStorage.getItem(PASSPHRASE) || undefined;
}

export function setPassphrase(passphrase: string | undefined): void {
  if (passphrase) localStorage.setItem(PASSPHRASE, passphrase);
  else localStorage.removeItem(PASSPHRASE);
}

export function getAutoSyncEnabled(): boolean {
  return localStorage.getItem(AUTO_SYNC_ENABLED) === 'true';
}

export function setAutoSyncEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_SYNC_ENABLED, String(enabled));
}

/**
 * When this device first changed something it has not successfully pushed.
 *
 * The cheapest honest answer to "would a pull delete anything?". Set by the
 * change hooks, cleared only by a completed push or a completed import — a
 * failed push leaves it standing, which is exactly the state that used to let
 * the next pull wipe the edit.
 *
 * The *oldest* unpushed change, not the newest: it is what the user is told they
 * would lose, so it must not creep forward as they keep typing.
 */
const PENDING_CHANGE_SINCE = 'sync.pendingChangeSince';

export function getPendingChangeSince(): string | undefined {
  return localStorage.getItem(PENDING_CHANGE_SINCE) || undefined;
}

export function markPendingChange(): void {
  if (localStorage.getItem(PENDING_CHANGE_SINCE)) return;
  localStorage.setItem(PENDING_CHANGE_SINCE, new Date().toISOString());
}

export function clearPendingChange(): void {
  localStorage.removeItem(PENDING_CHANGE_SINCE);
}

/**
 * The uid lineage this device has adopted, and may therefore merge against.
 *
 * Device-local like the rest of the sync identity: it is a fact about what this
 * store holds, not about the user's data, so it neither syncs nor rides a
 * backup. Restoring a backup onto a device leaves the lineage of whatever it was
 * already linked to, which is right — the ids in the restored file are the ones
 * that file was written with.
 */
const MERGE_LINEAGE = 'sync.mergeLineage';

export function getMergeLineage(): string | undefined {
  return localStorage.getItem(MERGE_LINEAGE) || undefined;
}

export function setMergeLineage(lineage: string | undefined): void {
  if (lineage) localStorage.setItem(MERGE_LINEAGE, lineage);
  else localStorage.removeItem(MERGE_LINEAGE);
}
