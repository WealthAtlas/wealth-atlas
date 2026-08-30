import { SettingsPage } from '@/app/components/pages/SettingsPage';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { onSyncConflictChanged } from '@/data/sync/conflict';
import { SyncService } from '@/data/sync/Syncer';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { BackupService } from '@/domain/services/BackupService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SettingsContainer() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [, setStatusVersion] = useState(0); // trigger re-render only
  const status = SyncService.getStatus();

  // Read at render, so a background pull needs a nudge for "Last sync" to stop
  // showing the state from before it.
  useDatabaseReplaced(() => setStatusVersion(v => v + 1));

  // The card in this section is the only place a refused sync is shown, and the
  // push that raises one runs in the background with nobody watching. Without
  // this, a conflict raised while Settings is open stays invisible until the
  // user navigates away and back.
  useEffect(() => onSyncConflictChanged(() => setStatusVersion(v => v + 1)), []);

  const wrap = useCallback(
    (fn: () => Promise<unknown>) =>
      fn()
        .then(() => setStatusVersion(v => v + 1))
        .catch(err => notify(err.message || String(err), 'error')),
    [notify]
  );

  const onSetup = useCallback(
    (pass: string) => wrap(() => SyncService.setupSync(pass, true)), // Auto-sync is always enabled
    [wrap]
  );
  const onLink = useCallback(
    (keyId: string, pass: string) => wrap(() => SyncService.linkSync(keyId, pass, true)), // Auto-sync is always enabled
    [wrap]
  );
  const onUnlink = useCallback(() => wrap(() => SyncService.unlink()), [wrap]);

  const onDismissOverwrite = useCallback(() => {
    SyncService.dismissOverwrite();
    setStatusVersion(v => v + 1);
  }, []);

  const onResolveConflict = useCallback(
    (resolution: 'keep-local' | 'take-remote') =>
      wrap(() => SyncService.resolveConflict(resolution)),
    [wrap]
  );

  const onToggleAutoSync = useCallback((enabled: boolean) => {
    SyncService.setAutoSyncEnabled(enabled);
    setStatusVersion(v => v + 1);
  }, []);

  const onBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const onExportData = useCallback(async () => {
    try {
      await BackupService.downloadBackup();
      Logger.info('Data exported successfully');
      notify('Backup downloaded', 'success');
    } catch (error) {
      Logger.error('Export failed:', error);
      notify(`Export failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }, [notify]);

  const onImportData = useCallback(
    async (file: File) => {
      try {
        // Restoring a backup wipes the database, so this one keeps a blocking
        // confirm rather than a toast.
        const confirmed = confirm(
          'This will replace all your existing data with the data from the backup file. ' +
            'Are you sure you want to continue? This action cannot be undone.'
        );

        if (!confirmed) {
          return;
        }

        await BackupService.uploadAndImport(file);
        Logger.info('Data imported successfully');
        notify('Data restored. Reloading…', 'success');

        // Refresh the page to reload all data
        window.location.reload();
      } catch (error) {
        Logger.error('Import failed:', error);
        notify(`Import failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    },
    [notify]
  );

  return (
    <SettingsPage
      keyId={status.keyId}
      lastSyncAt={status.lastSyncAt}
      autoSyncEnabled={status.autoSyncEnabled}
      conflict={status.conflict}
      overwrite={status.overwrite}
      onSetup={onSetup}
      onLink={onLink}
      onUnlink={onUnlink}
      onToggleAutoSync={onToggleAutoSync}
      onResolveConflict={onResolveConflict}
      onDismissOverwrite={onDismissOverwrite}
      onExportData={onExportData}
      onImportData={onImportData}
      onBack={onBack}
    />
  );
}
