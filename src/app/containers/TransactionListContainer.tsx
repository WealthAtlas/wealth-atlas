import { AssetTransactionRepository } from '@/data/repositories/AssetTransactionRepository';
import { Asset } from '@/domain/entities/Asset';
import { AssetTransaction } from '@/domain/entities/AssetTransaction';
import { useEffect, useState } from 'react';
import { TransactionListDialog } from '../components/Dialogs/TransactionListDialog';

export interface TransactionListContainerProps {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
  onAddTransaction: () => void;
  onEditTransaction: (transaction: AssetTransaction) => void;
  onTransactionDeleted: () => void;
}

export function TransactionListContainer({
  open,
  asset,
  onClose,
  onAddTransaction,
  onEditTransaction,
  onTransactionDeleted,
}: TransactionListContainerProps) {
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);

  const transactionRepository = new AssetTransactionRepository();

  const loadTransactions = async () => {
    if (!asset?.id) return;

    try {
      const assetTransactions = await transactionRepository.findByAssetId(asset.id);
      setTransactions(assetTransactions);
    } catch (error) {
      // TODO: Add proper error handling with toast/snackbar
      // eslint-disable-next-line no-console
      console.error('Failed to load transactions:', error);
    }
  };

  const handleDeleteTransaction = async (transaction: AssetTransaction) => {
    if (!transaction.id) return;

    // TODO: Add confirmation dialog before deletion
    try {
      await transactionRepository.delete(transaction.id);
      await loadTransactions(); // Reload transactions
      onTransactionDeleted(); // Notify parent to reload assets
    } catch (error) {
      // TODO: Add proper error handling with toast/snackbar
      // eslint-disable-next-line no-console
      console.error('Failed to delete transaction:', error);
    }
  };

  // Load transactions when dialog opens and asset changes
  useEffect(() => {
    if (open && asset) {
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset]);

  return (
    <TransactionListDialog
      open={open}
      asset={asset}
      transactions={transactions}
      onClose={onClose}
      onAddTransaction={onAddTransaction}
      onEditTransaction={onEditTransaction}
      onDeleteTransaction={handleDeleteTransaction}
    />
  );
}
