import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSyncConflict,
  decidePull,
  decidePush,
  getSyncConflict,
  onSyncConflictChanged,
  setSyncConflict,
  SyncConflict,
} from './conflict';

// This environment gives us jsdom's window but not a bare `localStorage`, which
// is where a conflict is recorded so it can outlive the tab that found it.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
});

/**
 * These two functions are the whole of the protection. Sync replaces a database
 * in one transaction and the API keeps no history, so every case below is a case
 * where the old code deleted a database and nothing recorded that it had.
 */
describe('deciding whether a push may overwrite the cloud', () => {
  it('pushes when the cloud is still on the version this device is based on', () => {
    expect(decidePush({ baseVersion: 7, remoteVersion: 7 })).toBe('push');
  });

  it('refuses when another device has pushed since', () => {
    // The reported bug: one edit on a device that was a day behind replaced the
    // cloud with its stale copy, and the other device then pulled it.
    expect(decidePush({ baseVersion: 7, remoteVersion: 9 })).toBe('conflict');
  });

  it('refuses when this device cannot say what it is based on', () => {
    // A linked device with no recorded base has no claim to be current, so the
    // safe reading of "unknown" is "stale" rather than "fine".
    expect(decidePush({ baseVersion: undefined, remoteVersion: 1 })).toBe('conflict');
  });

  it('pushes when the cloud is somehow behind this device', () => {
    // Nothing would be lost: the rows this device holds are a superset of a
    // version the cloud has already been past.
    expect(decidePush({ baseVersion: 9, remoteVersion: 7 })).toBe('push');
  });
});

describe('deciding whether a pull may replace every local table', () => {
  it('skips when the cloud has nothing newer', () => {
    expect(decidePull({ baseVersion: 9, remoteVersion: 9, hasUnpushedChanges: false })).toBe(
      'skip'
    );
  });

  it('imports when everything local is already in the cloud', () => {
    expect(decidePull({ baseVersion: 7, remoteVersion: 9, hasUnpushedChanges: false })).toBe(
      'import'
    );
  });

  it('refuses when this device holds edits the cloud has never seen', () => {
    // The import is a whole-database wipe, and an edit made offline or inside
    // the push debounce is a row no remote snapshot can give back.
    expect(decidePull({ baseVersion: 7, remoteVersion: 9, hasUnpushedChanges: true })).toBe(
      'conflict'
    );
  });

  it('skips rather than conflicting when the cloud is not ahead at all', () => {
    // Unpushed local work is not a conflict on its own — there is nothing
    // arriving to displace it. It is settled by the next push.
    expect(decidePull({ baseVersion: 9, remoteVersion: 9, hasUnpushedChanges: true })).toBe('skip');
  });

  it('treats a device that has never synced as behind any real version', () => {
    expect(
      decidePull({ baseVersion: undefined, remoteVersion: 1, hasUnpushedChanges: false })
    ).toBe('import');
  });
});

describe('the recorded conflict', () => {
  const conflict: SyncConflict = {
    direction: 'push',
    baseVersion: 7,
    remoteVersion: 9,
    detectedAt: '2026-08-24T10:00:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('survives a reload, so a refresh cannot look like a resolution', () => {
    setSyncConflict(conflict);
    expect(getSyncConflict()).toEqual(conflict);
  });

  it('discards an unreadable record rather than failing every read after it', () => {
    localStorage.setItem('sync.conflict', '{not json');
    expect(getSyncConflict()).toBeUndefined();
    expect(localStorage.getItem('sync.conflict')).toBeNull();
  });

  it('tells listeners when one is raised and when it is settled', () => {
    const seen: (SyncConflict | undefined)[] = [];
    const unsubscribe = onSyncConflictChanged(c => seen.push(c));
    setSyncConflict(conflict);
    clearSyncConflict();
    unsubscribe();
    setSyncConflict(conflict);
    expect(seen).toEqual([conflict, undefined]);
  });

  it('does not announce a clear when there was nothing to clear', () => {
    const listener = vi.fn();
    const unsubscribe = onSyncConflictChanged(listener);
    clearSyncConflict();
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
  });
});
