import { describe, expect, it } from 'vitest';
import { normaliseDecisionRow, upgradeSnapshotDataToV10 } from './v10';

describe('upgradeSnapshotDataToV10', () => {
  it('gives a pre-v10 snapshot an empty journal', () => {
    // `bulkPut(undefined)` is not `bulkPut([])`, which is the whole reason this
    // step exists for a table Dexie creates by itself.
    const data: Record<string, unknown[] | undefined> = { assets: [] };
    upgradeSnapshotDataToV10(data);

    expect(data.decisions).toEqual([]);
  });

  it('leaves an existing journal alone', () => {
    const entry = { id: 1, category: 'Gold', action: 'sell', evidence: { benchmarkLevel: 50 } };
    const data: Record<string, unknown[] | undefined> = { decisions: [entry] };
    upgradeSnapshotDataToV10(data);

    expect(data.decisions).toEqual([entry]);
  });

  it('restores an evidence block that was lost in transit', () => {
    // `reviewDecision` reads `evidence.benchmarkLevel`; an undefined evidence
    // would throw rather than report `no-evidence`.
    const data: Record<string, unknown[] | undefined> = {
      decisions: [{ id: 1 }, { id: 2, evidence: null }, { id: 3, evidence: 'broken' }],
    };
    upgradeSnapshotDataToV10(data);

    for (const row of data.decisions as Record<string, unknown>[]) {
      expect(row.evidence).toEqual({});
    }
  });

  it('is idempotent', () => {
    const data: Record<string, unknown[] | undefined> = { decisions: [{ id: 1 }] };
    upgradeSnapshotDataToV10(data);
    const once = JSON.parse(JSON.stringify(data.decisions));
    upgradeSnapshotDataToV10(data);

    expect(data.decisions).toEqual(once);
  });
});

describe('normaliseDecisionRow', () => {
  it('keeps a usable evidence block', () => {
    const row: Record<string, unknown> = { evidence: { benchmarkLevel: 100 } };
    normaliseDecisionRow(row);

    expect(row.evidence).toEqual({ benchmarkLevel: 100 });
  });
});
