import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { Logger } from '@/domain/utils/Logger';
import React from 'react';
import { AssetService } from '../../../../domain/services/AssetService';
import { TransactionView } from '../../../components/views/TransactionView';

export interface TransactionViewContainerProps {
  asset: Asset;
  transaction: AssetTransaction;
  addTransaction: () => void;
  refresh: () => void;
}

export function TransactionViewContainer({
  asset,
  transaction,
  addTransaction,
  refresh,
}: TransactionViewContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);

  const handleDeleteTransaction = async () => {
    try {
      await assetService.deleteTransaction(transaction.id!);
      refresh();
    } catch (error) {
      Logger.error('Failed to delete transaction:', error);
    }
  };

  return (
    <TransactionView
      key={transaction.id}
      asset={asset}
      transaction={transaction}
      addTransaction={() => addTransaction()}
      deleteTransaction={handleDeleteTransaction}
      refresh={refresh}
    />
  );
}
