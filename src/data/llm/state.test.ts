import { defaultSettings, ISettings } from '@/domain/entities/shared/Settings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The one-shot move of the AI provider settings out of localStorage (pre-v7)
 * into the synced settings row. It runs once per device, silently, while the
 * database opens — getting it wrong loses the user's provider configuration, so
 * it is worth a test even though the rest of this module is thin.
 */

// This environment gives us jsdom's window but not a bare `localStorage`, which
// is what the module under test reads.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
});

const row = { current: defaultSettings() };
const save = vi.fn(async (settings: ISettings) => {
  row.current = settings;
  return settings;
});

vi.mock('@/data/repositories/settings/SettingsRepository', () => ({
  SettingsRepository: class {
    async get() {
      return row.current;
    }
    async save(settings: ISettings) {
      return save(settings);
    }
  },
}));

/** A fresh copy of the module, so the in-memory cache starts empty each time. */
async function loadState() {
  vi.resetModules();
  return await import('./state');
}

const LEGACY = {
  'llm.preset': 'openai',
  'llm.baseUrl': 'https://api.openai.com/v1',
  'llm.apiKey': 'sk-legacy',
  'llm.model': 'gpt-4o-mini',
};

function writeLegacyStorage(): void {
  for (const [key, value] of Object.entries(LEGACY)) localStorage.setItem(key, value);
}

beforeEach(() => {
  localStorage.clear();
  save.mockClear();
  row.current = defaultSettings();
});

describe('hydrateAiProviderSettings', () => {
  it('adopts the pre-v7 localStorage keys and removes them', async () => {
    writeLegacyStorage();
    const state = await loadState();

    await state.hydrateAiProviderSettings();

    expect(state.getLlmSettings()).toEqual({
      presetId: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-legacy',
      model: 'gpt-4o-mini',
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(row.current.ai.apiKey).toBe('sk-legacy');
    expect(Object.keys(LEGACY).map(key => localStorage.getItem(key))).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('leaves a configuration already in the row alone, and still clears the old keys', async () => {
    writeLegacyStorage();
    row.current = { ...defaultSettings(), ai: { presetId: 'groq', apiKey: 'sk-synced' } };
    const state = await loadState();

    await state.hydrateAiProviderSettings();

    expect(state.getApiKey()).toBe('sk-synced');
    expect(save).not.toHaveBeenCalled();
    expect(localStorage.getItem('llm.apiKey')).toBeNull();
  });

  it('writes nothing when there is neither a row config nor an old key', async () => {
    const state = await loadState();

    await state.hydrateAiProviderSettings();

    expect(state.isLlmConfigured()).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('falls back to the preset for the fields the user never set', async () => {
    row.current = { ...defaultSettings(), ai: { presetId: 'ollama' } };
    const state = await loadState();

    await state.hydrateAiProviderSettings();

    expect(state.getBaseUrl()).toBe('http://localhost:11434/v1');
    expect(state.getModel()).toBe('llama3.1');
    // A local endpoint needs no key, so this counts as configured.
    expect(state.isLlmConfigured()).toBe(true);
  });

  it('reports unconfigured rather than throwing when asked before it has loaded', async () => {
    row.current = { ...defaultSettings(), ai: { presetId: 'openai', apiKey: 'sk-1' } };
    const state = await loadState();

    // No key means no request can leave, which is the safe reading of "we have
    // not read the row yet" — and every call site already routes that to
    // "configure a provider in Settings".
    expect(state.isLlmConfigured()).toBe(false);
    expect(state.getApiKey()).toBeUndefined();
  });
});

describe('saveAiProviderSettings', () => {
  it('drops the blanks so an emptied field falls back to the preset again', async () => {
    const state = await loadState();
    await state.hydrateAiProviderSettings();

    await state.saveAiProviderSettings({
      presetId: 'ollama',
      baseUrl: '',
      apiKey: '  ',
      model: 'mistral',
    });

    expect(row.current.ai).toEqual({ presetId: 'ollama', model: 'mistral' });
    expect(state.getBaseUrl()).toBe('http://localhost:11434/v1');
  });

  it('keeps the rest of the settings row untouched', async () => {
    row.current = { ...defaultSettings(), baseCurrency: 'GBP', currencies: ['GBP', 'USD'] };
    const state = await loadState();
    await state.hydrateAiProviderSettings();

    await state.saveAiProviderSettings({ apiKey: 'sk-2' });

    expect(row.current.baseCurrency).toBe('GBP');
    expect(row.current.currencies).toEqual(['GBP', 'USD']);
  });

  it('clearing empties the block, so nothing is left pointing at a provider', async () => {
    row.current = { ...defaultSettings(), ai: { presetId: 'openai', apiKey: 'sk-1' } };
    const state = await loadState();
    await state.hydrateAiProviderSettings();

    await state.clearAiProviderSettings();

    expect(row.current.ai).toEqual({});
    expect(state.getApiKey()).toBeUndefined();
    expect(state.isLlmConfigured()).toBe(false);
  });
});
