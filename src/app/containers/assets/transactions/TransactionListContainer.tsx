import { Asset } from '@/domain/entities/assets/Asset';
import { TransactionListDialog } from '../../../components/dialogs/TransactionListDialog';

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
    <TransactionListDialog
      open={open}
      asset={asset}
      transactions={asset.getTransactions(new Date(), false)}
      onClose={onClose}
      refresh={refresh}
    />
  );
}
