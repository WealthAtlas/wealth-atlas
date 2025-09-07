import { Asset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';
import { AssetView } from '../../components/views/AssetView';

export interface AssetViewContainerProps {
  assetId: number;
  deleteAsset: (id: number) => void;
}

export function AssetViewContainer({ assetId, deleteAsset }: AssetViewContainerProps) {
  const [asset, setAsset] = useState<Asset | undefined>(undefined);
  const [showViewTransactions, setShowViewTransactions] = useState<boolean>(false);
  const [showEditAsset, setShowEditAsset] = useState<boolean>(false);
  const assetService = React.useMemo(() => new AssetService(), []);

  const loadAsset = useCallback(async () => {
    try {
      const loadedAsset = await assetService.getAssetById(assetId);
      setAsset(loadedAsset);
    } catch (error) {
      Logger.error('Failed to load asset:', error);
    }
  }, [assetService, assetId]);

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  return (
    <>
      {asset && (
        <AssetView
          asset={asset}
          refresh={loadAsset}
          deleteAsset={deleteAsset}
          showViewTransactions={showViewTransactions}
          showEditAsset={showEditAsset}
          setShowViewTransactions={setShowViewTransactions}
          setShowEditAsset={setShowEditAsset}
        />
      )}
    </>
  );
}
