import { ExpenseRepository } from '../data/repositories/ExpenseRepository';
import { Expense } from '../domain/entities/Expense';
import { ExpenseCategory } from '../domain/entities/ExpenseCategory';

export async function seedExpenseData() {
  const expenseRepository = new ExpenseRepository();

  // Check if data already exists
  const existingExpenses = await expenseRepository.findAll();
  if (existingExpenses.length > 0) {
    console.log('Expense data already exists, skipping seed');
    return;
  }

  const sampleExpenses = [
    // August 2025 expenses
    new Expense({
      amount: 250,
      currency: 'USD',
      date: new Date('2025-08-15'),
      category: ExpenseCategory.GROCERIES,
      isEssential: true,
      description: 'Weekly grocery shopping',
    }),
    new Expense({
      amount: 45,
      currency: 'USD',
      date: new Date('2025-08-14'),
      category: ExpenseCategory.DINING_OUT,
      isEssential: false,
      description: 'Lunch with colleagues',
    }),
    new Expense({
      amount: 85,
      currency: 'USD',
      date: new Date('2025-08-13'),
      category: ExpenseCategory.TRANSPORTATION,
      isEssential: true,
      description: 'Monthly bus pass',
    }),
    new Expense({
      amount: 12000,
      currency: 'INR',
      date: new Date('2025-08-12'),
      category: ExpenseCategory.UTILITIES,
      isEssential: true,
      description: 'Electricity bill',
    }),
    new Expense({
      amount: 75,
      currency: 'USD',
      date: new Date('2025-08-10'),
      category: ExpenseCategory.ENTERTAINMENT,
      isEssential: false,
      description: 'Movie tickets',
    }),

    // July 2025 expenses
    new Expense({
      amount: 200,
      currency: 'USD',
      date: new Date('2025-07-28'),
      category: ExpenseCategory.GROCERIES,
      isEssential: true,
      description: 'Monthly grocery shopping',
    }),
    new Expense({
      amount: 8000,
      currency: 'INR',
      date: new Date('2025-07-25'),
      category: ExpenseCategory.HEALTHCARE,
      isEssential: true,
      description: 'Doctor consultation',
    }),
    new Expense({
      amount: 120,
      currency: 'USD',
      date: new Date('2025-07-20'),
      category: ExpenseCategory.SHOPPING,
      isEssential: false,
      description: 'New clothes',
    }),

    // June 2025 expenses
    new Expense({
      amount: 180,
      currency: 'USD',
      date: new Date('2025-06-15'),
      category: ExpenseCategory.GROCERIES,
      isEssential: true,
      description: 'Grocery shopping',
    }),
    new Expense({
      amount: 15000,
      currency: 'INR',
      date: new Date('2025-06-10'),
      category: ExpenseCategory.TRAVEL,
      isEssential: false,
      description: 'Weekend trip',
    }),
  ];

  try {
    for (const expense of sampleExpenses) {
      await expenseRepository.save(expense);
    }
    console.log('Sample expense data seeded successfully');
  } catch (error) {
    console.error('Failed to seed expense data:', error);
  }
}
