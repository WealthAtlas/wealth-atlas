import { Logger } from '@/domain/utils/Logger';
import { getLlmSettings, isLocalEndpoint } from './state';

/**
 * Minimal OpenAI-compatible chat client.
 *
 * Deliberately no SDK: every supported provider speaks the same
 * `POST /chat/completions` shape, and the app has no HTTP client dependency.
 */

export type LlmErrorKind = 'not-configured' | 'provider' | 'network' | 'bad-response';

export class LlmError extends Error {
  constructor(
    public readonly kind: LlmErrorKind,
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

interface ChatArgs {
  system: string;
  user: string;
  signal?: AbortSignal;
  /** Some providers cap this; left undefined to use the provider default. */
  maxTokens?: number;
}

function requireSettings() {
  const settings = getLlmSettings();

  if (!settings.baseUrl) {
    throw new LlmError('not-configured', 'No AI provider configured. Add one in Settings.');
  }
  if (!settings.model) {
    throw new LlmError('not-configured', 'No model configured. Add one in Settings.');
  }
  if (!settings.apiKey && !isLocalEndpoint(settings.baseUrl)) {
    throw new LlmError('not-configured', 'No API key configured. Add one in Settings.');
  }

  return settings;
}

/**
 * Providers frequently ignore `response_format` and wrap JSON in a markdown
 * fence, or prefix it with prose. Recover the JSON object rather than failing.
 */
export function extractJson(content: string): unknown {
  const trimmed = content.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the outermost {...} span.
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new LlmError('bad-response', 'The model did not return valid JSON.');
  }
}

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  const settings = requireSettings();
  const url = `${settings.baseUrl}${path}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    Logger.warn('LLM request failed at the network layer:', error);
    throw new LlmError(
      'network',
      `Could not reach ${settings.baseUrl}. The provider may block browser requests (CORS) — ` +
        'try OpenRouter or a local Ollama, or point the base URL at a proxy.'
    );
  }

  const raw = await response.text();

  if (!response.ok) {
    let detail = raw.slice(0, 300);
    try {
      const parsed = JSON.parse(raw) as ChatCompletionResponse;
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // keep the raw text
    }
    throw new LlmError(
      'provider',
      `Provider returned ${response.status}: ${detail}`,
      response.status
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new LlmError('bad-response', 'Provider returned a response that was not JSON.');
  }
}

/**
 * Sends one chat turn and returns the parsed JSON object the model produced.
 */
export async function chatJson({ system, user, signal, maxTokens }: ChatArgs): Promise<unknown> {
  const settings = requireSettings();

  const payload = await post(
    '/chat/completions',
    {
      model: settings.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    },
    signal
  );

  const content = (payload as ChatCompletionResponse).choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmError('bad-response', 'Provider returned an empty response.');
  }

  return extractJson(content);
}

/** Cheap round-trip used by the Settings "Test connection" button. */
export async function testConnection(signal?: AbortSignal): Promise<string> {
  const settings = requireSettings();

  const result = await chatJson({
    system: 'You are a connectivity check. Reply with JSON only.',
    user: 'Reply with exactly {"ok":true}.',
    signal,
    maxTokens: 32,
  });

  if (!result || typeof result !== 'object') {
    throw new LlmError('bad-response', 'Provider responded, but not with usable JSON.');
  }

  return settings.model;
}
