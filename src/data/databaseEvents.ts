import { Logger } from '@/domain/utils/Logger';

/**
 * "Every table was just rewritten underneath you."
 *
 * A sync pull and a backup restore both replace the whole database in one go,
 * but the UI holds the copy it read when it mounted. Without a nudge the user
 * keeps looking at the previous state until they navigate away and back — which
 * is what makes a pull look like it did nothing.
 *
 * Deliberately a plain callback set rather than a DOM event or Dexie's own
 * change hooks: the listeners are React effects in this same process, one event
 * per replacement is all anyone needs, and a typed function is easier to follow
 * than a string channel.
 *
 * This is not a substitute for reloading after a mutation the UI made itself —
 * a container still refreshes after its own writes.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Returns its own unsubscribe, so a React effect can return it directly. */
export function onDatabaseReplaced(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDatabaseReplaced(): void {
  // Iterating a copy: a listener that unsubscribes while being notified must not
  // shift the set out from under the walk.
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      // One view failing to refresh must not stop the others from trying.
      Logger.error('A listener failed to refresh after the database was replaced:', error);
    }
  }
}
