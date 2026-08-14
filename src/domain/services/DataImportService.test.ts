import { LlmError } from '@/data/llm/LlmClient';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatFn,
  ChunkBudget,
  DataImportService,
  getChunkBudget,
  splitInHalf,
  splitIntoChunks,
} from './DataImportService';

vi.mock('./AssetService', () => ({
  AssetService: vi.fn(() => ({
    getAssets: vi.fn(async () => []),
    updateValues: vi.fn(async () => {}),
  })),
}));
vi.mock('./LoanService', () => ({
  LoanService: vi.fn(() => ({ getLoans: vi.fn(async () => []) })),
}));
vi.mock('./ExpenseService', () => ({
  ExpenseService: vi.fn(() => ({ getExpenses: vi.fn(async () => []) })),
}));

const HEADER = 'date,amount';
const ROW = '2024-01-01,100';

function buildCsv(rows: number): string {
  return [HEADER, ...Array.from({ length: rows }, () => ROW)].join('\n');
}

describe('getChunkBudget', () => {
  it.each([
    'http://localhost:11434/v1',
    'http://127.0.0.1:11434/v1',
    'http://[::1]:11434/v1',
    'https://localhost:8080/v1',
  ])('uses the small local budget for %s', baseUrl => {
    expect(getChunkBudget(baseUrl).maxCharsPerRequest).toBe(12_000);
  });

  it.each([
    'https://openrouter.ai/api/v1',
    'https://api.openai.com/v1',
    'https://api.deepseek.com/v1',
  ])('uses the large cloud budget for %s', baseUrl => {
    expect(getChunkBudget(baseUrl).maxCharsPerRequest).toBe(60_000);
  });

  it('gives the local budget more chunks, so a small window does not shrink capacity as much', () => {
    const local = getChunkBudget('http://localhost:11434/v1');
    const cloud = getChunkBudget('https://openrouter.ai/api/v1');

    expect(local.maxCharsPerRequest).toBeLessThan(cloud.maxCharsPerRequest);
    expect(local.maxChunks).toBeGreaterThan(cloud.maxChunks);
  });
});

describe('splitIntoChunks', () => {
  const budget: ChunkBudget = { maxCharsPerRequest: 50, maxChunks: 10 };

  it('returns the text untouched when it fits the budget', () => {
    const text = buildCsv(1);

    expect(splitIntoChunks(text, budget)).toEqual({ chunks: [text], truncated: false });
  });

  it('splits on row boundaries and repeats the header in every chunk', () => {
    const { chunks, truncated } = splitIntoChunks(buildCsv(5), budget);

    expect(truncated).toBe(false);
    expect(chunks).toEqual([
      `${HEADER}\n${ROW}\n${ROW}`,
      `${HEADER}\n${ROW}\n${ROW}`,
      `${HEADER}\n${ROW}`,
    ]);
  });

  it('never splits mid-row', () => {
    const { chunks } = splitIntoChunks(buildCsv(9), budget);

    for (const chunk of chunks) {
      const [header, ...rows] = chunk.split('\n');
      expect(header).toBe(HEADER);
      expect(rows.every(row => row === ROW)).toBe(true);
    }
  });

  it('drops chunks past maxChunks and reports the truncation', () => {
    const { chunks, truncated } = splitIntoChunks(buildCsv(5), {
      maxCharsPerRequest: 50,
      maxChunks: 2,
    });

    expect(truncated).toBe(true);
    expect(chunks).toHaveLength(2);
  });

  it('keeps a mid-sized file whole for a cloud provider but chunks it for a local one', () => {
    // ~15k chars: inside the 60k cloud budget, past the 12k local one.
    const text = buildCsv(1_000);

    const cloud = splitIntoChunks(text, getChunkBudget('https://openrouter.ai/api/v1'));
    const local = splitIntoChunks(text, getChunkBudget('http://localhost:11434/v1'));

    expect(cloud.chunks).toHaveLength(1);
    expect(local.chunks.length).toBeGreaterThan(1);
    expect(local.truncated).toBe(false);
  });
});

describe('splitInHalf', () => {
  it('halves the rows and repeats the header', () => {
    expect(splitInHalf(buildCsv(4))).toEqual([
      `${HEADER}\n${ROW}\n${ROW}`,
      `${HEADER}\n${ROW}\n${ROW}`,
    ]);
  });

  it('leaves free text without a header untouched at the top', () => {
    expect(splitInHalf('one\ntwo\nthree\nfour', false)).toEqual(['one\ntwo', 'three\nfour']);
  });

  it('gives back a single row unchanged', () => {
    expect(splitInHalf(buildCsv(1))).toEqual([buildCsv(1)]);
  });
});

