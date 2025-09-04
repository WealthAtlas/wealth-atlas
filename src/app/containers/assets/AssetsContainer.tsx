import { AssetsPage } from '@/app/components/pages/AssetsPage';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export function AssetsContainer() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const assetService = React.useMemo(() => new AssetService(), []);

  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedAssets = await assetService.getAssets();
      setAssets(loadedAssets);
    } catch (error) {
      Logger.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [assetService]);

  const deleteAsset = useCallback(
    async (id: number) => {
      try {
        await assetService.deleteAsset(id);
        await loadAssets(); // Refresh the list
      } catch (error) {
        Logger.error('Failed to delete asset:', error);
      }
    },
    [assetService, loadAssets]
  );

  const deleteInvestment = useCallback(
    async (id: number) => {
      try {
        await assetService.deleteInvestment(id);
        await loadAssets(); // Refresh the list
      } catch (error) {
        Logger.error('Failed to delete investment:', error);
      }
    },
    [assetService, loadAssets]
  );

  // Calculate portfolio-level metrics
  const portfolioMetrics = React.useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + (asset.getValue() || 0), 0);
    const totalInvested = assets.reduce((sum, asset) => sum + asset.getTotalInvestedAmount(), 0);
    const totalProfitLoss = totalValue - totalInvested;

    return {
      totalValue,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercentage: totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0,
    };
  }, [assets]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return (
    <>
      <AssetsPage
        assets={assets}
        isLoading={isLoading}
        refresh={loadAssets}
        deleteAsset={deleteAsset}
        deleteInvestment={deleteInvestment}
        portfolioMetrics={portfolioMetrics}
      />
    </>
  );
}
