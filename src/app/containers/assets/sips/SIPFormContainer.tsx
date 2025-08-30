import { Asset } from '@/domain/entities/assets/Asset';
import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useMemo, useState } from 'react';
import { ISIP } from '../../../../domain/entities/assets/SIP';
import { Frequency } from '../../../../domain/entities/shared/Frequency';
import { AssetService } from '../../../../domain/services/AssetService';
import { SIPFormDialog } from '../../../components/dialogs/SIPFormDialog';

export interface SIPFormContainerProps {
  open: boolean;
  asset: Asset;
  sipToEdit?: ISIP | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

export function SIPFormContainer({
  open,
  asset,
  sipToEdit,
  onClose,
  onSuccess,
}: SIPFormContainerProps) {
  const initialSip = React.useMemo(
    () => ({
      id: sipToEdit?.id || undefined,
      assetId: sipToEdit?.assetId || asset?.id || 0,
      quantity: sipToEdit?.quantity ?? 0,
      price: sipToEdit?.price || 0,
      startDate: sipToEdit?.startDate || new Date(),
      endDate: sipToEdit?.endDate || undefined,
      frequency: sipToEdit?.frequency || Frequency.MONTHLY,
      executedTill: sipToEdit?.executedTill || new Date(),
    }),
    [sipToEdit, asset]
  );

  const [sip, setSIP] = useState<ISIP>(initialSip);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const assetService = useMemo(() => new AssetService(), []);

  useEffect(() => {
    if (open) {
      setSIP(initialSip);
    }
  }, [open, initialSip]);

  const handleSubmit = async () => {
    if (isSubmitting) {
      Logger.error('Submission blocked: Either already submitting or asset/asset ID is missing');
      return;
    }

    try {
      setIsSubmitting(true);

      const sip: ISIP = {
        id: sipToEdit?.id,
        assetId: asset.id!,
        quantity: sipToEdit?.quantity ?? 0,
        endDate: sipToEdit?.endDate,
        executedTill: sipToEdit?.executedTill,
        price: 0,
        startDate: sipToEdit?.startDate || new Date(),
        frequency: Frequency.DAILY,
      };

      if (sipToEdit) {
        await assetService.updateSIP(sip);
      } else {
        await assetService.addSIP(sip);
      }

      onSuccess();
      onClose();
    } catch (error) {
      Logger.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = sipToEdit ? 'Edit Transaction' : 'Add New Transaction';

  return (
    <SIPFormDialog
      open={open}
      title={title}
      sip={sip}
      isSubmitting={isSubmitting}
      asset={asset}
      onClose={onClose}
      onSubmit={handleSubmit}
      onSIPChange={setSIP}
    />
  );
}
