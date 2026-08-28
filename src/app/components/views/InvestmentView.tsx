import {
  CalendarToday,
  Delete,
  Edit,
  ShowChart,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
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

  // Helper function to get transaction type styling
  const getTransactionTypeStyles = (type: InvestmentType) => {
    return {
      isBuy: type === InvestmentType.BUY,
      color: type === InvestmentType.BUY ? ('success' as const) : ('error' as const),
      bgColor: type === InvestmentType.BUY ? ('success.light' as const) : ('error.light' as const),
      textColor: type === InvestmentType.BUY ? ('success.dark' as const) : ('error.dark' as const),
    };
  };

  // Helper function to format quantity display
  const formatQuantityDisplay = (): string => {
    if (investment.quantity === undefined || investment.quantity === 0) {
      return 'Lump Sum';
    }
    return investment.quantity.toLocaleString();
  };

  // Helper function to get relative time
  const getRelativeTimeInfo = (date: Date): string => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays <= 7) return `${diffInDays} days ago`;
    if (diffInDays <= 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays <= 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const typeStyles = getTransactionTypeStyles(investment.type);
  const transactionDate = new Date(investment.date);

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
      <TableRow
        key={investment.id}
        sx={{
          '&:hover': { backgroundColor: 'grey.50' },
          borderLeft: `4px solid`,
          borderLeftColor: typeStyles.isBuy ? 'success.main' : 'error.main',
        }}
      >
        {/* Date & Time Context */}
        <TableCell>
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {transactionDate.toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {transactionDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })} •{' '}
              {getRelativeTimeInfo(transactionDate)}
            </Typography>
          </Stack>
        </TableCell>

        {/* Transaction Type with Enhanced Visual */}
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Chip
              label={investment.type.toUpperCase()}
              size="medium"
              color={typeStyles.color}
              variant="filled"
              icon={typeStyles.isBuy ? <TrendingUp /> : <TrendingDown />}
              sx={{
                fontWeight: 'bold',
                minWidth: '90px',
                fontSize: '0.875rem',
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ShowChart fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {typeStyles.isBuy ? 'Investment' : 'Divestment'}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        {/* Quantity with Context */}
        <TableCell align="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '1rem' }}>
              {formatQuantityDisplay()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {investment.quantity !== undefined && investment.quantity > 0
                ? 'units'
                : 'transaction'}
            </Typography>
          </Box>
        </TableCell>

        {/* Unit Price with Better Formatting */}
        <TableCell align="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {investment.quantity && investment.quantity > 0
                ? UIUtils.formatCurrency(investment.getUnitPrice(), asset.currency)
                : UIUtils.formatCurrency(investment.totalAmount, asset.currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {investment.quantity && investment.quantity > 0 ? 'per unit' : 'total amount'}
            </Typography>
          </Box>
        </TableCell>

        {/* Total Amount with Emphasis */}
        <TableCell align="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: typeStyles.textColor,
                fontSize: '1.125rem',
              }}
            >
              {typeStyles.isBuy ? '+' : '-'}
              {UIUtils.formatCurrency(getTotalAmount(investment), asset.currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              total {typeStyles.isBuy ? 'invested' : 'withdrawn'}
            </Typography>
          </Box>
        </TableCell>

        {/* Actions with Better Accessibility */}
        <TableCell align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit Investment Transaction" arrow>
              <IconButton
                size="small"
                onClick={() => setShowTransactionEdit(true)}
                aria-label="edit investment transaction"
                color="primary"
                sx={{
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.dark',
                  },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Investment Transaction" arrow>
              <IconButton
                size="small"
                onClick={() => deleteInvestment(investment.id!)}
                aria-label="delete investment transaction"
                color="error"
                sx={{
                  '&:hover': {
                    backgroundColor: 'error.light',
                    color: 'error.dark',
                  },
                }}
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
