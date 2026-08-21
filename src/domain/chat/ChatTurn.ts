/**
 * The envelope the assistant must emit on every turn.
 *
 * Native OpenAI tool-calling is deliberately not used. The configured provider
 * may be a local Ollama model, DeepSeek or Groq, whose function-calling support
 * varies, whereas every provider in `LLM_PRESETS` speaks the same JSON chat
 * shape the importer already relies on. One envelope keeps a single code path
 * for all of them, and `extractJson` already recovers JSON wrapped in prose or
 * a markdown fence.
 *
 * Parsing is hand-rolled and forgiving in the same spirit as
 * `ImportPlanValidator`: a model that half-follows the contract should produce
 * a usable turn plus a warning, not an exception.
 */

export interface ChatToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AssistantTurn {
  /** Tools to run before answering. Empty when the model is ready to reply. */
  toolCalls: ChatToolCall[];
  /** The answer to show. Its presence ends the loop. */
  reply?: string;
  /**
   * Proposed writes, left unparsed here: they are handed to
   * `validateImportPlan`, which owns the operation contract.
   */
  operations?: unknown[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * `knownTools` gates the tool names: a hallucinated name is dropped with a
 * warning rather than reaching the registry, so the loop never runs on a
 * misspelling it silently ignored.
 */
export function parseAssistantTurn(
  raw: unknown,
  knownTools: ReadonlySet<string>
): { turn: AssistantTurn; warnings: string[] } {
  const warnings: string[] = [];
  const payload = asRecord(raw);

  if (!payload) {
    return { turn: { toolCalls: [] }, warnings: ['The model did not return a JSON object.'] };
  }

  const toolCalls: ChatToolCall[] = [];
  const rawCalls = payload.toolCalls;

  if (rawCalls !== undefined && !Array.isArray(rawCalls)) {
    warnings.push('The model\'s "toolCalls" was not a list and was ignored.');
  } else if (Array.isArray(rawCalls)) {
    rawCalls.forEach((candidate, index) => {
      const record = asRecord(candidate);
      const name = record ? asNonEmptyString(record.name) : undefined;

      if (!name) {
        warnings.push(`Tool call ${index + 1} had no name and was dropped.`);
        return;
      }
      if (!knownTools.has(name)) {
        warnings.push(`The model asked for an unknown tool "${name}", which was dropped.`);
        return;
      }

      toolCalls.push({ name, args: asRecord(record?.args) ?? {} });
    });
  }

  const reply = asNonEmptyString(payload.reply);
  const operations = Array.isArray(payload.operations) ? payload.operations : undefined;

  if (payload.operations !== undefined && operations === undefined) {
    warnings.push('The model\'s "operations" was not a list and was ignored.');
  }

  // Nothing to run and nothing to say. Reported rather than retried, so the
  // caller can tell the user the model did not follow the contract.
  if (toolCalls.length === 0 && !reply && !operations) {
    warnings.push('The model replied without an answer or a tool call.');
  }

  return {
    turn: {
      toolCalls,
      ...(reply !== undefined ? { reply } : {}),
      ...(operations !== undefined ? { operations } : {}),
    },
    warnings,
  };
}
