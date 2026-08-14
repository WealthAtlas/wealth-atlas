import { describe, expect, it } from 'vitest';
import { InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { Currency } from '../entities/shared/Currency';
import { ImportOperation, OperationFlag, ValidatedOperation } from './ImportOperation';
import {
  defaultSelection,
  selectAll,
  selectNone,
  toggleSelection,
  withoutOrphans,
} from './ImportSelection';

function item(operation: ImportOperation, flags: OperationFlag[] = []): ValidatedOperation {
  return { operation, flags, warnings: [], summary: '' };
}

const createAsset = (ref: string): ImportOperation => ({
  op: 'createAsset',
  ref,
  name: `Asset ${ref}`,
  category: 'Stock',
  currency: Currency.INR,
  valueModel: ValueModel.MARKET_BASED,
});

const tradeOnRef = (assetRef: string): ImportOperation => ({
  op: 'addTransaction',
  assetRef,
  type: InvestmentType.BUY,
  totalAmount: 100,
  date: '2024-03-15',
});

const tradeOnAsset = (assetId: number): ImportOperation => ({
  op: 'addTransaction',
  assetId,
  type: InvestmentType.BUY,
  totalAmount: 100,
  date: '2024-03-15',
});

const createLoan = (ref: string): ImportOperation => ({
  op: 'createLoan',
  ref,
  name: `Loan ${ref}`,
  principalAmount: 1000,
  currency: Currency.INR,
  startDate: '2024-01-01',
});

const paymentOnRef = (loanRef: string): ImportOperation => ({
  op: 'addLoanPayment',
  loanRef,
  amount: 500,
  date: '2024-03-15',
});

describe('defaultSelection', () => {
  it('ticks clean operations', () => {
    const operations = [item(createAsset('a1')), item(tradeOnRef('a1'))];

    expect(defaultSelection(operations)).toEqual([true, true]);
  });

  it('leaves a flagged operation unticked', () => {
    const operations = [item(tradeOnAsset(12), ['duplicate'])];

    expect(defaultSelection(operations)).toEqual([false]);
  });

  it('unticks a clean transaction whose create is flagged, rather than orphaning it', () => {
    const operations = [item(createAsset('a1'), ['unverified']), item(tradeOnRef('a1'))];

    expect(defaultSelection(operations)).toEqual([false, false]);
  });
});

describe('toggleSelection', () => {
  it('ticks the create when its transaction is ticked', () => {
    const operations = [item(createAsset('a1'), ['unverified']), item(tradeOnRef('a1'))];

    expect(toggleSelection(operations, [false, false], 1)).toEqual([true, true]);
  });

  it('unticks dependent transactions when the create is unticked', () => {
    const operations = [
      item(createAsset('a1')),
      item(tradeOnRef('a1')),
      item(tradeOnRef('a1')),
      item(tradeOnAsset(12)),
    ];

    expect(toggleSelection(operations, [true, true, true, true], 0)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('leaves the create alone when only one of its transactions is unticked', () => {
    const operations = [item(createAsset('a1')), item(tradeOnRef('a1')), item(tradeOnRef('a1'))];

    expect(toggleSelection(operations, [true, true, true], 1)).toEqual([true, false, true]);
  });

  it('does not link an asset and a loan that share a placeholder ref', () => {
    const operations = [
      item(createAsset('x')),
      item(createLoan('x')),
      item(paymentOnRef('x')),
      item(tradeOnRef('x')),
    ];

    // Unticking the asset create must not touch the loan payment.
    expect(toggleSelection(operations, [true, true, true, true], 0)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});

describe('withoutOrphans', () => {
  it('clears a transaction whose create is not selected', () => {
    const operations = [item(createAsset('a1')), item(tradeOnRef('a1'))];

    expect(withoutOrphans(operations, [false, true])).toEqual([false, false]);
  });

  it('keeps a transaction that points at an asset already in the database', () => {
    const operations = [item(tradeOnAsset(12))];

    expect(withoutOrphans(operations, [true])).toEqual([true]);
  });

  it('holds for select-all and select-none', () => {
    const operations = [item(createAsset('a1')), item(tradeOnRef('a1'))];

    expect(withoutOrphans(operations, selectAll(operations))).toEqual([true, true]);
    expect(withoutOrphans(operations, selectNone(operations))).toEqual([false, false]);
  });
});
