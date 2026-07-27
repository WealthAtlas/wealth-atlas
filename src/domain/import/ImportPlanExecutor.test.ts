import { describe, expect, it, vi } from 'vitest';
import { IAsset } from '../entities/assets/Asset';
import { IInvestment, InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { IExpense } from '../entities/expenses/Expense';
import { ILoan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { AssetService } from '../services/AssetService';
import { ExpenseService } from '../services/ExpenseService';
import { LoanService } from '../services/LoanService';
import { ImportOperation } from './ImportOperation';
import { applyImportPlan, ImportOperationError, ImportServices } from './ImportPlanExecutor';

/**
 * The executor is exercised against stub services — the point is the mapping
 * and ordering, not Dexie.
 */
function makeServices() {
  const createdAssets: IAsset[] = [];
  const createdInvestments: IInvestment[] = [];
  const createdExpenses: IExpense[] = [];
  const createdLoans: ILoan[] = [];
  const createdPayments: IPayment[] = [];
  const updatedAssets: IAsset[] = [];
  const deletedAssetIds: number[] = [];

  let nextAssetId = 100;
  let nextLoanId = 200;

  const assetService = {
    createAsset: vi.fn(async (asset: IAsset) => {
      const created = { ...asset, id: nextAssetId++ };
      createdAssets.push(created);
      return created;
    }),
    updateAsset: vi.fn(async (asset: IAsset) => {
      updatedAssets.push(asset);
      return asset;
    }),
    deleteAsset: vi.fn(async (id: number) => {
      deletedAssetIds.push(id);
    }),
    getAssetById: vi.fn(async (id: number) => ({
      id,
      name: 'Existing',
      description: 'desc',
      category: 'Stock',
      currency: 'INR',
      valueModel: ValueModel.MARKET_BASED,
      interestRate: undefined,
      maturityDate: undefined,
      maturityAmount: undefined,
      manualValue: 1000,
      manualValueUpdatedAt: new Date('2024-01-01'),
      script: undefined,
      scriptValue: undefined,
      scriptValueUpdatedAt: undefined,
    })),
    addInvestment: vi.fn(async (investment: IInvestment) => {
      createdInvestments.push(investment);
      return investment;
    }),
    deleteInvestment: vi.fn(async () => {}),
  } as unknown as AssetService;

  const expenseService = {
    createExpense: vi.fn(async (expense: IExpense) => {
      createdExpenses.push(expense);
      return expense;
    }),
    getExpenseById: vi.fn(async (id: number) => ({
      id,
      amount: 100,
      currency: 'INR',
      date: new Date('2024-01-01'),
      category: 'Groceries',
      isEssential: true,
      description: 'old',
    })),
    updateExpense: vi.fn(async (expense: IExpense) => expense),
    deleteExpense: vi.fn(async () => {}),
  } as unknown as ExpenseService;

  const loanService = {
    createLoan: vi.fn(async (loan: ILoan) => {
      const created = { ...loan, id: nextLoanId++ };
      createdLoans.push(created);
      return created;
    }),
    createPayment: vi.fn(async (payment: IPayment) => {
      createdPayments.push(payment);
      return payment;
    }),
    deletePayment: vi.fn(async () => {}),
  } as unknown as LoanService;

  const services: ImportServices = { assetService, expenseService, loanService };

  return {
    services,
    createdAssets,
    createdInvestments,
    createdExpenses,
    createdLoans,
    createdPayments,
    updatedAssets,
    deletedAssetIds,
  };
}

describe('applyImportPlan — ref resolution', () => {
  it('creates the asset first even when the transaction is listed before it', async () => {
    const harness = makeServices();

    const operations: ImportOperation[] = [
      {
        op: 'addTransaction',
        assetRef: 'wipro',
        type: InvestmentType.BUY,
        quantity: 20,
        totalAmount: 9000,
        date: '2024-03-20',
      },
      {
        op: 'createAsset',
        ref: 'wipro',
        name: 'Wipro',
        category: 'Stock',
        currency: 'INR' as never,
        valueModel: ValueModel.MARKET_BASED,
      },
    ];

    const result = await applyImportPlan(operations, harness.services);

    expect(result.applied).toBe(2);
    expect(harness.createdAssets).toHaveLength(1);
    expect(harness.createdInvestments[0].assetId).toBe(harness.createdAssets[0].id);
  });

  it('resolves a loan ref the same way', async () => {
    const harness = makeServices();

    const operations: ImportOperation[] = [
      { op: 'addLoanPayment', loanRef: 'car', amount: 15000, date: '2024-04-01' },
      {
        op: 'createLoan',
        ref: 'car',
        name: 'Car Loan',
        principalAmount: 600000,
        currency: 'INR' as never,
        startDate: '2023-01-01',
      },
    ];

    await applyImportPlan(operations, harness.services);

    expect(harness.createdPayments[0].loanId).toBe(harness.createdLoans[0].id);
  });

  it('fails loudly when a ref cannot be resolved', async () => {
    const harness = makeServices();

    const operations: ImportOperation[] = [
      {
        op: 'addTransaction',
        assetRef: 'ghost',
        type: InvestmentType.BUY,
        totalAmount: 100,
        date: '2024-03-20',
      },
    ];

    await expect(applyImportPlan(operations, harness.services)).rejects.toBeInstanceOf(
      ImportOperationError
    );
  });
});

describe('applyImportPlan — field mapping', () => {
  it('stores sells positive, with direction in the type', async () => {
    const harness = makeServices();

    await applyImportPlan(
      [
        {
          op: 'addTransaction',
          assetId: 12,
          type: InvestmentType.SELL,
          quantity: 5,
          totalAmount: 19451,
          date: '2024-03-18',
        },
      ],
      harness.services
    );

    const investment = harness.createdInvestments[0];
    expect(investment.type).toBe(InvestmentType.SELL);
    expect(investment.totalAmount).toBe(19451);
    expect(investment.quantity).toBe(5);
  });

  it('converts YYYY-MM-DD strings into real Date objects', async () => {
    const harness = makeServices();

    await applyImportPlan(
      [
        {
          op: 'addTransaction',
          assetId: 12,
          type: InvestmentType.BUY,
          totalAmount: 100,
          date: '2024-03-15',
        },
      ],
      harness.services
    );

    const { date } = harness.createdInvestments[0];
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe('2024-03-15T00:00:00.000Z');
  });

  it('stamps manualValueUpdatedAt when an update sets a value', async () => {
    const harness = makeServices();

    await applyImportPlan(
      [{ op: 'updateAsset', assetId: 12, changes: { manualValue: 5000 } }],
      harness.services
    );

    const updated = harness.updatedAssets[0];
    expect(updated.manualValue).toBe(5000);
    expect(updated.manualValueUpdatedAt?.getTime()).toBeGreaterThan(
      new Date('2024-01-01').getTime()
    );
  });

  it('leaves untouched fields as they were on an update', async () => {
    const harness = makeServices();

    await applyImportPlan(
      [{ op: 'updateAsset', assetId: 12, changes: { manualValue: 5000 } }],
      harness.services
    );

    expect(harness.updatedAssets[0].name).toBe('Existing');
    expect(harness.updatedAssets[0].category).toBe('Stock');
  });

  it('skips the per-asset value script so a bulk create stays cheap', async () => {
    const harness = makeServices();

    await applyImportPlan(
      [
        {
          op: 'createAsset',
          ref: 'a',
          name: 'A',
          category: 'Stock',
          currency: 'INR' as never,
          valueModel: ValueModel.MARKET_BASED,
        },
      ],
      harness.services
    );

    expect(harness.services.assetService.createAsset).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skipValueUpdate: true })
    );
  });

  it('passes expenses through with their currency code intact', async () => {
    const harness = makeServices();

    await applyImportPlan(
      [
        {
          op: 'addExpense',
          amount: 450,
          currency: 'GBP' as never,
          date: '2024-02-01',
          category: 'Groceries',
          isEssential: true,
          description: 'Shop',
        },
      ],
      harness.services
    );

    expect(harness.createdExpenses[0].currency).toBe('GBP');
    expect(harness.createdExpenses[0].date).toBeInstanceOf(Date);
  });
});

describe('applyImportPlan — failure handling', () => {
  it('aborts the batch and names the offending operation', async () => {
    const harness = makeServices();
    vi.mocked(harness.services.assetService.deleteAsset).mockRejectedValueOnce(
      new Error('row is gone')
    );

    const operations: ImportOperation[] = [
      {
        op: 'addTransaction',
        assetId: 12,
        type: InvestmentType.BUY,
        totalAmount: 100,
        date: '2024-03-15',
      },
      { op: 'deleteAsset', assetId: 99 },
    ];

    await expect(applyImportPlan(operations, harness.services)).rejects.toThrow(/deleteAsset/);
  });

  it('reports how many operations were applied on success', async () => {
    const harness = makeServices();

    const result = await applyImportPlan(
      [
        { op: 'deleteExpense', expenseId: 1 },
        { op: 'deleteExpense', expenseId: 2 },
      ],
      harness.services
    );

    expect(result).toEqual({ applied: 2, skipped: 0 });
  });
});
