import { describe, expect, it, vi } from 'vitest';
import { emitDatabaseReplaced, onDatabaseReplaced } from './databaseEvents';

describe('databaseEvents', () => {
  it('notifies every listener', () => {
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = onDatabaseReplaced(first);
    const stopSecond = onDatabaseReplaced(second);

    emitDatabaseReplaced();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    stopFirst();
    stopSecond();
  });

  it('stops notifying once unsubscribed', () => {
    const listener = vi.fn();
    onDatabaseReplaced(listener)();

    emitDatabaseReplaced();

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps going when a listener unsubscribes mid-notification', () => {
    const later = vi.fn();
    const stopLater = onDatabaseReplaced(() => later());
    const stopSelf = onDatabaseReplaced(() => stopSelf());

    expect(() => emitDatabaseReplaced()).not.toThrow();
    expect(later).toHaveBeenCalledTimes(1);
    stopLater();
  });

  it('one failing listener does not stop the others', () => {
    const survivor = vi.fn();
    const stopThrower = onDatabaseReplaced(() => {
      throw new Error('view blew up');
    });
    const stopSurvivor = onDatabaseReplaced(survivor);

    expect(() => emitDatabaseReplaced()).not.toThrow();
    expect(survivor).toHaveBeenCalledTimes(1);
    stopThrower();
    stopSurvivor();
  });
});
