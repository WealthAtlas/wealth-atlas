import { Asset, IAsset } from '@/domain/entities/assets/Asset';
import React, { useEffect, useState } from 'react';
import { AssetPricingModel } from '../../../domain/entities/assets/AssetPricingModel';
import { AssetService } from '../../../domain/services/AssetService';
import { Logger } from '../../../domain/utils/Logger';
import { AssetFormDialog } from '../../components/dialogs/AssetFormDialog';

export interface AssetFormContainer {
  open: boolean;
  assetToEdit: Asset | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssetFormContainer({ open, assetToEdit, onClose, onSuccess }: AssetFormContainer) {
  const [asset, setAsset] = useState<IAsset>({
    id: assetToEdit?.id,
    name: assetToEdit?.name || '',
    description: assetToEdit?.description || '',
    category: assetToEdit?.category || '',
    currency: assetToEdit?.currency || 'INR',
    marketValue: assetToEdit?.marketValue || undefined,
    marketValueUpdatedAt: assetToEdit?.marketValueUpdatedAt || undefined,
    apiPath: assetToEdit?.apiPath || undefined,
    interestRate: assetToEdit?.interestRate || undefined,
    maturityAmount: assetToEdit?.maturityAmount || undefined,
    maturityDate: assetToEdit?.maturityDate || undefined,
    pricingModel: assetToEdit?.pricingModel || AssetPricingModel.MARKET_BASED,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const assetService = React.useMemo(() => new AssetService(), []);

  // Reset form data when assetToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setAsset({
        id: assetToEdit?.id,
        name: assetToEdit?.name || '',
        description: assetToEdit?.description || '',
        category: assetToEdit?.category || '',
        currency: assetToEdit?.currency || 'INR',
        marketValue: assetToEdit?.marketValue || undefined,
        marketValueUpdatedAt: assetToEdit?.marketValueUpdatedAt || undefined,
        apiPath: assetToEdit?.apiPath || undefined,
        interestRate: assetToEdit?.interestRate || undefined,
        maturityAmount: assetToEdit?.maturityAmount || undefined,
        maturityDate: assetToEdit?.maturityDate || undefined,
        pricingModel: assetToEdit?.pricingModel || AssetPricingModel.MARKET_BASED,
      });
    }
  }, [open, assetToEdit]);

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

          onSuccess();
        } catch (error) {
          Logger.error('Failed to save asset:', error);
        } finally {
          setIsSubmitting(false);
        }
      }}
      onAssetChange={function (asset: IAsset): void {
        setAsset(asset);
      }}
    />
  );
}
