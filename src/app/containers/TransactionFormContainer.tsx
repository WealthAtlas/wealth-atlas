import { AssetTransactionRepository } from '@/data/repositories/AssetTransactionRepository';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { useState } from 'react';
import {
  TransactionFormData,
  TransactionFormDialog,
} from '../components/Forms/TransactionFormDialog';

export interface TransactionFormContainerProps {
  open: boolean;
  asset: Asset | null;
  transactionToEdit?: AssetTransaction | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionFormContainer({
  open,
  asset,
  transactionToEdit,
  onClose,
  onSuccess,
}: TransactionFormContainerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const assetTransactionRepository = new AssetTransactionRepository();

  const handleSubmit = async (formData: TransactionFormData) => {
    if (!asset || !asset.id) {
      // eslint-disable-next-line no-console
      console.error('Asset or Asset ID is missing');
      return;
    }

    try {
      setIsLoading(true);

      // Convert form data to domain entity
      const transaction = new AssetTransaction(
        transactionToEdit?.id, // Use existing ID when editing
        asset.id,
        formData.transactionType,
        formData.quantity ? parseFloat(formData.quantity) : undefined,
        parseFloat(formData.price),
        new Date(formData.date)
      );

      await assetTransactionRepository.save(transaction);
      onSuccess(); // Notify parent to refresh data
      onClose(); // Close the dialog
    } catch (error) {
      // TODO: Add proper error handling with toast/snackbar
      // eslint-disable-next-line no-console
      console.error('Failed to save transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TransactionFormDialog
      open={open}
      asset={asset}
      transactionToEdit={transactionToEdit}
      onClose={onClose}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
