// Local storage helpers for the AI import provider settings.
// Same shape and conventions as src/data/sync/state.ts.
//
// These keys are deliberately outside Dexie, so the API key is never included
// in a backup export or pushed to the sync API.

import { DEFAULT_PRESET_ID, findPreset } from './presets';

const PRESET = 'llm.preset';
const BASE_URL = 'llm.baseUrl';
const API_KEY = 'llm.apiKey';
const MODEL = 'llm.model';

export interface LlmSettings {
  presetId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function getPresetId(): string {
  return localStorage.getItem(PRESET) || DEFAULT_PRESET_ID;
}

export function setPresetId(presetId: string): void {
  localStorage.setItem(PRESET, presetId);
}

/**
 * Stored verbatim so the settings field stays editable. Normalising here would
 * strip the trailing slash on every keystroke, and because the field is
 * controlled from this value the user could never type a path segment —
 * "https://host.com/" would become "https://host.com" the moment the slash was
 * typed, and the next character would land as "https://host.comv1".
 */
export function getBaseUrl(): string {
  const stored = localStorage.getItem(BASE_URL);
  if (stored !== null) return stored;
  return findPreset(getPresetId())?.baseUrl ?? '';
}

export function setBaseUrl(baseUrl: string | undefined): void {
  if (baseUrl) localStorage.setItem(BASE_URL, baseUrl);
  else localStorage.removeItem(BASE_URL);
}

/** The form actually used to build a request URL. */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function getApiKey(): string | undefined {
  return localStorage.getItem(API_KEY) || undefined;
}

export function setApiKey(apiKey: string | undefined): void {
  if (apiKey) localStorage.setItem(API_KEY, apiKey.trim());
  else localStorage.removeItem(API_KEY);
}

export function getModel(): string {
  const stored = localStorage.getItem(MODEL);
  if (stored) return stored;
  return findPreset(getPresetId())?.defaultModel ?? '';
}

export function setModel(model: string | undefined): void {
  if (model) localStorage.setItem(MODEL, model.trim());
  else localStorage.removeItem(MODEL);
}

export function getLlmSettings(): LlmSettings {
  return {
    presetId: getPresetId(),
    baseUrl: getBaseUrl(),
    apiKey: getApiKey() ?? '',
    model: getModel(),
  };
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

export function clearLlmSettings(): void {
  localStorage.removeItem(PRESET);
  localStorage.removeItem(BASE_URL);
  localStorage.removeItem(API_KEY);
  localStorage.removeItem(MODEL);
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
