import { AssetTransactionRepository } from '../../data/repositories/AssetTransactionRepository';
import { ScheduledAssetTransactionRepository } from '../../data/repositories/ScheduledAssetTransactionRepository';
import { AssetTransaction } from '../entities/assets/AssetTransaction';
import { INVESTMENT_FREQUENCY_MONTHS } from '../entities/assets/InvestmentFrequency';
import { ScheduledAssetTransaction } from '../entities/assets/ScheduledAssetTransaction';

export class InvestmentScheduleService {
  constructor(
    private scheduledTransactionRepository: ScheduledAssetTransactionRepository,
    private assetTransactionRepository: AssetTransactionRepository
  ) {}

  // Auto-convert scheduled SIP transactions to actual transactions (main method for app initialization)
  async autoConvertScheduledTransactions(): Promise<void> {
    const scheduledTransactions = await this.scheduledTransactionRepository.findActive();
    const today = new Date();

    for (const scheduled of scheduledTransactions) {
      const newTransactions = await this.generateTransactionsForSchedule(scheduled, today);

      if (newTransactions.length > 0) {
        // Save new transactions
        for (const transaction of newTransactions) {
          await this.assetTransactionRepository.save(transaction);
        }

        // Mark as executed if we've reached the end
        if (this.shouldMarkAsExecuted(scheduled, today)) {
          const updatedScheduled = new ScheduledAssetTransaction(
            scheduled.id,
            scheduled.assetId,
            scheduled.transactionType,
            scheduled.quantity,
            scheduled.price,
            scheduled.scheduledDate,
            scheduled.frequency,
            scheduled.endDate,
            scheduled.totalOccurrences,
            scheduled.isActive,
            true, // Mark as executed
            undefined // executedTransactionId (could link to last transaction if needed)
          );
          await this.scheduledTransactionRepository.save(updatedScheduled);
        }
      }
    }
  }

  // Generate transactions for a specific schedule up to a given date
  private async generateTransactionsForSchedule(
    scheduled: ScheduledAssetTransaction,
    upToDate: Date
  ): Promise<AssetTransaction[]> {
    const transactions: AssetTransaction[] = [];
    let currentDate = new Date(scheduled.scheduledDate);
    const frequencyMonths = INVESTMENT_FREQUENCY_MONTHS[scheduled.frequency];
    let occurrenceCount = 0;

    // Get existing transactions to avoid duplicates
    const existingTransactions = await this.assetTransactionRepository.findByAssetId(
      scheduled.assetId!
    );
    const existingDates = new Set(
      existingTransactions
        .filter(t => this.isSimilarTransaction(t, scheduled))
        .map(t => this.formatDate(t.date))
    );

    while (this.shouldGenerateTransaction(scheduled, currentDate, upToDate, occurrenceCount)) {
      const dateKey = this.formatDate(currentDate);

      // Only create transaction if it doesn't already exist
      if (!existingDates.has(dateKey)) {
        const transaction = new AssetTransaction(
          undefined, // ID will be assigned by repository
          scheduled.assetId,
          scheduled.transactionType,
          scheduled.quantity,
          scheduled.price,
          new Date(currentDate)
        );
        transactions.push(transaction);
      }

      // Move to next scheduled date
      currentDate.setMonth(currentDate.getMonth() + frequencyMonths);
      occurrenceCount++;
    }

    return transactions;
  }

  // Check if an existing transaction is similar to the scheduled one (to avoid duplicates)
  private isSimilarTransaction(
    transaction: AssetTransaction,
    scheduled: ScheduledAssetTransaction
  ): boolean {
    return (
      transaction.transactionType === scheduled.transactionType &&
      Math.abs(transaction.price - scheduled.price) < 0.01 && // Allow small price differences
      transaction.date >= scheduled.scheduledDate
    );
  }

  private shouldGenerateTransaction(
    scheduled: ScheduledAssetTransaction,
    currentDate: Date,
    upToDate: Date,
    occurrenceCount: number
  ): boolean {
    // Check if current date is beyond upToDate
    if (currentDate > upToDate) return false;

    // Check if we've reached total occurrences limit
    if (scheduled.totalOccurrences && occurrenceCount >= scheduled.totalOccurrences) return false;

    // Check if we've reached end date
    if (scheduled.endDate && currentDate > scheduled.endDate) return false;

    return true;
  }

  private shouldMarkAsExecuted(scheduled: ScheduledAssetTransaction, today: Date): boolean {
    // Mark as executed if:
    // 1. We've reached the end date, OR
    // 2. We've reached the total occurrences, OR
    // 3. The scheduled transaction is no longer active

    if (scheduled.endDate && today >= scheduled.endDate) return true;

    if (scheduled.totalOccurrences) {
      // Calculate how many occurrences should have happened by now
      const frequencyMonths = INVESTMENT_FREQUENCY_MONTHS[scheduled.frequency];
      const monthsDiff = this.getMonthsDifference(scheduled.scheduledDate, today);
      const expectedOccurrences = Math.floor(monthsDiff / frequencyMonths) + 1;

      if (expectedOccurrences >= scheduled.totalOccurrences) return true;
    }

    return false;
  }

