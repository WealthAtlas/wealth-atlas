import { Asset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';
import { AssetsPage } from '../../components/pages/AssetsPage';

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

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return (
    <>
      <AssetsPage assets={assets} isLoading={isLoading} refresh={loadAssets} />
    </>
  );
}
