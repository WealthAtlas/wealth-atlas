import { AiProviderSettingsView } from '@/app/components/views/AiProviderSettingsView';
import { LlmError, testConnection } from '@/data/llm/LlmClient';
import { findPreset, LLM_PRESETS } from '@/data/llm/presets';
import {
  clearLlmSettings,
  getLlmSettings,
  isLlmConfigured,
  isLocalEndpoint,
  setApiKey,
  setBaseUrl,
  setModel,
  setPresetId,
} from '@/data/llm/state';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useState } from 'react';

export function AiProviderSettingsContainer() {
  const [settings, setSettings] = useState(() => getLlmSettings());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | undefined>();

  const refresh = useCallback(() => setSettings(getLlmSettings()), []);

  const handlePresetChange = useCallback(
    (presetId: string) => {
      const preset = findPreset(presetId);
      setPresetId(presetId);
      // Switching provider replaces the endpoint and model, but keeps the key
      // out of the way rather than silently reusing it against a new host.
      setBaseUrl(preset?.baseUrl || undefined);
      setModel(preset?.defaultModel || undefined);
      setApiKey(undefined);
      setTestResult(undefined);
      refresh();
    },
    [refresh]
  );

  const handleBaseUrlChange = useCallback(
    (baseUrl: string) => {
      setBaseUrl(baseUrl);
      setTestResult(undefined);
      refresh();
    },
    [refresh]
  );

  const handleApiKeyChange = useCallback(
    (apiKey: string) => {
      setApiKey(apiKey);
      setTestResult(undefined);
      refresh();
    },
    [refresh]
  );

  const handleModelChange = useCallback(
    (model: string) => {
      setModel(model);
      setTestResult(undefined);
      refresh();
    },
    [refresh]
  );

  const handleClear = useCallback(() => {
    clearLlmSettings();
    setTestResult(undefined);
    refresh();
  }, [refresh]);

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
      presetId={settings.presetId}
      baseUrl={settings.baseUrl}
      apiKey={settings.apiKey}
      model={settings.model}
      configured={isLlmConfigured()}
      needsApiKey={!isLocalEndpoint(settings.baseUrl)}
      isTesting={isTesting}
      testResult={testResult}
      onPresetChange={handlePresetChange}
      onBaseUrlChange={handleBaseUrlChange}
      onApiKeyChange={handleApiKeyChange}
      onModelChange={handleModelChange}
      onTest={handleTest}
      onClear={handleClear}
    />
  );
}
