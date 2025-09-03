import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoSyncService } from '../../../data/sync/AutoSyncService';
import { SyncService } from '../../../data/sync/Syncer';
import { SettingsPage } from '../../components/pages/SettingsPage';

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
      onBack={onBack}
    />
  );
}
