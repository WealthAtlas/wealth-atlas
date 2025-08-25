import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useState } from 'react';
import { AssetsPage } from '../components/Pages/AssetsPage';

export function AssetsContainer() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allTransactions, setAllTransactions] = useState<AssetTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const assetService = new AssetService();

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const loadedAssets = await assetService.getAssets();
      const transactions = loadedAssets.flatMap(asset => asset.getTransactions(new Date(), true));
      setAssets(loadedAssets);
      setAllTransactions(transactions);
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
    // Logic to add asset
  };

  const handleEditAsset = () => {
    // Logic to edit asset
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
    <AssetsPage
      assets={assets}
      allTransactions={allTransactions}
      isLoading={isLoading}
      onAddAsset={handleAddAsset}
      onEditAsset={handleEditAsset}
      onDeleteAsset={handleDeleteAsset}
      onViewTransactions={handleViewTransactions}
      onManageSIP={handleManageSIP}
    />
  );
}
