import { Delete, Edit } from '@mui/icons-material';
import { Box, Chip, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { useState } from 'react';
import { Asset } from '../../../domain/entities/assets/Asset';
import { Investment } from '../../../domain/entities/assets/Investment';
import { InvestmentFormContainer } from '../../containers/assets/investment/InvestmentFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface InvestmentViewProps {
  asset: Asset;
  transaction: Investment;
  deleteInvestment: (id: number) => void;
  refresh: () => void;
}

export function InvestmentView({
  asset,
  transaction,
  deleteInvestment,
  refresh,
}: InvestmentViewProps) {
  const [showTransactionEdit, setShowTransactionEdit] = useState<boolean>(false);

  const getTotalAmount = (transaction: Investment): number => {
    return transaction.getTotalAmount();
  };

  return (
    <>
      {showTransactionEdit && (
        <InvestmentFormContainer
          open={showTransactionEdit}
          asset={asset}
          investmentToEdit={transaction}
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
                onClick={() => deleteInvestment(transaction.id!)}
                aria-label="delete investment"
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
