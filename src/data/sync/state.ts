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
