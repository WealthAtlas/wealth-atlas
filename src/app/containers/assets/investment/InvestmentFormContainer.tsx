import { InvestmentFormDialog } from '@/app/components/dialogs/InvestmentFormDialog';
import { IAsset } from '@/domain/entities/assets/Asset';
import { IInvestment, Investment, InvestmentType } from '@/domain/entities/assets/Investment';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useMemo, useState } from 'react';

export interface InestmentFormContainerProps {
  open: boolean;
  asset: IAsset;
  investmentToEdit?: IInvestment | undefined;
  onClose: () => void;
}

export function InvestmentFormContainer({
  open,
  asset,
  investmentToEdit: transactionToEdit,
  onClose,
}: InestmentFormContainerProps) {
  const initialInvestment: IInvestment = React.useMemo(
    () => ({
      id: transactionToEdit?.id || undefined,
      assetId: transactionToEdit?.assetId || asset?.id || 0,
      type: transactionToEdit?.type || InvestmentType.BUY,
      quantity: transactionToEdit?.quantity ?? 0,
      totalAmount: transactionToEdit?.totalAmount || 0,
      date: transactionToEdit?.date || new Date(),
    }),
    [transactionToEdit, asset]
  );

  const [investment, setInvestment] = useState<IInvestment>(initialInvestment);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const assetService = useMemo(() => new AssetService(), []);

  useEffect(() => {
    if (open) {
      setInvestment(initialInvestment);
    }
  }, [open, initialInvestment]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const transactionEntity = new Investment({
        id: investment.id,
        assetId: asset.id!,
        quantity: investment.quantity ?? 0,
        totalAmount: investment.totalAmount,
        date: investment.date,
        type: investment.type,
      });

      if (transactionToEdit) {
        await assetService.updateInvestment(transactionEntity);
      } else {
        await assetService.addInvestment(transactionEntity);
      }
    } catch (error) {
      Logger.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const title = transactionToEdit ? 'Edit Transaction' : 'Add New Transaction';

  return (
    <InvestmentFormDialog
      open={open}
      title={title}
      investment={investment}
      isSubmitting={isSubmitting}
      asset={asset}
      onClose={onClose}
      onSubmit={handleSubmit}
      onTransactionChange={setInvestment}
    />
  );
}
