import { InvestmentListDialog } from '@/app/components/dialogs/InvestmentListDialog';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetService } from '@/domain/services/AssetService';
import React from 'react';

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
