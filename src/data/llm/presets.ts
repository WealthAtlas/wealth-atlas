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
    defaultModel: 'deepseek-chat',
    browserFriendly: false,
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
