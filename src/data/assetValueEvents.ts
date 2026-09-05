import { Logger } from '@/domain/utils/Logger';

/**
 * "The value scripts have finished running."
 *
 * Startup fires `AssetService.updateValues()` unawaited and every asset's value
 * sits behind a network call, so the writes land seconds after the page has
 * already read its copy — and a value refresh is not a database replacement, so
 * nothing in `databaseEvents` fires for it. Whether the user saw today's price
 * therefore came down to whether the loop reached their asset before the
 * container fetched, which is exactly what "it works sometimes" means.
 *
 * The report travels with the event rather than the listeners re-reading it,
 * because the other half of this is the failures. A script that throws — a 404,
 * a NAV that parses to `NaN`, a response shape that changed — was reported only
 * to `Logger`, and the app is not allowed to fail silently at the user: nothing
 * else would ever tell them why the figure on screen is three days old.
 *
 * A plain callback set for the same reasons `databaseEvents` uses one: the
 * listeners are React effects in this process, and a typed function beats a
 * string channel.
 */
export interface AssetValueFailure {
  asset: string;
  message: string;
}

export interface AssetValueRefreshReport {
  /** Assets whose stored value the run actually rewrote. */
  updated: number;
  failures: AssetValueFailure[];
}

type Listener = (report: AssetValueRefreshReport) => void;

const listeners = new Set<Listener>();

/** Returns its own unsubscribe, so a React effect can return it directly. */
export function onAssetValuesRefreshed(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAssetValuesRefreshed(report: AssetValueRefreshReport): void {
  // Iterating a copy: a listener that unsubscribes while being notified must not
  // shift the set out from under the walk.
  for (const listener of [...listeners]) {
    try {
      listener(report);
    } catch (error) {
      // One view failing must not stop the others from hearing about it.
      Logger.error('A listener failed after the asset values were refreshed:', error);
    }
  }
}
