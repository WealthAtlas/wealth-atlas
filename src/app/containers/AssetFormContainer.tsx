import { AssetRepository } from '@/data/repositories/AssetRepository';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { AssetValuationConfig } from '@/domain/entities/assets/AssetValuationConfig';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useState } from 'react';
import { AssetFormData, AssetFormDialog } from '../components/Forms/AssetFormDialog';

export interface AssetFormContainerProps {
  open: boolean;
  assetToEdit?: Asset | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssetFormContainer({
  open,
  assetToEdit,
  onClose,
  onSuccess,
}: AssetFormContainerProps) {
  const [formData, setFormData] = useState<AssetFormData>(() => ({
    name: assetToEdit?.name || '',
    description: assetToEdit?.description || '',
    category: assetToEdit?.category || AssetCategory.STOCKS,
    currency: assetToEdit?.currency || 'USD',
    currentMarketValue: assetToEdit?.value,
    valueUpdatedAt: assetToEdit?.marketValueUpdatedAt,
    valuationConfig: assetToEdit?.valuationConfig,
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const assetRepository = new AssetRepository();

  const handleFieldChange = (
    field: keyof AssetFormData,
    value: string | number | AssetCategory | AssetValuationConfig | Date | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const asset = new Asset(
        assetToEdit?.id,
        formData.name.trim(),
        formData.description.trim(),
        formData.category,
        formData.currency,
        formData.currentMarketValue,
        formData.valueUpdatedAt || (formData.currentMarketValue ? new Date() : undefined),
        formData.valuationConfig
      );

      await assetRepository.save(asset);

      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        category: AssetCategory.STOCKS,
        currency: 'USD',
        currentMarketValue: undefined,
        valueUpdatedAt: undefined,
        valuationConfig: undefined,
      });

      onSuccess();
      onClose();
    } catch (error) {
      // TODO: Add proper error handling with toast/snackbar
      Logger.error('Failed to save asset:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form when closing
      setFormData({
        name: assetToEdit?.name || '',
        description: assetToEdit?.description || '',
        category: assetToEdit?.category || AssetCategory.STOCKS,
        currency: assetToEdit?.currency || 'USD',
        currentMarketValue: assetToEdit?.value,
        valueUpdatedAt: assetToEdit?.marketValueUpdatedAt,
        valuationConfig: assetToEdit?.valuationConfig,
      });
      onClose();
    }
  };

  // Reset form data when assetToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: assetToEdit?.name || '',
        description: assetToEdit?.description || '',
        category: assetToEdit?.category || AssetCategory.STOCKS,
        currency: assetToEdit?.currency || 'USD',
        currentMarketValue: assetToEdit?.value,
        valueUpdatedAt: assetToEdit?.marketValueUpdatedAt,
        valuationConfig: assetToEdit?.valuationConfig,
      });
    }
  }, [open, assetToEdit]);

  const title = assetToEdit ? 'Edit Asset' : 'Add New Asset';

  return (
    <AssetFormDialog
      open={open}
      title={title}
      formData={formData}
      isSubmitting={isSubmitting}
      onClose={handleClose}
      onSubmit={handleSubmit}
      onFieldChange={handleFieldChange}
    />
  );
}
