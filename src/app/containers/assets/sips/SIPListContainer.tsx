import { Asset } from '@/domain/entities/assets/Asset';
import { InvestmentListDialog } from '../../../components/dialogs/InvestmentListDialog';

export interface TransactionListContainerProps {
  open: boolean;
  asset: Asset;
  onClose: () => void;
  refresh: () => void;
}

export function TransactionListContainer({
  open,
  asset,
  onClose,
  refresh,
}: TransactionListContainerProps) {
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
