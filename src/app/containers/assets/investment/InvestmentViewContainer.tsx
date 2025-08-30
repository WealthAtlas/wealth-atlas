import { Asset } from '@/domain/entities/assets/Asset';
import { Investment } from '@/domain/entities/assets/Investment';
import { Logger } from '@/domain/utils/Logger';
import React from 'react';
import { AssetService } from '../../../../domain/services/AssetService';
import { InvestmentView } from '../../../components/views/InvestmentView';

export interface InvestmentViewContainerProps {
  asset: Asset;
  transaction: Investment;
  refresh: () => void;
}

export function InvestmentViewContainer({
  asset,
  transaction,
  refresh,
}: InvestmentViewContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);

  const handleDeleteInvestment = async () => {
    try {
      await assetService.deleteInvestment(transaction.id!);
      refresh();
    } catch (error) {
      Logger.error('Failed to delete investment:', error);
    }
  };

  return (
    <InvestmentView
      key={transaction.id}
      asset={asset}
      transaction={transaction}
      deleteInvestment={handleDeleteInvestment}
      refresh={refresh}
    />
  );
}
