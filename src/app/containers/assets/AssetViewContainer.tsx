import { Asset } from '@/domain/entities/assets/Asset';
import React from 'react';
import { AssetService } from '../../../domain/services/AssetService';
import { Logger } from '../../../domain/utils/Logger';
import { AssetView } from '../../components/views/AssetView';

export interface AssetViewContainerProps {
  asset: Asset;
  refresh: () => void;
}

export function AssetViewContainer({ asset, refresh }: AssetViewContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);

  const deleteAsset = async (id: number) => {
    try {
      await assetService.deleteAsset(id);
      refresh();
    } catch (error) {
      Logger.error('Failed to delete asset:', error);
    }
  };

  return <AssetView asset={asset} deleteAsset={deleteAsset} refresh={refresh} />;
}
