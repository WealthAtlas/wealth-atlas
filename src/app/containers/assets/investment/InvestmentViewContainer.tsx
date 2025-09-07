import { IAsset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import React, { useCallback, useEffect, useState } from 'react';
import { Investment } from '../../../../domain/entities/assets/Investment';
import { Logger } from '../../../../domain/utils/Logger';
import { InvestmentView } from '../../../components/views/InvestmentView';

export interface InvestmentViewContainerProps {
  asset: IAsset;
  investmentId: number;
  deleteInvestment: (id: number) => void;
}

export function InvestmentViewContainer({
  asset,
  investmentId,
  deleteInvestment,
}: InvestmentViewContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);
  const [investment, setInvestment] = React.useState<Investment | undefined>(undefined);
  const [showTransactionEdit, setShowTransactionEdit] = useState<boolean>(false);

  const loadInvestment = useCallback(async () => {
    try {
      const investment = (await assetService.getInvestmentByAssetId(asset.id!)).filter(
        inv => inv.id === investmentId
      )[0];
      setInvestment(investment);
    } catch (error) {
      Logger.error('Failed to load investment:', error);
    }
  }, [assetService, asset.id, investmentId]);

  useEffect(() => {
    loadInvestment();
  }, [loadInvestment]);

  const refresh = useCallback(() => {
    loadInvestment();
  }, [loadInvestment]);

  return (
    <>
      {investment && (
        <InvestmentView
          asset={asset}
          investment={investment}
          showTransactionEdit={showTransactionEdit}
          deleteInvestment={deleteInvestment}
          refresh={refresh}
          setShowTransactionEdit={setShowTransactionEdit}
        />
      )}
    </>
  );
}
