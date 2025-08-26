import { Asset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useState } from 'react';
import { AssetsPage } from '../../components/Pages/AssetsPage';
import { AssetFormContainer } from './AssetFormContainer';

export function AssetsContainer() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateAssetDialog, setShowCreateAssetDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | undefined>(undefined);
  const assetService = React.useMemo(() => new AssetService(), []);

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const loadedAssets = await assetService.getAssets();
      setAssets(loadedAssets);
    } catch (error) {
      Logger.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleAddAsset = () => {
    setAssetToEdit(undefined);
    setShowCreateAssetDialog(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setAssetToEdit(asset);
    setShowCreateAssetDialog(true);
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!asset.id) return;

    if (
      !confirm(
        `Are you sure you want to delete "${asset.name}"? This will also delete all associated transactions, scheduled investments (SIPs), and cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await assetService.deleteAsset(asset.id);
      await loadAssets();
    } catch (error) {
      Logger.error('Failed to delete asset:', error);
    }
  };

  const handleViewTransactions = () => {
    // Logic to view transactions
  };

  const handleManageSIP = () => {
    // Logic to manage SIP
  };

  return (
    <>
      <AssetsPage
        assets={assets}
        isLoading={isLoading}
        onAddAsset={handleAddAsset}
        onEditAsset={handleEditAsset}
        onDeleteAsset={handleDeleteAsset}
        onViewTransactions={handleViewTransactions}
        onManageSIP={handleManageSIP}
      />
      <AssetFormContainer
        open={showCreateAssetDialog}
        assetToEdit={assetToEdit}
        onClose={() => setShowCreateAssetDialog(false)}
        onSuccess={() => {
          setShowCreateAssetDialog(false);
          loadAssets();
        }}
      />
    </>
  );
}
