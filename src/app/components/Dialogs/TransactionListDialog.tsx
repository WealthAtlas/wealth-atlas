import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { Add, Close } from '@mui/icons-material';
import {
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { TransactionFormContainer } from '../../containers/assets/transactions/TransactionFormContainer';
import { TransactionViewContainer } from '../../containers/assets/transactions/TransactionViewContainer';

export interface TransactionListDialogProps {
  open: boolean;
  asset: Asset;
  transactions: AssetTransaction[];
  onClose: () => void;
  refresh: () => void;
}

export function TransactionListDialog({
  open,
  asset,
  transactions,
  onClose,
  refresh,
}: TransactionListDialogProps) {
  const [showAddTransaction, setShowAddTransaction] = useState<boolean>(false);

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      {showAddTransaction && (
        <TransactionFormContainer
          open={showAddTransaction}
          asset={asset}
          transactionToEdit={undefined}
          onClose={() => setShowAddTransaction(false)}
          onSuccess={() => {
            setShowAddTransaction(false);
            refresh();
          }}
        />
      )}
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Transactions for {asset.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
                size="small"
              >
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
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
              >
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
                    <TransactionViewContainer
                      key={transaction.id}
                      asset={asset}
                      transaction={transaction}
                      addTransaction={() => setShowAddTransaction(true)}
                      refresh={refresh}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
