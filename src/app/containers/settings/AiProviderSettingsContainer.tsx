import { AiProviderSettingsView } from '@/app/components/views/AiProviderSettingsView';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { LlmError, testConnection } from '@/data/llm/LlmClient';
import { DEFAULT_PRESET_ID, findPreset, LLM_PRESETS } from '@/data/llm/presets';
import {
  getStoredAiProviderSettings,
  isLlmConfigured,
  isLocalEndpoint,
  saveAiProviderSettings,
} from '@/data/llm/state';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { IAiProviderSettings } from '@/domain/entities/shared/Settings';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * The provider configuration is a synced row now, so it is edited as a draft and
 * committed on Save — the same shape as the currency editor next to it. Writing
 * per keystroke would schedule a snapshot push while the user is still typing
 * their key.
 */
interface Draft {
  presetId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Fills the blanks from the preset, which is what the request will use. */
function toDraft(ai: IAiProviderSettings): Draft {
  const presetId = ai.presetId ?? DEFAULT_PRESET_ID;
  const preset = findPreset(presetId);
  return {
    presetId,
    baseUrl: ai.baseUrl ?? preset?.baseUrl ?? '',
    apiKey: ai.apiKey ?? '',
    model: ai.model ?? preset?.defaultModel ?? '',
  };
}

/**
 * The inverse: a field left at its preset default is stored as unset, so it
 * keeps following the preset — including if a later release ships a new endpoint
 * for it. Only what the user actually changed is pinned.
 */
function toStored(draft: Draft): IAiProviderSettings {
  const preset = findPreset(draft.presetId);
  return {
    presetId: draft.presetId,
    baseUrl: draft.baseUrl === (preset?.baseUrl ?? '') ? undefined : draft.baseUrl,
    apiKey: draft.apiKey,
    model: draft.model === (preset?.defaultModel ?? '') ? undefined : draft.model,
  };
}

const FIELDS = ['presetId', 'baseUrl', 'apiKey', 'model'] as const;

function isSameDraft(a: Draft, b: Draft): boolean {
  return FIELDS.every(field => a[field] === b[field]);
}

export function AiProviderSettingsContainer() {
  const { notify } = useNotification();
  const [stored, setStored] = useState<Draft>(() => toDraft(getStoredAiProviderSettings()));
  const [draft, setDraft] = useState<Draft>(stored);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | undefined>();

  const isDirty = useMemo(() => !isSameDraft(draft, stored), [draft, stored]);

  // Readable from the subscription below without resubscribing on every edit.
  const storedRef = useRef(stored);
  storedRef.current = stored;

  // A pull brings the provider, endpoint, model and key from another device.
  // Adopted into the form only when the user has nothing unsaved: the baseline
  // still moves, so `isDirty` keeps telling the truth about what Save would
  // write, but an edit in progress is never overwritten.
  useDatabaseReplaced(() => {
    const saved = toDraft(getStoredAiProviderSettings());
    setDraft(current => (isSameDraft(current, storedRef.current) ? saved : current));
    setStored(saved);
    setTestResult(undefined);
  });

  const update = useCallback((changes: Partial<Draft>) => {
    setDraft(current => ({ ...current, ...changes }));
    setTestResult(undefined);
  }, []);

  const handlePresetChange = useCallback(
    (presetId: string) => {
      const preset = findPreset(presetId);
      // Switching provider replaces the endpoint and model, and drops the key
      // rather than silently reusing it against a new host.
      update({
        presetId,
        baseUrl: preset?.baseUrl ?? '',
        model: preset?.defaultModel ?? '',
        apiKey: '',
      });
    },
    [update]
  );

  const commit = useCallback(
    async (ai: IAiProviderSettings, message: string) => {
      setIsSaving(true);
      try {
        await saveAiProviderSettings(ai);
        // Re-read rather than trusting the draft: what the fields should show is
        // the stored row with the preset blanks filled back in.
        const saved = toDraft(getStoredAiProviderSettings());
        setStored(saved);
        setDraft(saved);
        setTestResult(undefined);
        notify(message, 'success');
      } catch (error) {
        Logger.error('Failed to save AI provider settings:', error);
        notify('Could not save the AI provider settings', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [notify]
  );

  const handleSave = useCallback(
    () => commit(toStored(draft), 'AI provider saved'),
    [commit, draft]
  );

  // Empties the block outright, rather than writing the default preset's values
  // back as an explicit choice.
  const handleClear = useCallback(() => commit({}, 'AI provider cleared'), [commit]);

  const handleRevert = useCallback(() => {
    setDraft(stored);
    setTestResult(undefined);
  }, [stored]);

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    setTestResult(undefined);
    try {
      const model = await testConnection();
      setTestResult({ ok: true, message: `Connected. ${model} responded correctly.` });
    } catch (error) {
      Logger.warn('LLM connection test failed:', error);
      const message = error instanceof LlmError ? error.message : `Test failed: ${String(error)}`;
      setTestResult({ ok: false, message });
    } finally {
      setIsTesting(false);
    }
  }, []);

  return (
    <AiProviderSettingsView
      presets={LLM_PRESETS}
      presetId={draft.presetId}
      baseUrl={draft.baseUrl}
      apiKey={draft.apiKey}
      model={draft.model}
      configured={isLlmConfigured()}
      needsApiKey={!isLocalEndpoint(draft.baseUrl)}
      isDirty={isDirty}
      isSaving={isSaving}
      isTesting={isTesting}
      testResult={testResult}
      onPresetChange={handlePresetChange}
      onBaseUrlChange={baseUrl => update({ baseUrl })}
      onApiKeyChange={apiKey => update({ apiKey })}
      onModelChange={model => update({ model })}
      onSave={handleSave}
      onRevert={handleRevert}
      onTest={handleTest}
      onClear={handleClear}
    />
  );
}
