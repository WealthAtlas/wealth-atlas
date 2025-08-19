export enum ExpenseCategory {
  GROCERIES = 'groceries',
  TRANSPORTATION = 'transportation',
  HEALTHCARE = 'healthcare',
  UTILITIES = 'utilities',
  ENTERTAINMENT = 'entertainment',
  DINING_OUT = 'dining_out',
  SHOPPING = 'shopping',
  EDUCATION = 'education',
  TRAVEL = 'travel',
  OTHER = 'other',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.GROCERIES]: 'Groceries',
  [ExpenseCategory.TRANSPORTATION]: 'Transportation',
  [ExpenseCategory.HEALTHCARE]: 'Healthcare',
  [ExpenseCategory.UTILITIES]: 'Utilities',
  [ExpenseCategory.ENTERTAINMENT]: 'Entertainment',
  [ExpenseCategory.DINING_OUT]: 'Dining Out',
  [ExpenseCategory.SHOPPING]: 'Shopping',
  [ExpenseCategory.EDUCATION]: 'Education',
  [ExpenseCategory.TRAVEL]: 'Travel',
  [ExpenseCategory.OTHER]: 'Other',
};
