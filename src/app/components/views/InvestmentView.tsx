import { Delete, Edit, TrendingDown, TrendingUp } from '@mui/icons-material';
import { Box, Chip, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { useState } from 'react';
import { Asset } from '../../../domain/entities/assets/Asset';
import { Investment, InvestmentType } from '../../../domain/entities/assets/Investment';
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
      <TableRow key={transaction.id} sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box component="span" sx={{ fontWeight: 'medium' }}>
              {new Date(transaction.date).toLocaleDateString()}
            </Box>
            <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {new Date(transaction.date).toLocaleDateString('en-US', {
                weekday: 'short',
              })}
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={transaction.type === InvestmentType.BUY ? 'BUY' : 'SELL'}
            size="small"
            color={transaction.type === InvestmentType.BUY ? 'success' : 'error'}
            variant="filled"
            icon={transaction.type === InvestmentType.BUY ? <TrendingUp /> : <TrendingDown />}
            sx={{ fontWeight: 'bold', minWidth: '80px' }}
          />
        </TableCell>
        <TableCell align="right">
          <Box sx={{ fontWeight: 'medium' }}>
            {transaction.quantity !== undefined ? transaction.quantity.toLocaleString() : 'N/A'}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Box sx={{ fontWeight: 'medium' }}>
            {transaction.quantity && transaction.quantity > 0
              ? UIUtils.formatCurrency(transaction.getUnitPrice(), asset.currency)
              : UIUtils.formatCurrency(transaction.price, asset.currency)}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Box
            sx={{
              fontWeight: 'bold',
              color: transaction.type === InvestmentType.BUY ? 'success.main' : 'error.main',
            }}
          >
            {UIUtils.formatCurrency(getTotalAmount(transaction), asset.currency)}
          </Box>
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
