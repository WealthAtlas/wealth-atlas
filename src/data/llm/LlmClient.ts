import { Logger } from '@/domain/utils/Logger';
import { getLlmSettings, isLocalEndpoint, LlmSettings, normalizeBaseUrl } from './state';

/**
 * Minimal OpenAI-compatible chat client.
 *
 * Deliberately no SDK: every supported provider speaks the same
 * `POST /chat/completions` shape, and the app has no HTTP client dependency.
 */

export type LlmErrorKind = 'not-configured' | 'provider' | 'network' | 'bad-response' | 'truncated';

export class LlmError extends Error {
  constructor(
    public readonly kind: LlmErrorKind,
    message: string,
    public readonly status?: number,
    /** From the provider's `Retry-After` header, when it sent one. */
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

/** Worth another go: rate limits and transient provider faults. */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof LlmError)) return false;
  if (error.kind === 'network') return true;
  return error.status === 429 || (error.status !== undefined && error.status >= 500);
}

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
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

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Honour the provider's own pacing when it gives one, else exponential backoff. */
function backoffMs(error: unknown, attempt: number): number {
  const requested = error instanceof LlmError ? error.retryAfterMs : undefined;
  if (requested !== undefined) return Math.min(requested, 30_000);
  return BASE_BACKOFF_MS * 2 ** attempt;
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get('retry-after');
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

async function postOnce(
  settings: LlmSettings,
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  const url = `${normalizeBaseUrl(settings.baseUrl)}${path}`;

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
      `Could not reach ${normalizeBaseUrl(settings.baseUrl)}. The provider may block browser ` +
        'requests (CORS) — try OpenRouter or a local Ollama, or point the base URL at a proxy.'
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
      response.status,
      parseRetryAfter(response)
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new LlmError('bad-response', 'Provider returned a response that was not JSON.');
  }
}

/**
 * Retries rate limits and transient faults. A statement is split across several
 * requests, so a single 429 on the last chunk would otherwise throw away every
 * chunk already paid for.
 */
async function post(
  settings: LlmSettings,
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await postOnce(settings, path, body, signal);
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS - 1 || !isRetryable(error)) throw error;
      const wait = backoffMs(error, attempt);
      Logger.warn(`LLM request failed (attempt ${attempt + 1}), retrying in ${wait}ms:`, error);
      await delay(wait, signal);
    }
  }
}

/**
 * Sends one chat turn and returns the parsed JSON object the model produced.
 */
export async function chatJson({ system, user, signal, maxTokens }: ChatArgs): Promise<unknown> {
  const settings = requireSettings();

  const payload = await post(
    settings,
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

  const choice = (payload as ChatCompletionResponse).choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new LlmError('bad-response', 'Provider returned an empty response.');
  }

  // A reply cut off at the output-token ceiling usually fails to parse, but not
  // always — a truncated operations array can still close cleanly and read as a
  // short, confident plan. Refuse it on the provider's own signal instead.
  if (choice?.finish_reason === 'length') {
    throw new LlmError(
      'truncated',
      "The model's reply was cut off before it finished. Try a smaller file, or a model with a larger output limit."
    );
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

  // Import depends on the model following a JSON instruction exactly, so the
  // check is worth making here rather than discovering it mid-import.
  if (!(result as { ok?: unknown }).ok) {
    throw new LlmError(
      'bad-response',
      `${settings.model} replied, but did not follow the JSON instruction. Statement import may be unreliable with this model.`
    );
  }

  return settings.model;
}