describe('DataImportService.buildPlan — merging the parts of one file', () => {
  /** Big enough to need two requests against the local budget. */
  const LARGE_CSV = buildCsv(1_000);
  const LOCAL = 'http://localhost:11434/v1';

  /** One new asset plus a trade on it — the shape that used to collide. */
  const newAssetPlan = (summary: string) => ({
    sourceSummary: summary,
    operations: [
      {
        op: 'createAsset',
        ref: 'a1',
        name: 'Wipro',
        category: 'Stock',
        currency: 'INR',
        valueModel: 'MARKET_BASED',
      },
      {
        op: 'addTransaction',
        assetRef: 'a1',
        type: 'buy',
        totalAmount: 100,
        date: '2024-01-01',
      },
    ],
  });

  let prompts: string[];

  function serviceWith(chat: ChatFn) {
    prompts = [];
    const recording: ChatFn = args => {
      prompts.push(args.user);
      return chat(args);
    };
    return new DataImportService({ chat: recording, resolveBaseUrl: () => LOCAL });
  }

  beforeEach(() => {
    prompts = [];
  });

  it('keeps each part’s refs distinct, so trades cannot cross over to another part’s asset', async () => {
    const service = serviceWith(async () => newAssetPlan('a tradebook'));

    const plan = await service.buildPlan({ text: LARGE_CSV });

    const creates = plan.operations.filter(item => item.operation.op === 'createAsset');
    const trades = plan.operations.filter(item => item.operation.op === 'addTransaction');
    const refs = creates.map(item => (item.operation as { ref: string }).ref);

    expect(creates.length).toBeGreaterThan(1);
    expect(new Set(refs).size).toBe(refs.length);
    // Every trade attaches to a ref that exists, and no two trades share one.
    const linked = trades.map(item => (item.operation as { assetRef: string }).assetRef);
    expect(new Set(linked).size).toBe(linked.length);
    expect(linked.every(ref => refs.includes(ref))).toBe(true);
  });

  it('shows a later part the assets an earlier part already asked to create', async () => {
    const service = serviceWith(async () => newAssetPlan('a tradebook'));

    await service.buildPlan({ text: LARGE_CSV });

    expect(prompts.length).toBeGreaterThan(1);
    expect(prompts[0]).not.toContain('assetsBeingCreatedByThisImport');
    expect(prompts[1]).toContain('assetsBeingCreatedByThisImport');
    expect(prompts[1]).toContain('Wipro');
  });

  it('merges the distinct summaries the parts reported', async () => {
    let call = 0;
    const service = serviceWith(async () =>
      newAssetPlan(call++ === 0 ? 'first half' : 'second half')
    );

    const plan = await service.buildPlan({ text: LARGE_CSV });

    expect(plan.sourceSummary).toContain('first half');
    expect(plan.sourceSummary).toContain('second half');
  });

  it('keeps the parts that worked when one fails, and says which was lost', async () => {
    let call = 0;
    const service = serviceWith(async () => {
      if (call++ === 1) throw new LlmError('provider', 'Provider returned 429: slow down', 429);
      return newAssetPlan('a tradebook');
    });

    const plan = await service.buildPlan({ text: LARGE_CSV });

    expect(plan.operations.length).toBeGreaterThan(0);
    expect(plan.warnings.join(' ')).toContain('could not be analysed');
  });

  it('rethrows when every part failed, rather than reporting an empty plan', async () => {
    const service = serviceWith(async () => {
      throw new LlmError('provider', 'Provider returned 500: boom', 500);
    });

    await expect(service.buildPlan({ text: LARGE_CSV })).rejects.toThrow('boom');
  });

  it.each([
    ['a rejected key', new LlmError('provider', 'Provider returned 401: bad key', 401)],
    ['an unreachable host', new LlmError('network', 'Could not reach the provider')],
  ])('gives up immediately on %s instead of retrying every part', async (_label, thrown) => {
    const chat = vi.fn(async () => {
      throw thrown;
    });
    const service = serviceWith(chat);

    await expect(service.buildPlan({ text: LARGE_CSV })).rejects.toThrow(thrown.message);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('halves a part whose reply was cut off, and keeps the results of the halves', async () => {
    let truncations = 0;
    const service = serviceWith(async ({ user }) => {
      // Fail the first part once; its two halves then succeed.
      if (user.includes(ROW) && truncations < 1) {
        truncations++;
        throw new LlmError('truncated', 'The model’s reply was cut off before it finished.');
      }
      return newAssetPlan('a tradebook');
    });

    const plan = await service.buildPlan({ text: LARGE_CSV });

    expect(plan.operations.length).toBeGreaterThan(0);
    expect(plan.warnings.join(' ')).not.toContain('could not be analysed');
  });

  it('reports an empty file without calling the provider', async () => {
    const chat = vi.fn<ChatFn>(async () => ({ operations: [] }));
    const service = serviceWith(chat);

    const plan = await service.buildPlan({ text: '   ' });

    expect(plan.warnings).toEqual(['The file was empty.']);
    expect(chat).not.toHaveBeenCalled();
  });
});
