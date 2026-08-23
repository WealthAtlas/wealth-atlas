import { describe, expect, it } from 'vitest';
import { MemoryKind, MEMORY_LIMIT, MEMORY_TEXT_LIMIT } from '../entities/memory/Memory';
import { parseMemoryOperations } from './MemoryOps';

const KNOWN = new Set([1, 2, 3]);

describe('parseMemoryOperations', () => {
  it('reads a valid mixed batch intact', () => {
    const { operations, warnings } = parseMemoryOperations(
      {
        operations: [
          { op: 'add', kind: 'context', text: 'Can invest about 50,000 a month.' },
          { op: 'update', id: 2, text: 'Prefers index funds over active ones.' },
          { op: 'delete', id: 3 },
        ],
      },
      KNOWN
    );

    expect(warnings).toEqual([]);
    expect(operations).toEqual([
      { op: 'add', kind: MemoryKind.Context, text: 'Can invest about 50,000 a month.' },
      { op: 'update', id: 2, text: 'Prefers index funds over active ones.' },
      { op: 'delete', id: 3 },
    ]);
  });

  // The common, correct outcome: most exchanges hold nothing durable.
  it('treats an empty list as success', () => {
    expect(parseMemoryOperations({ operations: [] }, KNOWN)).toEqual({
      operations: [],
      warnings: [],
    });
  });

  // Some models express "nothing to do" by omitting the key rather than sending
  // an empty array. That is not a contract violation worth warning about.
  it('treats a missing operations key as nothing to do', () => {
    expect(parseMemoryOperations({}, KNOWN)).toEqual({ operations: [], warnings: [] });
  });

  it('warns when the response is not an object', () => {
    const { operations, warnings } = parseMemoryOperations('sure, here you go', KNOWN);
    expect(operations).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('warns when operations is not an array', () => {
    const { operations, warnings } = parseMemoryOperations({ operations: 'none' }, KNOWN);
    expect(operations).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('drops an unknown operation name', () => {
    const { operations, warnings } = parseMemoryOperations(
      { operations: [{ op: 'merge', id: 1, text: 'x' }] },
      KNOWN
    );
    expect(operations).toEqual([]);
    expect(warnings[0]).toContain('unknown memory operation');
  });

  it('drops an unknown kind rather than guessing one', () => {
    const { operations, warnings } = parseMemoryOperations(
      { operations: [{ op: 'add', kind: 'risk', text: 'Dislikes volatility.' }] },
      KNOWN
    );
    expect(operations).toEqual([]);
    expect(warnings[0]).toContain('unknown kind');
  });

  it('drops an added memory with no text', () => {
    const { operations, warnings } = parseMemoryOperations(
      { operations: [{ op: 'add', kind: 'context', text: '   ' }] },
      KNOWN
    );
    expect(operations).toEqual([]);
    expect(warnings[0]).toContain('no text');
  });

  // A model reconciling a list will occasionally cite a row it invented. Letting
  // that through would delete whatever happened to share the number.
  it('drops an update or delete for an id that does not exist', () => {
    const { operations, warnings } = parseMemoryOperations(
      {
        operations: [
          { op: 'update', id: 99, text: 'Invented.' },
          { op: 'delete', id: 42 },
        ],
      },
      KNOWN
    );
    expect(operations).toEqual([]);
    expect(warnings).toHaveLength(2);
  });

  it('drops a second operation on a row already touched', () => {
    const { operations, warnings } = parseMemoryOperations(
      {
        operations: [
          { op: 'update', id: 1, text: 'First.' },
          { op: 'delete', id: 1 },
        ],
      },
      KNOWN
    );
    expect(operations).toEqual([{ op: 'update', id: 1, text: 'First.' }]);
    expect(warnings[0]).toContain('second delete');
  });

  it('drops an update that changes nothing', () => {
    const { operations, warnings } = parseMemoryOperations(
      { operations: [{ op: 'update', id: 1 }] },
      KNOWN
    );
    expect(operations).toEqual([]);
    expect(warnings[0]).toContain('changed nothing');
  });

  it('drops text longer than one statement', () => {
    const long = 'x'.repeat(MEMORY_TEXT_LIMIT + 1);
    const add = parseMemoryOperations(
      { operations: [{ op: 'add', kind: 'context', text: long }] },
      KNOWN
    );
    expect(add.operations).toEqual([]);
    expect(add.warnings[0]).toContain('longer than one statement');

    const update = parseMemoryOperations(
      { operations: [{ op: 'update', id: 1, text: long }] },
      KNOWN
    );
    expect(update.operations).toEqual([]);
    expect(update.warnings[0]).toContain('longer than one statement');
  });

  it('trims and keeps text at exactly the limit', () => {
    const exact = 'y'.repeat(MEMORY_TEXT_LIMIT);
    const { operations } = parseMemoryOperations(
      { operations: [{ op: 'add', kind: 'context', text: `  ${exact}  ` }] },
      KNOWN
    );
    expect(operations).toEqual([{ op: 'add', kind: MemoryKind.Context, text: exact }]);
  });

  it('stops adding once the cap is reached, counting what is already stored', () => {
    const adds = Array.from({ length: 3 }, (_, index) => ({
      op: 'add',
      kind: 'context',
      text: `Fact ${index}.`,
    }));
    const { operations, warnings } = parseMemoryOperations(
      { operations: adds },
      KNOWN,
      MEMORY_LIMIT - 1
    );
    expect(operations).toHaveLength(1);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain(`already holding ${MEMORY_LIMIT}`);
  });

  // A delete frees a slot, so a full list can still be reorganised in one batch.
  it('lets a delete make room for an add in the same batch', () => {
    const { operations, warnings } = parseMemoryOperations(
      {
        operations: [
          { op: 'delete', id: 1 },
          { op: 'add', kind: 'preference', text: 'Prefers monthly SIPs.' },
        ],
      },
      KNOWN,
      MEMORY_LIMIT
    );
    expect(operations).toHaveLength(2);
    expect(warnings).toEqual([]);
  });

  it('accepts an id that arrived as a string', () => {
    const { operations } = parseMemoryOperations(
      { operations: [{ op: 'delete', id: '2' }] },
      KNOWN
    );
    expect(operations).toEqual([{ op: 'delete', id: 2 }]);
  });

  it('skips an entry that is not an object', () => {
    const { operations, warnings } = parseMemoryOperations({ operations: ['delete 1'] }, KNOWN);
    expect(operations).toEqual([]);
    expect(warnings[0]).toContain('not an object');
  });
});
