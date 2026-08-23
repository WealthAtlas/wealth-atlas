import {
  isMemoryKind,
  MemoryKind,
  MEMORY_LIMIT,
  MEMORY_TEXT_LIMIT,
} from '../entities/memory/Memory';

/**
 * What the curator is allowed to ask for, and a forgiving parser for it.
 *
 * The shape mirrors `parseAssistantTurn` and `ImportPlanValidator` on purpose: a
 * model that half-follows the contract should produce usable operations plus
 * warnings, never an exception. A thrown error here would lose the operations
 * the model *did* get right, and this runs in the background where nobody is
 * watching for a stack trace.
 *
 * `update` and `delete` are gated on ids that actually exist, the way tool names
 * are gated on `knownTools`. A model asked to reconcile a list will occasionally
 * cite an id it has invented, and letting that through would either throw inside
 * Dexie or, worse, delete a row that happened to share the number.
 */

export type MemoryOperation =
  | { op: 'add'; kind: MemoryKind; text: string }
  | { op: 'update'; id: number; kind?: MemoryKind; text?: string }
  | { op: 'delete'; id: number };

export interface ParsedMemoryOperations {
  operations: MemoryOperation[];
  warnings: string[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function asId(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(numeric) ? numeric : undefined;
}

/**
 * `knownIds` are the ids currently in the table. `existingCount` is how many
 * rows are already stored, so the cap counts what is there plus what is being
 * added rather than only the batch.
 */
export function parseMemoryOperations(
  raw: unknown,
  knownIds: ReadonlySet<number>,
  existingCount = knownIds.size
): ParsedMemoryOperations {
  const warnings: string[] = [];
  const payload = asRecord(raw);

  if (!payload) {
    return { operations: [], warnings: ['The curator did not return a JSON object.'] };
  }

  const rawOps = payload.operations;
  if (rawOps === undefined) {
    // Not a fault: the curator is told to say nothing when nothing is durable,
    // and some models express that by omitting the key rather than sending [].
    return { operations: [], warnings };
  }
  if (!Array.isArray(rawOps)) {
    return { operations: [], warnings: ['The curator’s "operations" was not an array.'] };
  }

  const operations: MemoryOperation[] = [];
  // Deletes free a slot, so the cap is checked against a running total rather
  // than the count we started with.
  let projectedCount = existingCount;
  const touched = new Set<number>();

  for (const entry of rawOps) {
    const record = asRecord(entry);
    if (!record) {
      warnings.push('Skipped a memory operation that was not an object.');
      continue;
    }

    const op = typeof record.op === 'string' ? record.op.trim().toLowerCase() : '';

    if (op === 'add') {
      const text = asText(record.text);
      if (!text) {
        warnings.push('Skipped an added memory with no text.');
        continue;
      }
      if (!isMemoryKind(record.kind)) {
        warnings.push(`Skipped a memory with an unknown kind: ${JSON.stringify(record.kind)}.`);
        continue;
      }
      if (text.length > MEMORY_TEXT_LIMIT) {
        warnings.push('Skipped a memory longer than one statement.');
        continue;
      }
      if (projectedCount >= MEMORY_LIMIT) {
        warnings.push(`Skipped a memory: already holding ${MEMORY_LIMIT}.`);
        continue;
      }
      projectedCount += 1;
      operations.push({ op: 'add', kind: record.kind, text });
      continue;
    }

    if (op === 'update' || op === 'delete') {
      const id = asId(record.id);
      if (id === undefined || !knownIds.has(id)) {
        warnings.push(`Skipped a ${op} for a memory that does not exist: ${String(record.id)}.`);
        continue;
      }
      // Two operations on one row in a single batch is the model contradicting
      // itself; the first is as good a guess as any and the second is dropped.
      if (touched.has(id)) {
        warnings.push(`Skipped a second ${op} for memory ${id}.`);
        continue;
      }

      if (op === 'delete') {
        touched.add(id);
        projectedCount -= 1;
        operations.push({ op: 'delete', id });
        continue;
      }

      const text = asText(record.text);
      const kind = isMemoryKind(record.kind) ? record.kind : undefined;
      if (text === undefined && kind === undefined) {
        warnings.push(`Skipped an update to memory ${id} that changed nothing.`);
        continue;
      }
      if (text !== undefined && text.length > MEMORY_TEXT_LIMIT) {
        warnings.push(`Skipped an update to memory ${id}: longer than one statement.`);
        continue;
      }
      touched.add(id);
      operations.push({
        op: 'update',
        id,
        ...(kind === undefined ? {} : { kind }),
        ...(text === undefined ? {} : { text }),
      });
      continue;
    }

    warnings.push(`Skipped an unknown memory operation: ${JSON.stringify(record.op)}.`);
  }

  return { operations, warnings };
}
