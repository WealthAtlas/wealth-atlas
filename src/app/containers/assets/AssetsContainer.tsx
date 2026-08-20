import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { AssetsPage } from '@/app/components/pages/AssetsPage';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';
import { ExportPortfolioContainer } from './ExportPortfolioContainer';

export function AssetsContainer() {
  const { converter, baseCurrency } = useCurrency();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAddAsset, setShowAddAsset] = React.useState(false);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const assetService = React.useMemo(() => new AssetService(), []);

  const loadAssets = useCallback(async () => {
    try {
      const loadedAssets = await assetService.getAssets();
      setAssets(loadedAssets);
    } catch (error) {
      Logger.error('Failed to load assets:', error);
    }
  }, [assetService]);

  const deleteAsset = useCallback(
    async (id: number) => {
      try {
        await assetService.deleteAsset(id);
        await loadAssets();
      } catch (error) {
        Logger.error('Failed to delete asset:', error);
      }
    },
    [assetService, loadAssets]
  );

  // Portfolio-level metrics span assets in different currencies, so each one is
  // converted into the base currency before it is summed.
  const portfolioMetrics = React.useMemo(() => {
    const totalValue = assets.reduce(
      (sum, asset) => sum + converter.toBase(asset.getValue() || 0, asset.currency),
      0
    );
    const totalInvested = assets.reduce(
      (sum, asset) => sum + converter.toBase(asset.getTotalInvestedAmount(), asset.currency),
      0
    );
    const totalProfitLoss = totalValue - totalInvested;

    return {
      totalValue,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercentage: totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0,
      currency: baseCurrency,
      unratedCurrencies: converter.getUnratedCurrencies(assets.map(asset => asset.currency)),
    };
  }, [assets, converter, baseCurrency]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return (
    <>
      <AssetsPage
        assets={assets}
        portfolioMetrics={portfolioMetrics}
        showAddAsset={showAddAsset}
        refresh={loadAssets}
        deleteAsset={deleteAsset}
        setShowAddAsset={setShowAddAsset}
        setShowExportDialog={setShowExportDialog}
      />
      <ExportPortfolioContainer
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </>
  );
}
