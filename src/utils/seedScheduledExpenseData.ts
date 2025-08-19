import { ScheduledExpenseRepository } from '@/data/repositories/ScheduledExpenseRepository';
import { ExpenseCategory } from '@/domain/entities/expenses/ExpenseCategory';
import { ScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';
import { PaymentFrequency } from '@/domain/entities/loans/PaymentFrequency';

export async function seedScheduledExpenseData() {
  const scheduledExpenseRepository = new ScheduledExpenseRepository();

  // Check if data already exists
  const existingScheduledExpenses = await scheduledExpenseRepository.findAll();
  if (existingScheduledExpenses.length > 0) {
    console.log('Scheduled expense data already exists, skipping seed');
    return;
  }

  const sampleScheduledExpenses = [
    // Monthly rent
    new ScheduledExpense(
      undefined,
      'Monthly Rent',
      1200,
      'USD',
      ExpenseCategory.UTILITIES,
      true,
      PaymentFrequency.MONTHLY,
      new Date('2025-01-01'),
      undefined, // No end date - ongoing
      undefined,
      'Monthly apartment rent payment'
    ),

    // Netflix subscription
    new ScheduledExpense(
      undefined,
      'Netflix Subscription',
      15.99,
      'USD',
      ExpenseCategory.ENTERTAINMENT,
      false,
      PaymentFrequency.MONTHLY,
      new Date('2025-01-15'),
      undefined,
      undefined,
      'Monthly streaming service'
    ),

    // Weekly groceries
    new ScheduledExpense(
      undefined,
      'Weekly Groceries',
      150,
      'USD',
      ExpenseCategory.GROCERIES,
      true,
      PaymentFrequency.WEEKLY,
      new Date('2025-08-01'),
      undefined,
      undefined,
      'Weekly grocery shopping'
    ),

    // Annual insurance premium
    new ScheduledExpense(
      undefined,
      'Car Insurance Premium',
      600,
      'USD',
      ExpenseCategory.TRANSPORTATION,
      true,
      PaymentFrequency.YEARLY,
      new Date('2025-01-01'),
      new Date('2030-01-01'), // 5 years
      undefined,
      'Annual car insurance payment'
    ),

    // Daily coffee
    new ScheduledExpense(
      undefined,
      'Daily Coffee',
      5,
      'USD',
      ExpenseCategory.DINING_OUT,
      false,
      PaymentFrequency.DAILY,
      new Date('2025-08-01'),
      new Date('2025-12-31'), // Until end of year
      undefined,
      'Morning coffee on weekdays'
    ),

    // Quarterly gym membership
    new ScheduledExpense(
      undefined,
      'Gym Membership',
      120,
      'USD',
      ExpenseCategory.HEALTHCARE,
      false,
      PaymentFrequency.QUARTERLY,
      new Date('2025-01-01'),
      undefined,
      undefined,
      'Quarterly gym membership fee'
    ),
  ];

  console.log('Seeding scheduled expense data...');
  for (const scheduledExpense of sampleScheduledExpenses) {
    try {
      await scheduledExpenseRepository.save(scheduledExpense);
    } catch (error) {
      console.error('Failed to seed scheduled expense:', scheduledExpense.name, error);
    }
  }
  console.log('Scheduled expense data seeded successfully');
}
