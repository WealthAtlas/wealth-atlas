import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction, IAssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useMemo, useState } from 'react';
import { AssetService } from '../../../../domain/services/AssetService';
import { TransactionFormDialog } from '../../../components/dialogs/TransactionFormDialog';

export interface TransactionFormContainerProps {
  open: boolean;
  asset: Asset;
  transactionToEdit?: AssetTransaction | undefined;
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
  const [transaction, setTransaction] = useState<IAssetTransaction>({
    id: transactionToEdit?.id || undefined,
    assetId: transactionToEdit?.assetId || asset?.id || 0,
    quantity: transactionToEdit?.quantity ?? 0,
    price: transactionToEdit?.price || 0,
    date: transactionToEdit?.date || new Date(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const assetService = useMemo(() => new AssetService(), []);

  // Reset form data when transactionToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setTransaction({
        id: transactionToEdit?.id || undefined,
        assetId: transactionToEdit?.assetId || asset?.id || 0,
        quantity: transactionToEdit?.quantity ?? 0,
        price: transactionToEdit?.price || 0,
        date: transactionToEdit?.date || new Date(),
      });
    }
  }, [open, transactionToEdit, asset]);

  const handleSubmit = async () => {
    if (isSubmitting || !asset || !asset.id) {
      Logger.error('Submission blocked: Either already submitting or asset/asset ID is missing');
      return;
    }

    try {
      setIsSubmitting(true);

      const transactionEntity = new AssetTransaction({
        id: transaction.id,
        assetId: asset.id,
        quantity: transaction.quantity ?? 0,
        price: transaction.price,
        date: transaction.date,
      });

      if (transactionToEdit) {
        await assetService.updateTransaction(transactionEntity);
      } else {
        await assetService.addTransaction(transactionEntity);
      }

      onSuccess();
      onClose();
    } catch (error) {
      Logger.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = transactionToEdit ? 'Edit Transaction' : 'Add New Transaction';

  return (
    <TransactionFormDialog
      open={open}
      title={title}
      transaction={transaction}
      isSubmitting={isSubmitting}
      asset={asset}
      onClose={onClose}
      onSubmit={handleSubmit}
      onTransactionChange={setTransaction}
    />
  );
}
