// Minimal local storage helpers for sync settings

const KEY_ID = 'sync.keyId';
const LAST_VERSION = 'sync.lastRemoteVersion';
const LAST_SYNC_AT = 'sync.lastSyncAt';

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
