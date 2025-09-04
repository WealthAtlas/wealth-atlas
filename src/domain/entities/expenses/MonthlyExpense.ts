import { Currency } from '../shared/Currency';
import { Expense } from './Expense';

export class MonthlyExpense {
  constructor(
    public month: Date,
    public expenses: Expense[]
  ) {}

  // Multi-currency support methods
  getExpensesByCurrency(): Map<Currency, Expense[]> {
    const currencyMap = new Map<Currency, Expense[]>();

    this.expenses.forEach(expense => {
      const existingExpenses = currencyMap.get(expense.currency) || [];
      currencyMap.set(expense.currency, [...existingExpenses, expense]);
    });

    return currencyMap;
  }

  getTotalAmountByCurrency(currency: Currency): number {
    return this.expenses
      .filter(expense => expense.currency === currency)
      .reduce((total, expense) => total + expense.amount, 0);
  }

  getEssentialAmountByCurrency(currency: Currency): number {
    return this.expenses
      .filter(expense => expense.currency === currency && expense.isEssential)
      .reduce((total, expense) => total + expense.amount, 0);
  }

  getNonEssentialAmountByCurrency(currency: Currency): number {
    return this.expenses
      .filter(expense => expense.currency === currency && !expense.isEssential)
      .reduce((total, expense) => total + expense.amount, 0);
  }

  getUniqueCurrencies(): Currency[] {
    const currencies = new Set(this.expenses.map(expense => expense.currency));
    return Array.from(currencies);
  }

  hasMultipleCurrencies(): boolean {
    return this.getUniqueCurrencies().length > 1;
  }

  // Category-related methods
  getCategoriesByCurrency(currency: Currency): string[] {
    const categories = new Set(
      this.expenses
        .filter(expense => expense.currency === currency)
        .map(expense => expense.category)
    );
    return Array.from(categories);
  }

  getCategoryTotalByCurrency(currency: Currency, category: string): number {
    return this.expenses
      .filter(expense => expense.currency === currency && expense.category === category)
      .reduce((total, expense) => total + expense.amount, 0);
  }

  getAllCategories(): string[] {
    const categories = new Set(this.expenses.map(expense => expense.category));
    return Array.from(categories);
  }
}
