import { describe, expect, it } from 'vitest';
import { findPreset, LLM_PRESETS, reasoningBodyFor } from './presets';

describe('reasoningBodyFor', () => {
  it('states DeepSeek’s thinking level explicitly rather than inheriting it', () => {
    // Left alone, V4 thinks at `high` on every request — including the turns
    // that only emit a tool call, where output tokens are pure waste.
    expect(reasoningBodyFor('deepseek', 'low')).toEqual({
      thinking: { type: 'enabled', reasoning_effort: 'low' },
    });
    expect(reasoningBodyFor('deepseek', 'high')).toEqual({
      thinking: { type: 'enabled', reasoning_effort: 'high' },
    });
  });

  it('sends nothing for a provider with no such control', () => {
    // An unknown top-level parameter is a 400 on OpenAI and most compatible
    // endpoints, so this can never default to a non-empty object.
    for (const presetId of ['openai', 'openrouter', 'groq', 'ollama', 'custom', 'xai']) {
      expect(reasoningBodyFor(presetId, 'high'), presetId).toEqual({});
    }
  });

  it('sends nothing for a preset id it has never heard of', () => {
    expect(reasoningBodyFor('some-future-provider', 'high')).toEqual({});
  });
});

describe('the DeepSeek preset', () => {
  it('does not name a retired model', () => {
    // `deepseek-chat` was sunset on 2026-07-24.
    expect(findPreset('deepseek')?.defaultModel).toBe('deepseek-v4-flash');
  });

  it('is marked callable from a browser, which a real preflight confirms', () => {
    expect(findPreset('deepseek')?.browserFriendly).toBe(true);
  });
});

describe('the preset table', () => {
  it('has a unique id, a label and a default model for every entry', () => {
    const ids = LLM_PRESETS.map(preset => preset.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const preset of LLM_PRESETS) {
      expect(preset.label.length, preset.id).toBeGreaterThan(0);
      // 'custom' is the deliberate exception: the user supplies both.
      if (preset.id !== 'custom') {
        expect(preset.baseUrl, preset.id).not.toBe('');
        expect(preset.defaultModel, preset.id).not.toBe('');
      }
    }
  });
});
