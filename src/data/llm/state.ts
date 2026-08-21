// Access point for the AI provider settings.
//
// These live in the Dexie `settings` singleton (schema v7 onward), so they sync
// and back up with every other preference in Settings. Before v7 they were four
// localStorage keys; `hydrateAiProviderSettings` adopts those once and then
// removes them.
//
// Reads are synchronous. The row is cached in memory and the cache is filled in
// Dexie's `ready` handler, which holds back every other query until it resolves
// — so by the time anything in the app has seen a database row, the cache is
// warm. That is what lets `LlmClient` and the import/chat services keep asking
// for the configuration mid-request instead of threading it through.

import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import {
  IAiProviderSettings,
  normaliseAiProviderSettings,
} from '@/domain/entities/shared/Settings';
import { Logger } from '@/domain/utils/Logger';
import { DEFAULT_PRESET_ID, findPreset } from './presets';

/** Pre-v7 keys. Read once by `hydrateAiProviderSettings`, then deleted. */
const LEGACY_KEYS = {
  presetId: 'llm.preset',
  baseUrl: 'llm.baseUrl',
  apiKey: 'llm.apiKey',
  model: 'llm.model',
} as const;

/** The stored settings, as the user typed them. Every field may be unset. */
let cache: IAiProviderSettings | undefined;

/**
 * The resolved configuration: preset defaults filled in, ready to build a
 * request from.
 */
export interface LlmSettings {
  presetId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function stored(): IAiProviderSettings {
  if (cache === undefined) {
    // Only reachable if something asks before the database has opened. Answering
    // "not configured" is the safe reading: it sends the user to Settings rather
    // than firing a request with half a configuration.
    Logger.warn('AI provider settings read before they were loaded; treating as unconfigured');
    return {};
  }
  return cache;
}

function readLegacySettings(): IAiProviderSettings | undefined {
  const legacy = normaliseAiProviderSettings({
    presetId: localStorage.getItem(LEGACY_KEYS.presetId) ?? undefined,
    baseUrl: localStorage.getItem(LEGACY_KEYS.baseUrl) ?? undefined,
    apiKey: localStorage.getItem(LEGACY_KEYS.apiKey) ?? undefined,
    model: localStorage.getItem(LEGACY_KEYS.model) ?? undefined,
  });
  return Object.keys(legacy).length > 0 ? legacy : undefined;
}

function removeLegacySettings(): void {
  for (const key of Object.values(LEGACY_KEYS)) localStorage.removeItem(key);
}

/**
 * Fills the cache from the database, adopting the pre-v7 localStorage keys the
 * first time. Called from Dexie's `ready` handler, and again after a sync pull
 * or a backup restore replaces the settings row.
 */
export async function hydrateAiProviderSettings(): Promise<void> {
  const repository = new SettingsRepository();

  try {
    const settings = await repository.get();
    let ai = normaliseAiProviderSettings(settings.ai);

    const legacy = readLegacySettings();
    if (legacy) {
      // The row wins if it already carries a configuration: it is either the
      // adoption from a previous run or a newer one pulled from another device.
      if (Object.keys(ai).length === 0) {
        ai = legacy;
        await repository.save({ ...settings, ai });
        Logger.info('Moved AI provider settings out of localStorage into synced settings');
      }
      removeLegacySettings();
    }

    cache = ai;
  } catch (error) {
    // A cache that stays empty reports "not configured", which is recoverable
    // from the Settings page. Throwing here would block the database opening.
    Logger.error('Failed to load AI provider settings:', error);
    cache = cache ?? {};
  }
}

export function getPresetId(): string {
  return stored().presetId ?? DEFAULT_PRESET_ID;
}

/**
 * Unset means "whatever the preset says", so switching provider without touching
 * the field follows the preset — and a preset whose endpoint changes in a later
 * release brings the user along.
 */
export function getBaseUrl(): string {
  return stored().baseUrl ?? findPreset(getPresetId())?.baseUrl ?? '';
}

/** The form actually used to build a request URL. */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function getApiKey(): string | undefined {
  return stored().apiKey;
}

export function getModel(): string {
  return stored().model ?? findPreset(getPresetId())?.defaultModel ?? '';
}

export function getLlmSettings(): LlmSettings {
  return {
    presetId: getPresetId(),
    baseUrl: getBaseUrl(),
    apiKey: getApiKey() ?? '',
    model: getModel(),
  };
}

/** What is on disk, unresolved — what the Settings form edits. */
export function getStoredAiProviderSettings(): IAiProviderSettings {
  return { ...stored() };
}

/**
 * Writes the whole block. The Settings form saves in one go rather than per
 * keystroke: every write here is a synced row, and a push per character typed
 * into the API key field would be absurd.
 */
export async function saveAiProviderSettings(ai: IAiProviderSettings): Promise<void> {
  const repository = new SettingsRepository();
  const settings = await repository.get();
  const normalised = normaliseAiProviderSettings(ai);
  await repository.save({ ...settings, ai: normalised });
  cache = normalised;
}

export async function clearAiProviderSettings(): Promise<void> {
  await saveAiProviderSettings({});
}

/** Ollama and other local endpoints do not need a key; everything else does. */
export function isLocalEndpoint(baseUrl: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(normalizeBaseUrl(baseUrl));
}

export function isLlmConfigured(): boolean {
  const { baseUrl, apiKey, model } = getLlmSettings();
  if (!normalizeBaseUrl(baseUrl) || !model.trim()) return false;
  return Boolean(apiKey) || isLocalEndpoint(baseUrl);
}

/** Host shown to the user before any of their data is sent. */
export function getProviderHost(): string {
  const baseUrl = normalizeBaseUrl(getBaseUrl());
  if (!baseUrl) return 'not configured';
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}
