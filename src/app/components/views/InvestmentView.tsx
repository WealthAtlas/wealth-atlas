import { Delete, Edit, TrendingDown, TrendingUp } from '@mui/icons-material';
import { Box, Chip, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { IAsset } from '../../../domain/entities/assets/Asset';
import { Investment, InvestmentType } from '../../../domain/entities/assets/Investment';
import { InvestmentFormContainer } from '../../containers/assets/investment/InvestmentFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface InvestmentViewProps {
  asset: IAsset;
  investment: Investment;
  showTransactionEdit: boolean;
  setShowTransactionEdit: (show: boolean) => void;
  deleteInvestment: (id: number) => void;
  refresh: () => void;
}

export function InvestmentView({
  asset,
  investment,
  showTransactionEdit,
  setShowTransactionEdit,
  deleteInvestment,
  refresh,
}: InvestmentViewProps) {
  const getTotalAmount = (transaction: Investment): number => {
    return transaction.getTotalAmount();
  };

  return (
    <>
      {showTransactionEdit && (
        <InvestmentFormContainer
          open={showTransactionEdit}
          asset={asset}
          investmentToEdit={investment}
          onClose={() => {
            setShowTransactionEdit(false);
            refresh();
          }}
        />
      )}
      <TableRow key={investment.id} sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box component="span" sx={{ fontWeight: 'medium' }}>
              {new Date(investment.date).toLocaleDateString()}
            </Box>
            <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {new Date(investment.date).toLocaleDateString('en-US', {
                weekday: 'short',
              })}
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={investment.type === InvestmentType.BUY ? 'BUY' : 'SELL'}
            size="small"
            color={investment.type === InvestmentType.BUY ? 'success' : 'error'}
            variant="filled"
            icon={investment.type === InvestmentType.BUY ? <TrendingUp /> : <TrendingDown />}
            sx={{ fontWeight: 'bold', minWidth: '80px' }}
          />
        </TableCell>
        <TableCell align="right">
          <Box sx={{ fontWeight: 'medium' }}>
            {investment.quantity !== undefined ? investment.quantity.toLocaleString() : 'N/A'}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Box sx={{ fontWeight: 'medium' }}>
            {investment.quantity && investment.quantity > 0
              ? UIUtils.formatCurrency(investment.getUnitPrice(), asset.currency)
              : UIUtils.formatCurrency(investment.price, asset.currency)}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Box
            sx={{
              fontWeight: 'bold',
              color: investment.type === InvestmentType.BUY ? 'success.main' : 'error.main',
            }}
          >
            {UIUtils.formatCurrency(getTotalAmount(investment), asset.currency)}
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
                onClick={() => deleteInvestment(investment.id!)}
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
