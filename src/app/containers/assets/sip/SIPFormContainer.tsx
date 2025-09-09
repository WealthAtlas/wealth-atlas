import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useMemo, useState } from 'react';
import { IAsset } from '../../../../domain/entities/assets/Asset';
import { ISIP, SIP } from '../../../../domain/entities/assets/SIP';
import { Frequency } from '../../../../domain/entities/shared/Frequency';
import { AssetService } from '../../../../domain/services/AssetService';
import { SIPFormDialog } from '../../../components/dialogs/SIPFormDialog';

export interface SIPFormContainerProps {
  open: boolean;
  asset: IAsset;
  sipToEdit?: SIP | undefined;
  onClose: () => void;
}

export function SIPFormContainer({ open, asset, sipToEdit, onClose }: SIPFormContainerProps) {
  const initialSIP: ISIP = React.useMemo(
    () => ({
      id: sipToEdit?.id || undefined,
      assetId: sipToEdit?.assetId || asset?.id || 0,
      price: sipToEdit?.price || 0,
      frequency: sipToEdit?.frequency || Frequency.MONTHLY,
      startDate: sipToEdit?.startDate || new Date(),
      endDate: sipToEdit?.endDate || new Date(),
    }),
    [sipToEdit, asset]
  );

  const [sip, setSIP] = useState<ISIP>(initialSIP);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const assetService = useMemo(() => new AssetService(), []);

  useEffect(() => {
    if (open) {
      setSIP(initialSIP);
    }
  }, [open, initialSIP]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const sipEntity = new SIP({
        id: sip.id,
        assetId: sip.assetId,
        price: sip.price,
        frequency: sip.frequency,
        startDate: sip.startDate,
        endDate: sip.endDate,
      });

      if (sipToEdit) {
        await assetService.updateSIP(sipEntity);
      } else {
        await assetService.addSIP(sipEntity);
      }
    } catch (error) {
      Logger.error('Failed to save SIP:', error);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const title = sipToEdit ? 'Edit SIP' : 'Add New SIP';

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
