import { SettingsPage } from '@/app/components/pages/SettingsPage';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { BackupService } from '@/domain/services/BackupService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SettingsContainer() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [, setStatusVersion] = useState(0); // trigger re-render only
  const status = SyncService.getStatus();
  const autoSyncStatus = AutoSyncService.getStatus();

  // Read at render, so a background pull needs a nudge for "Last Sync" and the
  // remote version to stop showing the state from before it.
  useDatabaseReplaced(() => setStatusVersion(v => v + 1));

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
  const onPush = useCallback(() => wrap(() => SyncService.push()), [wrap]);
  const onPull = useCallback(() => wrap(() => SyncService.pull().then(() => {})), [wrap]);
  const onChangePassphrase = useCallback(
    (oldPass: string, newPass: string) =>
      wrap(() => SyncService.changePassphrase(oldPass, newPass)),
    [wrap]
  );
  const onUnlink = useCallback(() => wrap(() => SyncService.unlink()), [wrap]);

  const onToggleAutoSync = useCallback((enabled: boolean) => {
    SyncService.setAutoSyncEnabled(enabled);
    setStatusVersion(v => v + 1);
  }, []);

  const onForceSync = useCallback(
    () => wrap(() => AutoSyncService.forceSyncNow().then(() => {})),
    [wrap]
  );

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
      lastRemoteVersion={status.lastRemoteVersion}
      lastSyncAt={status.lastSyncAt}
      hasStoredPassphrase={status.hasStoredPassphrase}
      autoSyncEnabled={status.autoSyncEnabled}
      autoSyncStatus={autoSyncStatus}
      onSetup={onSetup}
      onLink={onLink}
      onPush={onPush}
      onPull={onPull}
      onChangePassphrase={onChangePassphrase}
      onUnlink={onUnlink}
      onToggleAutoSync={onToggleAutoSync}
      onForceSync={onForceSync}
      onExportData={onExportData}
      onImportData={onImportData}
      onBack={onBack}
    />
  );
}
