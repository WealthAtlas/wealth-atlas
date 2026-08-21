import { onDatabaseReplaced } from '@/data/databaseEvents';
import { useEffect, useRef, useState } from 'react';

/**
 * Runs `refresh` whenever a sync pull or a backup restore replaces the database.
 *
 * The callback is held in a ref so a caller can pass an inline closure without
 * resubscribing on every render — the subscription is set up once, for the life
 * of the component.
 */
export function useDatabaseReplaced(refresh: () => void): void {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => onDatabaseReplaced(() => latest.current()), []);
}

/**
 * A counter that changes whenever the database is replaced. Call it from a
 * component that reads live data during render rather than holding it in state —
 * it has nothing to reload, it just needs to render again.
 */
export function useDatabaseVersion(): number {
  const [version, setVersion] = useState(0);
  useDatabaseReplaced(() => setVersion(current => current + 1));
  return version;
}
