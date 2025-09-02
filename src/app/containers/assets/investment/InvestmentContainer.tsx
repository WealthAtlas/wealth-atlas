import { Asset } from '@/domain/entities/assets/Asset';
import React from 'react';
import { AssetService } from '../../../../domain/services/AssetService';
import { InvestmentListDialog } from '../../../components/dialogs/InvestmentListDialog';

export interface InvestmentContainerProps {
  open: boolean;
  asset: Asset;
  onClose: () => void;
  refresh: () => void;
}

export function InvestmentContainer({ open, asset, onClose, refresh }: InvestmentContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);

  const deleteInvestment = (id: number) => {
    assetService.deleteInvestment(id).then(() => {
      refresh();
    });
  };

  return (
    <InvestmentListDialog
      open={open}
      asset={asset}
      investments={asset.getTransactions(new Date(), false)}
      deleteInvestment={deleteInvestment}
      onClose={onClose}
      refresh={refresh}
    />
  );
}
