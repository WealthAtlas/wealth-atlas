import { describe, expect, it } from 'vitest';
import { ISettings, SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { normaliseMemoryRow, upgradeSettingsRowToV11, upgradeSnapshotDataToV11 } from './v11';

describe('upgradeSettingsRowToV11', () => {
  it('turns memory on for a row that has never seen it', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, baseCurrency: 'INR' };
    upgradeSettingsRowToV11(row);

    expect(row.memory).toEqual({ enabled: true });
  });

  it('keeps a switch the user has turned off', () => {
    const row: Record<string, unknown> = { memory: { enabled: false } };
    upgradeSettingsRowToV11(row);

    expect(row.memory).toEqual({ enabled: false });
  });

  it('is idempotent', () => {
    const row: Record<string, unknown> = { memory: { enabled: false } };
    upgradeSettingsRowToV11(row);
    upgradeSettingsRowToV11(row);

    expect(row.memory).toEqual({ enabled: false });
  });

  it('repairs a block that arrived as something else', () => {
    const row: Record<string, unknown> = { memory: 'yes' };
    upgradeSettingsRowToV11(row);

    expect(row.memory).toEqual({ enabled: true });
  });
});

describe('upgradeSnapshotDataToV11', () => {
  it('gives a pre-v11 snapshot an empty memory', () => {
    // `bulkPut(undefined)` is not `bulkPut([])`, which is the whole reason this
    // step exists for a table Dexie creates by itself.
    const data: Record<string, unknown[] | undefined> = { assets: [], settings: [{ id: 1 }] };
    upgradeSnapshotDataToV11(data);

    expect(data.memories).toEqual([]);
  });

  it('seeds a whole settings row when the snapshot has none', () => {
    const data: Record<string, unknown[] | undefined> = {};
    upgradeSnapshotDataToV11(data);

    const [settings] = data.settings as ISettings[];
    expect(settings.id).toBe(SETTINGS_ID);
    expect(settings.memory).toEqual({ enabled: true });
    expect(settings.targetAllocation).toEqual([]);
    expect(data.memories).toEqual([]);
  });

  it('adds the switch to an existing settings row', () => {
    const data: Record<string, unknown[] | undefined> = {
      settings: [{ id: SETTINGS_ID, baseCurrency: 'GBP', currencies: ['GBP'] }],
    };
    upgradeSnapshotDataToV11(data);

    expect((data.settings as ISettings[])[0].memory).toEqual({ enabled: true });
    // Nothing else on the row is touched.
    expect((data.settings as ISettings[])[0].baseCurrency).toBe('GBP');
  });

  it('leaves existing memories alone', () => {
    const row = { id: 1, kind: 'context', text: 'Retiring around 2045.', source: 'user' };
    const data: Record<string, unknown[] | undefined> = { memories: [{ ...row }], settings: [{}] };
    upgradeSnapshotDataToV11(data);

    expect(data.memories).toEqual([row]);
  });

  it('is idempotent', () => {
    const data: Record<string, unknown[] | undefined> = {
      memories: [{ id: 1, text: 'One  statement.', source: 'assistant' }],
      settings: [{ id: SETTINGS_ID }],
    };
    upgradeSnapshotDataToV11(data);
    const once = JSON.parse(JSON.stringify(data));
    upgradeSnapshotDataToV11(data);

    expect(JSON.parse(JSON.stringify(data))).toEqual(once);
  });
});

describe('normaliseMemoryRow', () => {
  // The block is rendered one statement per line into the system prompt, so an
  // embedded newline would split one memory into two apparent entries.
  it('collapses whitespace that would split the prompt block', () => {
    const row: Record<string, unknown> = { text: '  Can invest\n50,000\ta month.  ' };
    normaliseMemoryRow(row);

    expect(row.text).toBe('Can invest 50,000 a month.');
  });

  it('defaults an unrecognised source to the assistant', () => {
    for (const source of [undefined, null, 'model', 7]) {
      const row: Record<string, unknown> = { text: 'x', source };
      normaliseMemoryRow(row);
      expect(row.source).toBe('assistant');
    }
  });

  it('keeps a source the app wrote', () => {
    const row: Record<string, unknown> = { text: 'x', source: 'user' };
    normaliseMemoryRow(row);
    expect(row.source).toBe('user');
  });
});
