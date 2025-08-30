import { Asset } from '@/domain/entities/assets/Asset';
import { Investment } from '@/domain/entities/assets/Investment';
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
import { InvestmentFormContainer } from '../../containers/assets/investment/InvestmentFormContainer';
import { InvestmentViewContainer } from '../../containers/assets/investment/InvestmentViewContainer';

export interface InvestmentListDialogProps {
  open: boolean;
  asset: Asset;
  investments: Investment[];
  onClose: () => void;
  refresh: () => void;
}

export function InvestmentListDialog({
  open,
  asset,
  investments,
  onClose,
  refresh,
}: InvestmentListDialogProps) {
  const [showAddTransaction, setShowAddTransaction] = useState<boolean>(false);

  const sortedTransactions = [...investments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      {showAddTransaction && (
        <InvestmentFormContainer
          open={showAddTransaction}
          asset={asset}
          investmentToEdit={undefined}
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
                    <InvestmentViewContainer
                      key={transaction.id}
                      asset={asset}
                      transaction={transaction}
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
