import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { AssetsPage } from '@/app/components/pages/AssetsPage';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetService, computeAssetPortfolioTotals } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';
import { ExportPortfolioContainer } from './ExportPortfolioContainer';

export function AssetsContainer() {
  const { converter } = useCurrency();
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

  const portfolioMetrics = React.useMemo(
    () => computeAssetPortfolioTotals(assets, converter),
    [assets, converter]
  );

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // A sync pull replaces every row, including these.
  useDatabaseReplaced(() => void loadAssets());

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
