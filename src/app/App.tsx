import { Logger } from '@/domain/utils/Logger';
import { useEffect } from 'react';
import { AssetTransactionRepository } from '../data/repositories/AssetTransactionRepository';
import { ScheduledAssetTransactionRepository } from '../data/repositories/ScheduledAssetTransactionRepository';
import { InvestmentScheduleService } from '../domain/services/InvestmentScheduleService';
import { AppRouter } from './router/AppRouter';
import { AppThemeProvider } from './theme/AppThemeProvider';

export default function App() {
  useEffect(() => {
    // Auto-convert scheduled transactions on app startup
    const autoConvertTransactions = async () => {
      try {
        const scheduledRepo = new ScheduledAssetTransactionRepository();
        const transactionRepo = new AssetTransactionRepository();
        const investmentService = new InvestmentScheduleService(scheduledRepo, transactionRepo);

        await investmentService.autoConvertScheduledTransactions();
      } catch (error) {
        Logger.error('Failed to auto-convert scheduled transactions:', error);
      }
    };

    autoConvertTransactions();
  }, []);

  return (
    <AppThemeProvider>
      <AppRouter />
    </AppThemeProvider>
  );
}
