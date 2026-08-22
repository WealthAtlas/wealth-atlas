import { useNotification } from '@/app/components/providers/NotificationContext';
import { NewsProviderSettingsView } from '@/app/components/views/NewsProviderSettingsView';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { NewsService } from '@/domain/services/NewsService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function NewsProviderSettingsContainer() {
  const { notify } = useNotification();
  const service = useMemo(() => new NewsService(), []);

  const [stored, setStored] = useState('');
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | undefined>();

  // Held in refs so `load` does not depend on them and get rebuilt per keystroke.
  const storedRef = useRef('');
  const draftRef = useRef('');
  draftRef.current = draft;

  const load = useCallback(async () => {
    const key = (await service.getSettings()).apiKey ?? '';
    // Adopted only when there is nothing to lose: a sync pull can land while the
    // user is halfway through pasting a key.
    if (draftRef.current === storedRef.current) setDraft(key);
    storedRef.current = key;
    setStored(key);
  }, [service]);

  useEffect(() => {
    load().catch(error => {
      Logger.error('Failed to load news provider settings:', error);
      notify('Could not load the news settings', 'error');
    });
  }, [load, notify]);

  useDatabaseReplaced(() => {
    load().catch(error => Logger.error('Failed to reload news provider settings:', error));
  });

  const onSave = useCallback(async () => {
    setIsSaving(true);
    setTestResult(undefined);
    try {
      await service.saveSettings({ apiKey: draft });
      await load();
      notify(draft.trim() === '' ? 'Market news turned off' : 'News key saved', 'success');
    } catch (error) {
      Logger.error('Failed to save news provider settings:', error);
      notify('Could not save the news key', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [service, draft, load, notify]);

  const onTest = useCallback(async () => {
    setIsTesting(true);
    setTestResult(undefined);
    try {
      setTestResult({ ok: true, message: await service.testConnection(draft) });
    } catch (error) {
      // Shown inline rather than as a toast: the user is about to act on it.
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : 'The key could not be verified',
      });
    } finally {
      setIsTesting(false);
    }
  }, [service, draft]);

  return (
    <NewsProviderSettingsView
      apiKey={draft}
      isDirty={draft !== stored}
      isSaving={isSaving}
      isTesting={isTesting}
      testResult={testResult}
      onApiKeyChange={setDraft}
      onSave={onSave}
      onTest={onTest}
    />
  );
}
