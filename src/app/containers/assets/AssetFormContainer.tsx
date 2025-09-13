import { AssetFormDialog } from '@/app/components/dialogs/AssetFormDialog';
import { Asset, IAsset } from '@/domain/entities/assets/Asset';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useState } from 'react';

export interface AssetFormContainer {
  open: boolean;
  assetToEdit: Asset | undefined;
  onClose: () => void;
}

export function AssetFormContainer({ open, assetToEdit, onClose }: AssetFormContainer) {
  const initialAsset: IAsset = React.useMemo(
    () => ({
      id: assetToEdit?.id,
      name: assetToEdit?.name || '',
      description: assetToEdit?.description || '',
      category: assetToEdit?.category || '',
      currency: assetToEdit?.currency || 'INR',
      manualValue: assetToEdit?.manualValue || undefined,
      manualValueUpdatedAt: assetToEdit?.manualValueUpdatedAt || undefined,
      script: assetToEdit?.script || undefined,
      scriptValue: assetToEdit?.scriptValue || undefined,
      scriptValueUpdatedAt: assetToEdit?.scriptValueUpdatedAt || undefined,
      interestRate: assetToEdit?.interestRate || undefined,
      maturityAmount: assetToEdit?.maturityAmount || undefined,
      maturityDate: assetToEdit?.maturityDate || undefined,
      valueModel: assetToEdit?.valueModel || ValueModel.MARKET_BASED,
    }),
    [assetToEdit]
  );

  const [asset, setAsset] = useState<IAsset>(initialAsset);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const assetService = React.useMemo(() => new AssetService(), []);

  // Reset form data when assetToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setAsset(initialAsset);
    }
  }, [open, initialAsset]);

  const title = assetToEdit ? 'Edit Asset' : 'Add New Asset';

  return (
    <AssetFormDialog
      open={open}
      title={title}
      asset={asset}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={async () => {
        if (isSubmitting) return;

        try {
          setIsSubmitting(true);

          if (assetToEdit) {
            await assetService.updateAsset(asset);
          } else {
            await assetService.createAsset(asset);
          }
        } catch (error) {
          Logger.error('Failed to save asset:', error);
        } finally {
          setIsSubmitting(false);
          onClose();
        }
      }}
      onAssetChange={function (asset: IAsset): void {
        setAsset(asset);
      }}
    />
  );
}
