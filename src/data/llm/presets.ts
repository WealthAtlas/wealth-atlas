/**
 * Every provider here speaks the OpenAI chat-completions wire format, so one
 * client covers all of them. Presets only prefill the base URL and a sensible
 * default model — the user can override both.
 */
export interface LlmPreset {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  /** Whether the provider is known to allow calls straight from a browser. */
  browserFriendly: boolean;
  hint?: string;
}

/**
 * How hard the model should think about a turn.
 *
 * Portable on purpose: call sites say what the turn *is*, and the mapping to a
 * provider's own parameter lives in `reasoningBodyFor`. A call site that had to
 * know about DeepSeek's `thinking` object would have to know about the next
 * provider's too.
 */
export type ReasoningEffort = 'low' | 'high';

/**
 * Provider-specific request fields for a reasoning level, or `{}` where the
 * provider has no such control.
 *
 * Empty is the important default: OpenAI and most compatible endpoints reject a
 * request carrying an unknown top-level parameter with a 400, so a reasoning
 * field can never be sent unconditionally.
 */
export function reasoningBodyFor(
  presetId: string,
  effort: ReasoningEffort
): Record<string, unknown> {
  switch (presetId) {
    case 'deepseek':
      // DeepSeek V4 thinks by default, at `high` effort, on every request. Left
      // alone that spends reasoning tokens on turns that only emit a tool call
      // — and output is the expensive side. So the level is always stated
      // explicitly rather than inherited.
      return { thinking: { type: 'enabled', reasoning_effort: effort } };
    default:
      return {};
  }
}

export const LLM_PRESETS: LlmPreset[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat',
    browserFriendly: true,
    hint: 'One key, most models. Explicitly supports browser calls.',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    // `deepseek-chat` was retired on 2026-07-24. It aliased this model with
    // thinking off, which is not the right default here — see `reasoningBodyFor`.
    defaultModel: 'deepseek-v4-flash',
    // Verified against a real preflight: the API reflects the page's Origin and
    // allows POST with `authorization`, so it is callable straight from the app.
    browserFriendly: true,
    hint: 'Cheap, 1M context, and callable from the browser.',
  },
  {
    id: 'xai',
    label: 'Grok (x.ai)',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    browserFriendly: false,
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    browserFriendly: false,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    browserFriendly: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    browserFriendly: true,
    hint: 'Runs on your machine. Set OLLAMA_ORIGINS to allow browser requests.',
  },
  {
    id: 'custom',
    label: 'Custom',
    baseUrl: '',
    defaultModel: '',
    browserFriendly: true,
    hint: 'Any OpenAI-compatible endpoint, including a local proxy.',
  },
];

export const DEFAULT_PRESET_ID = 'openrouter';

export function findPreset(id: string | undefined): LlmPreset | undefined {
  return LLM_PRESETS.find(preset => preset.id === id);
}
