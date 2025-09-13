import { SettingsPage } from '@/app/components/pages/SettingsPage';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
import { BackupService } from '@/domain/services/BackupService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SettingsContainer() {
  const navigate = useNavigate();
  const [, setStatusVersion] = useState(0); // trigger re-render only
  const status = SyncService.getStatus();
  const autoSyncStatus = AutoSyncService.getStatus();

  const wrap = (fn: () => Promise<unknown>) =>
    fn()
      .then(() => setStatusVersion(v => v + 1))
      .catch(err => alert(err.message || String(err)));

  const onSetup = useCallback(
    (pass: string) => wrap(() => SyncService.setupSync(pass, true)), // Auto-sync is always enabled
    []
  );
  const onLink = useCallback(
    (keyId: string, pass: string) => wrap(() => SyncService.linkSync(keyId, pass, true)), // Auto-sync is always enabled
    []
  );
  const onPush = useCallback(() => wrap(() => SyncService.push()), []);
  const onPull = useCallback(() => wrap(() => SyncService.pull().then(() => {})), []);
  const onChangePassphrase = useCallback(
    (oldPass: string, newPass: string) =>
      wrap(() => SyncService.changePassphrase(oldPass, newPass)),
    []
  );
  const onUnlink = useCallback(() => wrap(() => SyncService.unlink()), []);

  const onToggleAutoSync = useCallback((enabled: boolean) => {
    SyncService.setAutoSyncEnabled(enabled);
    setStatusVersion(v => v + 1);
  }, []);

  const onForceSync = useCallback(
    () => wrap(() => AutoSyncService.forceSyncNow().then(() => {})),
    []
  );

  const onBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const onExportData = useCallback(async () => {
    try {
      await BackupService.downloadBackup();
      Logger.info('Data exported successfully');
    } catch (error) {
      Logger.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const onImportData = useCallback(async (file: File) => {
    try {
      const confirmed = confirm(
        'This will replace all your existing data with the data from the backup file. ' +
          'Are you sure you want to continue? This action cannot be undone.'
      );

      if (!confirmed) {
        return;
      }

      await BackupService.uploadAndImport(file);
      Logger.info('Data imported successfully');
      alert('Data imported successfully! The app will refresh.');

      // Refresh the page to reload all data
      window.location.reload();
    } catch (error) {
      Logger.error('Import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

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
