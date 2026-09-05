import { useNotification } from '@/app/components/providers/NotificationContext';
import { onAssetValuesRefreshed } from '@/data/assetValueEvents';
import { useEffect, useRef } from 'react';

/**
 * Turns a failed value script into a toast.
 *
 * Renders nothing: it exists only because the refresh is started from `App`,
 * which sits *outside* `NotificationProvider` and so cannot call `notify` — and
 * it has to stay there, because the run is ordered behind the sync pull and the
 * schedule conversions. Listening from inside the provider is what bridges the
 * two without moving the startup ordering.
 *
 * Before this, a script that threw — a 404, a NAV that parsed to `NaN`, a
 * response shape that changed under it — went to `Logger.warn` and nowhere else.
 * The user saw a figure that had quietly stopped moving, with nothing on screen
 * to say the app had tried and failed, which is the silence this project's rule
 * about `useNotification` exists to prevent.
 *
 * Names the asset rather than the error for a single failure and counts them
 * beyond that: the message is a nudge to go and look at the script, not a
 * diagnosis — `Logger` still has the error.
 */
export function AssetValueFailureReporter() {
  const { notify } = useNotification();
  const latest = useRef(notify);
  latest.current = notify;

  useEffect(
    () =>
      onAssetValuesRefreshed(report => {
        if (report.failures.length === 0) return;
        latest.current(
          report.failures.length === 1
            ? `Could not refresh the value of ${report.failures[0].asset}. Check its value script.`
            : `Could not refresh the value of ${report.failures.length} assets. Check their value scripts.`,
          'warning'
        );
      }),
    []
  );

  return null;
}
