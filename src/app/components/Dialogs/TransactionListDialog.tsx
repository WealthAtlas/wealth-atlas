import { Asset } from '@/domain/entities/Asset';
import { AssetTransaction } from '@/domain/entities/AssetTransaction';
import { Add, Close, Delete, Edit } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

export interface TransactionListDialogProps {
  open: boolean;
  asset: Asset | null;
  transactions: AssetTransaction[];
  onClose: () => void;
  onAddTransaction: () => void;
  onEditTransaction: (transaction: AssetTransaction) => void;
  onDeleteTransaction: (transaction: AssetTransaction) => void;
}

export function TransactionListDialog({
  open,
  asset,
  transactions,
  onClose,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionListDialogProps) {
  if (!asset) return null;

  const formatCurrency = (amount: number, currency: string): string => {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getTotalAmount = (transaction: AssetTransaction): number => {
    return transaction.getTotalAmount();
  };

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Transactions for {asset.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<Add />} onClick={onAddTransaction} size="small">
              Add Transaction
            </Button>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {sortedTransactions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              No transactions found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Start tracking your investments by adding your first transaction.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={onAddTransaction}>
              Add First Transaction
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTransactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.transactionType.toUpperCase()}
                        size="small"
                        color={transaction.transactionType === 'buy' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {transaction.quantity !== undefined
                        ? transaction.quantity.toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(transaction.price, asset.currency)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(getTotalAmount(transaction), asset.currency)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit Transaction">
                          <IconButton
                            size="small"
                            onClick={() => onEditTransaction(transaction)}
                            aria-label="edit transaction"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Transaction">
                          <IconButton
                            size="small"
                            onClick={() => onDeleteTransaction(transaction)}
                            aria-label="delete transaction"
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
