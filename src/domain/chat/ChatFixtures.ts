import { Asset, IAsset } from '../entities/assets/Asset';
import { Investment, InvestmentType } from '../entities/assets/Investment';
import { ISIP, SIP } from '../entities/assets/SIP';
import { ValueModel } from '../entities/assets/ValueModel';
import { Expense, IExpense } from '../entities/expenses/Expense';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { Allocation } from '../entities/goals/Allocation';
import { Goal } from '../entities/goals/Goal';
import { IEMI } from '../entities/loans/EMI';
import { ILoan, Loan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { CurrencyRate } from '../entities/shared/CurrencyRate';
import { ICategoryTarget } from '../entities/shared/Settings';
import { JournalSummary, summariseJournal } from '../journal/DecisionReview';
import { JournalEntryWithReview } from '../services/DecisionJournalService';
import { Frequency } from '../entities/shared/Frequency';
import { FundUniversePort, unavailableFundUniverse } from '../funds/FundUniversePort';
import { MarketDataPort, unavailableMarketData } from '../market/MarketDataPort';
import { NewsPort, unavailableNews } from '../news/NewsPort';
import { monthKey, utcMonthStart } from '../utils/DateUtils';
import { ChatToolContext, CodeRunner } from './ChatToolContext';

/**
 * Entity builders and an in-memory `ChatToolContext`, shared by the chat tests.
 *
 * Not a `.test.ts` file so it can be imported from several suites; it holds no
 * assertions of its own.
 */

export const USD_RATE = 88;

/** Fixed so date-derived output is stable regardless of when the suite runs. */
export const TODAY = new Date('2026-08-20T00:00:00.000Z');

export function converter(rates: Partial<Record<Currency, number>> = {}): CurrencyConverter {
  return new CurrencyConverter(
    Currency.INR,
    new Map(Object.entries(rates) as [Currency, number][])
  );
}

const ASSET: IAsset = {
  id: 1,
  name: 'Nifty Index Fund',
  description: 'core holding',
  category: 'Index Fund',
  currency: Currency.INR,
  valueModel: ValueModel.MARKET_BASED,
  interestRate: undefined,
  maturityDate: undefined,
  maturityAmount: undefined,
  manualValue: 150000,
  manualValueUpdatedAt: TODAY,
  script: undefined,
  scriptValue: undefined,
  scriptValueUpdatedAt: undefined,
};

export function asset(
  overrides: Partial<IAsset> & { invested?: number; sips?: SIP[] } = {}
): Asset {
  const { invested = 100000, sips = [], ...assetOverrides } = overrides;
  return new Asset({
    ...ASSET,
    ...assetOverrides,
    investments: [
      new Investment({
        id: undefined,
        assetId: assetOverrides.id ?? ASSET.id!,
        type: InvestmentType.BUY,
        quantity: 100,
        totalAmount: invested,
        date: new Date('2025-08-20'),
      }),
    ],
    sips,
  });
}

export function sip(overrides: Partial<ISIP> = {}): SIP {
  return new SIP({
    id: 1,
    assetId: 1,
    quantity: undefined,
    price: 5000,
    frequency: Frequency.MONTHLY,
    startDate: new Date('2026-08-25'),
    endDate: new Date('2027-08-25'),
    lastGeneratedDate: undefined,
    ...overrides,
  });
}

const EXPENSE: IExpense = {
  id: 1,
  amount: 4000,
  currency: Currency.INR,
  date: new Date('2026-08-05'),
  category: 'Groceries',
  isEssential: true,
  description: 'weekly shop',
};

export function expense(overrides: Partial<IExpense> = {}): Expense {
  return new Expense({ ...EXPENSE, ...overrides });
}

/** Groups expenses the way `ExpenseService.getMonthlyExpenses` does. */
export function months(expenses: Expense[]): MonthlyExpense[] {
  const byMonth = new Map<string, MonthlyExpense>();
  for (const item of expenses) {
    const key = monthKey(item.date);
    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = new MonthlyExpense(utcMonthStart(item.date), []);
      byMonth.set(key, bucket);
    }
    bucket.expenses.push(item);
  }
  return Array.from(byMonth.values()).sort((a, b) => b.month.getTime() - a.month.getTime());
}

