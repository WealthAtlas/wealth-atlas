import { Delete, Edit } from '@mui/icons-material';
import { Box, Chip, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { useState } from 'react';
import { Asset } from '../../../domain/entities/assets/Asset';
import { AssetTransaction } from '../../../domain/entities/assets/AssetTransaction';
import { TransactionFormContainer } from '../../containers/assets/transactions/TransactionFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface TransactionViewProps {
  asset: Asset;
  transaction: AssetTransaction;
  addTransaction: () => void;
  deleteTransaction: (id: number) => void;
  refresh: () => void;
}

export function TransactionView({
  asset,
  transaction,
  deleteTransaction,
  refresh,
}: TransactionViewProps) {
  const [showTransactionEdit, setShowTransactionEdit] = useState<boolean>(false);

  const getTotalAmount = (transaction: AssetTransaction): number => {
    return transaction.getTotalAmount();
  };

  return (
    <>
      {showTransactionEdit && (
        <TransactionFormContainer
          open={showTransactionEdit}
          asset={asset}
          transactionToEdit={transaction}
          onClose={() => setShowTransactionEdit(false)}
          onSuccess={() => {
            setShowTransactionEdit(false);
            refresh();
          }}
        />
      )}
      <TableRow key={transaction.id}>
        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
        <TableCell>
          <Chip
            label={'Buy'}
            size="small"
            color={transaction.getTotalAmount() > 0 ? 'success' : 'error'}
            variant="outlined"
          />
        </TableCell>
        <TableCell align="right">
          {transaction.quantity !== undefined ? transaction.quantity.toLocaleString() : 'N/A'}
        </TableCell>
        <TableCell align="right">
          {UIUtils.formatCurrency(transaction.price, asset.currency)}
        </TableCell>
        <TableCell align="right">
          {UIUtils.formatCurrency(getTotalAmount(transaction), asset.currency)}
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit Transaction">
              <IconButton
                size="small"
                onClick={() => setShowTransactionEdit(true)}
                aria-label="edit transaction"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Transaction">
              <IconButton
                size="small"
                onClick={() => deleteTransaction(transaction.id!)}
                aria-label="delete transaction"
                color="error"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
    </>
  );
}
