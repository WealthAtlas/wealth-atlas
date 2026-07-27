import { IAsset } from '../entities/assets/Asset';
import { IInvestment } from '../entities/assets/Investment';
import { IExpense } from '../entities/expenses/Expense';
import { ILoan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { AssetService } from '../services/AssetService';
import { ExpenseService } from '../services/ExpenseService';
import { LoanService } from '../services/LoanService';
import { Logger } from '../utils/Logger';
import { ImportOperation, ImportResult } from './ImportOperation';

/**
 * Applies an approved plan through the domain services — never repositories.
 *
 * Two passes so that a transaction can attach to an asset created in the same
 * plan. The caller wraps this in a single Dexie transaction, so a failure
 * halfway through rolls the whole batch back rather than leaving a partially
 * imported portfolio.
 */

export interface ImportServices {
  assetService: AssetService;
  expenseService: ExpenseService;
  loanService: LoanService;
}

export class ImportOperationError extends Error {
  constructor(
    public readonly operation: ImportOperation,
    public readonly cause: unknown
  ) {
    super(
      `Failed to apply "${operation.op}": ${cause instanceof Error ? cause.message : String(cause)}`
    );
    this.name = 'ImportOperationError';
  }
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isCreate(operation: ImportOperation): boolean {
  return operation.op === 'createAsset' || operation.op === 'createLoan';
}

export async function applyImportPlan(
  operations: ImportOperation[],
  services: ImportServices
): Promise<ImportResult> {
  const { assetService, expenseService, loanService } = services;

  const assetIdByRef = new Map<string, number>();
  const loanIdByRef = new Map<string, number>();

  // Creates first, so refs resolve for everything that follows.
  const ordered = [...operations.filter(isCreate), ...operations.filter(op => !isCreate(op))];

  let applied = 0;

  for (const operation of ordered) {
    try {
      switch (operation.op) {
        case 'createAsset': {
          const asset: IAsset = {
            id: undefined,
            name: operation.name,
            description: operation.description ?? '',
            category: operation.category,
            currency: operation.currency,
            valueModel: operation.valueModel,
            interestRate: operation.interestRate,
            maturityDate: operation.maturityDate ? toDate(operation.maturityDate) : undefined,
            maturityAmount: operation.maturityAmount,
            manualValue: operation.manualValue,
            manualValueUpdatedAt: operation.manualValue !== undefined ? new Date() : undefined,
            script: undefined,
            scriptValue: undefined,
            scriptValueUpdatedAt: undefined,
          };
          // Value scripts are skipped here and run once after the batch.
          const created = await assetService.createAsset(asset, { skipValueUpdate: true });
          assetIdByRef.set(operation.ref, created.id!);
          break;
        }

        case 'updateAsset': {
          const existing = await assetService.getAssetById(operation.assetId);
          const { changes } = operation;
          const updated: IAsset = {
            id: existing.id,
            name: changes.name ?? existing.name,
            description: changes.description ?? existing.description,
            category: changes.category ?? existing.category,
            currency: existing.currency,
            valueModel: existing.valueModel,
            interestRate: changes.interestRate ?? existing.interestRate,
            maturityDate: changes.maturityDate
              ? toDate(changes.maturityDate)
              : existing.maturityDate,
            maturityAmount: changes.maturityAmount ?? existing.maturityAmount,
            manualValue: changes.manualValue ?? existing.manualValue,
            manualValueUpdatedAt:
              changes.manualValue !== undefined ? new Date() : existing.manualValueUpdatedAt,
            script: existing.script,
            scriptValue: existing.scriptValue,
            scriptValueUpdatedAt: existing.scriptValueUpdatedAt,
          };
          await assetService.updateAsset(updated);
          break;
        }

        case 'deleteAsset':
          await assetService.deleteAsset(operation.assetId);
          break;

        case 'addTransaction': {
          const assetId =
            operation.assetId ??
            (operation.assetRef ? assetIdByRef.get(operation.assetRef) : undefined);
          if (assetId === undefined) {
            throw new Error(`Could not resolve asset for ref "${operation.assetRef ?? ''}"`);
          }
          const investment: IInvestment = {
            id: undefined,
            assetId,
            type: operation.type,
            quantity: operation.quantity,
            totalAmount: operation.totalAmount,
            date: toDate(operation.date),
          };
          await assetService.addInvestment(investment);
          break;
        }

        case 'deleteTransaction':
          await assetService.deleteInvestment(operation.investmentId);
          break;

        case 'addExpense': {
          const expense: IExpense = {
            id: undefined,
            amount: operation.amount,
            currency: operation.currency,
            date: toDate(operation.date),
            category: operation.category,
            isEssential: operation.isEssential,
            description: operation.description,
          };
          await expenseService.createExpense(expense);
          break;
        }

        case 'updateExpense': {
          const existing = await expenseService.getExpenseById(operation.expenseId);
          const { changes } = operation;
          await expenseService.updateExpense({
            id: existing.id,
            amount: changes.amount ?? existing.amount,
            currency: changes.currency ?? existing.currency,
            date: changes.date ? toDate(changes.date) : existing.date,
            category: changes.category ?? existing.category,
            isEssential: changes.isEssential ?? existing.isEssential,
            description: changes.description ?? existing.description,
          });
          break;
        }

        case 'deleteExpense':
          await expenseService.deleteExpense(operation.expenseId);
          break;

        case 'createLoan': {
          const loan: ILoan = {
            id: undefined,
            name: operation.name,
            description: operation.description ?? '',
            principalAmount: operation.principalAmount,
            currency: operation.currency,
            startDate: toDate(operation.startDate),
          };
          const created = await loanService.createLoan(loan);
          loanIdByRef.set(operation.ref, created.id!);
          break;
        }

        case 'addLoanPayment': {
          const loanId =
            operation.loanId ??
            (operation.loanRef ? loanIdByRef.get(operation.loanRef) : undefined);
          if (loanId === undefined) {
            throw new Error(`Could not resolve loan for ref "${operation.loanRef ?? ''}"`);
          }
          const payment: IPayment = {
            id: undefined,
            loanId,
            date: toDate(operation.date),
            amount: operation.amount,
            description: operation.description ?? '',
          };
          await loanService.createPayment(payment);
          break;
        }

        case 'deleteLoanPayment':
          await loanService.deletePayment(operation.paymentId);
          break;

        default: {
          // Exhaustiveness guard — a new op type must be handled here.
          const unreachable: never = operation;
          throw new Error(`Unhandled operation: ${JSON.stringify(unreachable)}`);
        }
      }

      applied++;
    } catch (error) {
      Logger.error('Import operation failed, rolling back:', operation, error);
      throw new ImportOperationError(operation, error);
    }
  }

  return { applied, skipped: 0 };
}
