import { Asset } from '@/domain/entities/assets/Asset';
import { InvestmentListDialog } from '../../../components/dialogs/InvestmentListDialog';

export interface InvestmentListContainerProps {
  open: boolean;
  asset: Asset;
  onClose: () => void;
  refresh: () => void;
}

export function InvestmentListContainer({
  open,
  asset,
  onClose,
  refresh,
}: InvestmentListContainerProps) {
  return (
    <InvestmentListDialog
      open={open}
      asset={asset}
      investments={asset.getTransactions(new Date(), false)}
      onClose={onClose}
      refresh={refresh}
    />
  );
}
