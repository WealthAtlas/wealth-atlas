import { InvestmentListDialog } from '@/app/components/dialogs/InvestmentListDialog';
import { IAsset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import React, { useCallback, useEffect } from 'react';
import { Investment } from '../../../../domain/entities/assets/Investment';
import { Logger } from '../../../../domain/utils/Logger';

export interface InvestmentListContainerProps {
  open: boolean;
  asset: IAsset;
  onClose: () => void;
}

export function InvestmentListContainer({ open, asset, onClose }: InvestmentListContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);
  const [investments, setInvestments] = React.useState<Investment[]>([]);

  const loadInvestments = useCallback(async () => {
    try {
      const investments = await assetService.getInvestmentByAssetId(asset.id!);
      setInvestments(investments);
    } catch (error) {
      Logger.error('Failed to load investments:', error);
    }
  }, [assetService, asset.id]);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  const refresh = useCallback(() => {
    loadInvestments();
  }, [loadInvestments]);

  const deleteInvestment = useCallback(
    async (id: number) => {
      try {
        await assetService.deleteInvestment(id);
        await loadInvestments();
      } catch (error) {
        Logger.error('Failed to delete investment:', error);
      }
    },
    [assetService, loadInvestments]
  );

  return (
    <InvestmentListDialog
      open={open}
      asset={asset}
      investments={investments}
      deleteInvestment={deleteInvestment}
      onClose={onClose}
      refresh={refresh}
    />
  );
}
