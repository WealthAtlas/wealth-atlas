import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearScriptFailure,
  recordScriptFailure,
  RETRY_AFTER_FAILURE_MS,
  shouldAttemptScript,
} from './ScriptAttemptLog';

const NOW = new Date('2026-09-05T09:00:00.000Z').getTime();

/**
 * jsdom under this Node does not supply `localStorage` — the global exists and
 * is `undefined`, which is why every read and write in the module under test is
 * wrapped. A map standing in for it is enough to exercise the policy, which is
 * the part worth pinning.
 */
function fakeStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => entries.delete(key),
    setItem: (key: string, value: string) => entries.set(key, value),
  } as Storage;
}

describe('ScriptAttemptLog', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage());
  });

  it('attempts an asset it has never heard of', () => {
    expect(shouldAttemptScript(1, NOW)).toBe(true);
  });

  it('holds off inside the retry window, and lets go once it has passed', () => {
    recordScriptFailure(1, NOW);

    expect(shouldAttemptScript(1, NOW + RETRY_AFTER_FAILURE_MS - 1)).toBe(false);
    expect(shouldAttemptScript(1, NOW + RETRY_AFTER_FAILURE_MS)).toBe(true);
  });

  it('survives the reload it exists to stop', () => {
    recordScriptFailure(1, NOW);

    // A fresh module read of what the previous page left behind: the whole point
    // is that the repeat being throttled is a relaunch, which no in-memory map
    // would ever see.
    expect(localStorage.getItem('assets.scriptFailure.v1')).toContain('1');
    expect(shouldAttemptScript(1, NOW + 60_000)).toBe(false);
  });

  it('throttles one asset without touching another', () => {
    recordScriptFailure(1, NOW);

    expect(shouldAttemptScript(2, NOW)).toBe(true);
  });

  it('attempts again as soon as a run has worked', () => {
    recordScriptFailure(1, NOW);
    clearScriptFailure(1);

    expect(shouldAttemptScript(1, NOW + 60_000)).toBe(true);
  });

  it('forgets an asset whose entry has expired, so a deleted one cannot linger', () => {
    recordScriptFailure(1, NOW);
    recordScriptFailure(2, NOW + RETRY_AFTER_FAILURE_MS + 1);

    const stored = JSON.parse(localStorage.getItem('assets.scriptFailure.v1')!);
    expect(Object.keys(stored)).toEqual(['2']);
  });

  it('attempts rather than waits when the clock has moved backwards', () => {
    recordScriptFailure(1, NOW);

    expect(shouldAttemptScript(1, NOW - 60_000)).toBe(true);
  });

  it('attempts when the stored entry is unreadable', () => {
    localStorage.setItem('assets.scriptFailure.v1', 'not json');

    expect(shouldAttemptScript(1, NOW)).toBe(true);
  });
});
