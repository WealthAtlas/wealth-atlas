import { RecoveryCopiesView } from '@/app/components/views/RecoveryCopiesView';
import { SyncConflictView } from '@/app/components/views/SyncConflictView';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { getSyncConflict, onSyncConflictChanged, SyncConflict } from '@/data/sync/conflict';
import {
  downloadRecoverySnapshot,
  listRecoverySnapshots,
  RecoverySnapshotMeta,
} from '@/data/sync/recovery';
import { SyncService } from '@/data/sync/Syncer';
import { BackupService } from '@/domain/services/BackupService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useEffect, useState } from 'react';

/**
 * The conflict card and the recovery copies, both in Settings.
 *
 * One container for the two because they share every reload: resolving a
 * conflict files a copy, and downloading a copy is the thing a user does
 * immediately after resolving one the wrong way.
 */
export function SyncConflictContainer() {
  const { notify } = useNotification();
  const [conflict, setConflict] = useState<SyncConflict | undefined>(() => getSyncConflict());
  const [copies, setCopies] = useState<RecoverySnapshotMeta[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const reloadCopies = useCallback(() => {
    listRecoverySnapshots()
      .then(setCopies)
      .catch(error => {
        // A recovery store that cannot be listed is worth a log, not a toast:
        // nothing the user asked for has failed.
        Logger.warn('Could not list the recovery copies:', error);
      });
  }, []);

  useEffect(() => reloadCopies(), [reloadCopies]);

  // A conflict is usually raised by the background push rather than by anything
  // on this screen, so it arrives as an event.
  useEffect(() => onSyncConflictChanged(setConflict), []);

  const resolve = useCallback(
    async (resolution: 'keep-local' | 'take-remote') => {
      setBusy(true);
      try {
        await SyncService.resolveConflict(resolution, passphrase || undefined);
        setPassphrase('');
        notify(
          resolution === 'keep-local'
            ? 'This device is now the cloud copy.'
            : 'This device now matches the cloud.',
          'success'
        );
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), 'error');
      } finally {
        setBusy(false);
        reloadCopies();
      }
    },
    [notify, passphrase, reloadCopies]
  );

  const onConfirmMerge = useCallback(async () => {
    setBusy(true);
    try {
      await SyncService.confirmMerge(passphrase || undefined);
      setPassphrase('');
      notify('Merged. Both devices now hold the same records.', 'success');
    } catch (error) {
      // Including the case where the cloud moved again while the card was open,
      // which re-asks rather than applying a plan computed against a snapshot
      // that is no longer there.
      notify(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setBusy(false);
      reloadCopies();
    }
  }, [notify, passphrase, reloadCopies]);

  const onExportBackup = useCallback(async () => {
    try {
      await BackupService.downloadBackup();
      notify('Backup downloaded', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), 'error');
    }
  }, [notify]);

  const onDownloadRecovery = useCallback(
    async (id: number) => {
      try {
        await downloadRecoverySnapshot(id);
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), 'error');
      }
    },
    [notify]
  );

  const onDismiss = useCallback(() => {
    // Dismissing settles nothing, and says so. The divergence is still there,
    // so the next sync finds it again — hiding the banner is all this does.
    SyncService.dismissConflict();
    notify('Conflict hidden. It will come back on the next sync until you choose a copy.', 'info');
  }, [notify]);

  return (
    <>
      {conflict && (
        <SyncConflictView
          conflict={conflict}
          busy={busy}
          needsPassphrase={!SyncService.getStatus().hasStoredPassphrase}
          passphrase={passphrase}
          onPassphraseChange={setPassphrase}
          onKeepLocal={() => void resolve('keep-local')}
          onTakeRemote={() => void resolve('take-remote')}
          onConfirmMerge={() => void onConfirmMerge()}
          onExportBackup={() => void onExportBackup()}
          onDismiss={onDismiss}
        />
      )}
      <RecoveryCopiesView copies={copies} onDownload={id => void onDownloadRecovery(id)} />
    </>
  );
}