  // Auto-convert after creating or editing a scheduled transaction
  async autoConvertAfterScheduleChange(scheduledId: number): Promise<void> {
    const scheduled = await this.scheduledTransactionRepository.findById(scheduledId);
    if (!scheduled) return;

    const today = new Date();
    const newTransactions = await this.generateTransactionsForSchedule(scheduled, today);

    if (newTransactions.length > 0) {
      for (const transaction of newTransactions) {
        await this.assetTransactionRepository.save(transaction);
      }

      // Check if should mark as executed
      if (this.shouldMarkAsExecuted(scheduled, today)) {
        const updatedScheduled = new ScheduledAssetTransaction(
          scheduled.id,
          scheduled.assetId,
          scheduled.transactionType,
          scheduled.quantity,
          scheduled.price,
          scheduled.scheduledDate,
          scheduled.frequency,
          scheduled.endDate,
          scheduled.totalOccurrences,
          scheduled.isActive,
          true, // Mark as executed
          undefined
        );
        await this.scheduledTransactionRepository.save(updatedScheduled);
      }
    }
  }

  // Get SIP summary with calculated metrics
  async getSIPSummary(scheduledId: number): Promise<SIPSummary | null> {
    const scheduled = await this.scheduledTransactionRepository.findById(scheduledId);
    if (!scheduled) return null;

    const allTransactions = await this.assetTransactionRepository.findByAssetId(scheduled.assetId!);

    // Filter transactions that likely came from this SIP
    const sipTransactions = allTransactions.filter(t => this.isSimilarTransaction(t, scheduled));

    const totalInvested = sipTransactions.reduce((sum, t) => sum + t.getTotalAmount(), 0);
    const totalUnits = sipTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);

    return {
      scheduled,
      sipTransactions,
      totalInvested,
      totalUnits,
      nextInvestmentDate: this.getNextInvestmentDate(scheduled),
      isCompleted: scheduled.isExecuted || !scheduled.isActive,
      expectedTotalInvestment: this.calculateExpectedTotalInvestment(scheduled),
    };
  }

  // Get all SIP summaries for an asset
  async getSIPSummariesByAsset(assetId: number): Promise<SIPSummary[]> {
    const scheduledTransactions = await this.scheduledTransactionRepository.findByAssetId(assetId);
    const summaries: SIPSummary[] = [];

    for (const scheduled of scheduledTransactions) {
      if (scheduled.id) {
        const summary = await this.getSIPSummary(scheduled.id);
        if (summary) {
          summaries.push(summary);
        }
      }
    }

    return summaries;
  }

  private getNextInvestmentDate(scheduled: ScheduledAssetTransaction): Date | null {
    if (scheduled.isExecuted || !scheduled.isActive) return null;

    const today = new Date();
    let nextDate = new Date(scheduled.scheduledDate);
    const frequencyMonths = INVESTMENT_FREQUENCY_MONTHS[scheduled.frequency];

    // Find the next date that's in the future
    while (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
    }

    // Check if next date exceeds end conditions
    if (scheduled.endDate && nextDate > scheduled.endDate) return null;
    if (scheduled.totalOccurrences) {
      const monthsDiff = this.getMonthsDifference(scheduled.scheduledDate, nextDate);
      const occurrenceNumber = Math.floor(monthsDiff / frequencyMonths) + 1;
      if (occurrenceNumber > scheduled.totalOccurrences) return null;
    }

    return nextDate;
  }

  private calculateExpectedTotalInvestment(scheduled: ScheduledAssetTransaction): number {
    if (scheduled.totalOccurrences) {
      return scheduled.totalOccurrences * scheduled.getTotalAmount();
    }

    if (scheduled.endDate) {
      const monthsDiff = this.getMonthsDifference(scheduled.scheduledDate, scheduled.endDate);
      const frequencyMonths = INVESTMENT_FREQUENCY_MONTHS[scheduled.frequency];
      const expectedOccurrences = Math.floor(monthsDiff / frequencyMonths) + 1;
      return expectedOccurrences * scheduled.getTotalAmount();
    }

    return 0; // Indefinite SIP
  }

  // Delete SIP and optionally keep existing transactions
  async deleteSIP(scheduledId: number, keepExistingTransactions: boolean = true): Promise<void> {
    if (!keepExistingTransactions) {
      const scheduled = await this.scheduledTransactionRepository.findById(scheduledId);
      if (scheduled) {
        // Delete all transactions that were likely created by this SIP
        const allTransactions = await this.assetTransactionRepository.findByAssetId(
          scheduled.assetId!
        );
        const sipTransactions = allTransactions.filter(t =>
          this.isSimilarTransaction(t, scheduled)
        );

        for (const transaction of sipTransactions) {
          if (transaction.id) {
            await this.assetTransactionRepository.delete(transaction.id);
          }
        }
      }
    }

    // Delete the scheduled transaction
    await this.scheduledTransactionRepository.delete(scheduledId);
  }

  // Update SIP and create transactions for past due dates
  async updateSIP(updatedScheduled: ScheduledAssetTransaction): Promise<void> {
    // Save the updated schedule
    await this.scheduledTransactionRepository.save(updatedScheduled);

    // Auto-convert any past due dates to actual transactions
    await this.autoConvertAfterScheduleChange(updatedScheduled.id!);
  }

  // Create new SIP and generate transactions for past due dates
  async createSIP(scheduled: ScheduledAssetTransaction): Promise<ScheduledAssetTransaction> {
    // Save the new schedule
    const savedScheduled = await this.scheduledTransactionRepository.save(scheduled);

    // Auto-convert any past due dates to actual transactions
    await this.autoConvertAfterScheduleChange(savedScheduled.id!);

    return savedScheduled;
  }

  // Utility methods
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getMonthsDifference(date1: Date, date2: Date): number {
    return (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
  }
}

// Type definitions for service responses
export interface SIPSummary {
  scheduled: ScheduledAssetTransaction;
  sipTransactions: AssetTransaction[];
  totalInvested: number;
  totalUnits: number;
  nextInvestmentDate: Date | null;
  isCompleted: boolean;
  expectedTotalInvestment: number;
}
