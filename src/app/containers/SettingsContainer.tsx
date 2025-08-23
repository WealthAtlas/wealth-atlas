import { useCallback, useState } from 'react';
import { SyncService } from '../../data/sync/SyncService';
import { SettingsPage } from '../components/Pages/SettingsPage';

export function SettingsContainer() {
  const [, setStatusVersion] = useState(0); // trigger re-render only
  const status = SyncService.getStatus();

  const wrap = (fn: () => Promise<unknown>) =>
    fn()
      .then(() => setStatusVersion(v => v + 1))
      .catch(err => alert(err.message || String(err)));

  const onSetup = useCallback(
    (pass: string, enableAutoSync: boolean) =>
      wrap(() => SyncService.setupSync(pass, enableAutoSync)),
    []
  );
  const onLink = useCallback(
    (keyId: string, pass: string, enableAutoSync: boolean) =>
      wrap(() => SyncService.linkSync(keyId, pass, enableAutoSync)),
    []
  );
  const onPush = useCallback((pass?: string) => wrap(() => SyncService.push(pass)), []);
  const onPull = useCallback(
    (pass?: string) => wrap(() => SyncService.pull(pass).then(() => {})),
    []
  );
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

  return (
    <SettingsPage
      keyId={status.keyId}
      lastRemoteVersion={status.lastRemoteVersion}
      lastSyncAt={status.lastSyncAt}
      autoSyncEnabled={status.autoSyncEnabled}
      hasStoredPassphrase={status.hasStoredPassphrase}
      onSetup={onSetup}
      onLink={onLink}
      onPush={onPush}
      onPull={onPull}
      onChangePassphrase={onChangePassphrase}
      onUnlink={onUnlink}
      onToggleAutoSync={onToggleAutoSync}
    />
  );
}
