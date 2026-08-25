import { CloudCopyView } from '@/app/components/views/CloudCopyView';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { SyncService, type RemoteInspection } from '@/data/sync/Syncer';
import { useCallback, useState } from 'react';

/**
 * The read-only half of sync, kept separate from the Push/Pull controls on
 * purpose: nothing here can replace anything, and it is the card a user reaches
 * for when records have gone missing and they are afraid to touch the others.
 */
export function CloudCopyContainer() {
  const { notify } = useNotification();
  const [inspection, setInspection] = useState<RemoteInspection>();
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (work: () => Promise<void>) => {
      setBusy(true);
      try {
        await work();
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), 'error');
      } finally {
        setBusy(false);
      }
    },
    [notify]
  );

  const onInspect = useCallback(
    () =>
      run(async () => {
        setInspection(await SyncService.inspectRemote(passphrase || undefined));
      }),
    [passphrase, run]
  );

  const onDownload = useCallback(
    () =>
      run(async () => {
        await SyncService.downloadRemoteCopy(passphrase || undefined);
        notify('Cloud copy downloaded', 'success');
      }),
    [notify, passphrase, run]
  );

  return (
    <CloudCopyView
      inspection={inspection}
      busy={busy}
      needsPassphrase={!SyncService.getStatus().hasStoredPassphrase}
      passphrase={passphrase}
      onPassphraseChange={setPassphrase}
      onInspect={onInspect}
      onDownload={onDownload}
    />
  );
}
