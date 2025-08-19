import { useCallback, useMemo, useState } from 'react';
import { SyncService } from '../../data/sync/SyncService';
import { SettingsPage } from '../components/Pages/SettingsPage';

export function SettingsContainer() {
  const [statusVersion, setStatusVersion] = useState(0); // trigger re-render

  const status = useMemo(() => SyncService.getStatus(), [statusVersion]);

  const wrap = (fn: () => Promise<unknown>) =>
    fn()
      .then(() => setStatusVersion(v => v + 1))
      .catch(err => alert(err.message || String(err)));

  const onSetup = useCallback((pass: string) => wrap(() => SyncService.setupSync(pass)), []);
  const onLink = useCallback(
    (keyId: string, pass: string) => wrap(() => SyncService.linkSync(keyId, pass)),
    []
  );
  const onPush = useCallback((pass: string) => wrap(() => SyncService.push(pass)), []);
  const onPull = useCallback(
    (pass: string) => wrap(() => SyncService.pull(pass).then(() => {})),
    []
  );
  const onChangePassphrase = useCallback(
    (oldPass: string, newPass: string) =>
      wrap(() => SyncService.changePassphrase(oldPass, newPass)),
    []
  );
  const onUnlink = useCallback(() => wrap(() => SyncService.unlink()), []);

  return (
    <SettingsPage
      keyId={status.keyId}
      lastRemoteVersion={status.lastRemoteVersion}
      lastSyncAt={status.lastSyncAt}
      onSetup={onSetup}
      onLink={onLink}
      onPush={onPush}
      onPull={onPull}
      onChangePassphrase={onChangePassphrase}
      onUnlink={onUnlink}
    />
  );
}