export function loan(
  overrides: {
    id?: number;
    name?: string;
    currency?: Currency;
    principalAmount?: number;
    emiAmount?: number;
    emiEndDate?: Date;
    payments?: IPayment[];
  } = {}
): Loan {
  const {
    id = 1,
    name = 'Home Loan',
    currency = Currency.INR,
    principalAmount = 1000000,
    emiAmount = 25000,
    emiEndDate = new Date('2027-01-01'),
    payments = [],
  } = overrides;

  const base: ILoan = {
    id,
    name,
    description: '',
    principalAmount,
    currency,
    startDate: new Date('2024-01-01'),
  };
  const emi: IEMI = {
    id: 1,
    loanId: id,
    name: 'Monthly EMI',
    amount: emiAmount,
    frequency: Frequency.MONTHLY,
    startDate: new Date('2026-08-25'),
    endDate: emiEndDate,
    lastGeneratedDate: undefined,
  };
  return new Loan({ ...base, payments, emis: [emi] });
}

export function goal(
  overrides: {
    id?: number;
    name?: string;
    targetAmount?: number;
    currency?: Currency;
    inflationRate?: number;
    maturityDate?: Date;
    allocations?: { asset: Asset; percentage: number }[];
  } = {}
): Goal {
  const {
    id = 1,
    name = 'Retirement',
    targetAmount = 500000,
    currency = Currency.INR,
    inflationRate = 0.06,
    maturityDate = new Date('2036-01-01'),
    allocations = [],
  } = overrides;

  return new Goal({
    id,
    name,
    targetAmount,
    maturityDate,
    inflationRate,
    currency,
    createdAt: new Date('2024-01-01'),
    assetAllocations: allocations.map(
      (allocation, index) =>
        new Allocation({
          id: index + 1,
          assetId: allocation.asset.id!,
          goalId: id,
          allocationPercentage: allocation.percentage,
          asset: allocation.asset,
        })
    ),
  });
}

export function rate(code: Currency, perUnitInBase: number | undefined): CurrencyRate {
  return new CurrencyRate({
    id: 1,
    code,
    manualPerUnitInBase: perUnitInBase,
    manualUpdatedAt: perUnitInBase === undefined ? undefined : TODAY,
    script: undefined,
    scriptPerUnitInBase: undefined,
    scriptUpdatedAt: undefined,
  });
}

/**
 * An in-memory tool context. Records how often each loader ran, so a test can
 * assert the memoisation that keeps repeated tool calls off the database.
 */
export interface FakeChatToolContext extends ChatToolContext {
  loadCounts: Record<string, number>;
}

export function fakeContext(
  data: {
    assets?: Asset[];
    loans?: Loan[];
    goals?: Goal[];
    monthlyExpenses?: MonthlyExpense[];
    sipsByAsset?: Record<number, SIP[]>;
    rates?: CurrencyRate[];
    targetAllocation?: ICategoryTarget[];
    decisionJournal?: { entries: JournalEntryWithReview[]; summary: JournalSummary };
    converter?: CurrencyConverter;
    today?: Date;
    /** Defaults to a runner that refuses, so a test opts in to code execution. */
    runCode?: CodeRunner;
    /** Defaults to reporting everything unavailable, so a test opts in. */
    market?: MarketDataPort;
    news?: NewsPort;
    funds?: FundUniversePort;
  } = {}
): FakeChatToolContext {
  const loadCounts: Record<string, number> = {
    assets: 0,
    loans: 0,
    goals: 0,
    monthlyExpenses: 0,
    sipsOf: 0,
    rates: 0,
    targetAllocation: 0,
    decisionJournal: 0,
  };

  return {
    loadCounts,
    assets: async () => {
      loadCounts.assets++;
      return data.assets ?? [];
    },
    loans: async () => {
      loadCounts.loans++;
      return data.loans ?? [];
    },
    goals: async () => {
      loadCounts.goals++;
      return data.goals ?? [];
    },
    monthlyExpenses: async () => {
      loadCounts.monthlyExpenses++;
      return data.monthlyExpenses ?? [];
    },
    sipsOf: async assetId => {
      loadCounts.sipsOf++;
      return data.sipsByAsset?.[assetId] ?? [];
    },
    rates: async () => {
      loadCounts.rates++;
      return data.rates ?? [];
    },
    targetAllocation: async () => {
      loadCounts.targetAllocation++;
      return data.targetAllocation ?? [];
    },
    decisionJournal: async () => {
      loadCounts.decisionJournal++;
      return data.decisionJournal ?? { entries: [], summary: summariseJournal([]) };
    },
    converter: data.converter ?? converter(),
    today: data.today ?? TODAY,
    runCode:
      data.runCode ??
      (async () => ({ ok: false, error: 'No code runner in this test.', logs: [] })),
    market: data.market ?? unavailableMarketData('no market data in this test'),
    news: data.news ?? unavailableNews('no news provider in this test'),
    funds: data.funds ?? unavailableFundUniverse('no fund list in this test'),
  };
}
