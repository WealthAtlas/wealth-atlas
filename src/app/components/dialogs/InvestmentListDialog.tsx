import { IAsset } from '@/domain/entities/assets/Asset';
import { Investment, InvestmentType } from '@/domain/entities/assets/Investment';
import { Add, Close, TrendingDown, TrendingUp } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
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
import { InvestmentFormContainer } from '../../containers/assets/investment/InvestmentFormContainer';
import { InvestmentViewContainer } from '../../containers/assets/investment/InvestmentViewContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface InvestmentListDialogProps {
  open: boolean;
  asset: IAsset;
  investments: Investment[];
  showAddTransaction: boolean;
  setShowAddTransaction: (show: boolean) => void;
  deleteInvestment: (id: number) => void;
  refresh: () => void;
  onClose: () => void;
}

export function InvestmentListDialog({
  open,
  asset,
  investments,
  showAddTransaction,
  setShowAddTransaction,
  deleteInvestment,
  refresh,
  onClose,
}: InvestmentListDialogProps) {
  // Calculate summary statistics
  const totalBuyTransactions = investments.filter(t => t.type === InvestmentType.BUY).length;
  const totalSellTransactions = investments.filter(t => t.type === InvestmentType.SELL).length;
  const totalInvested = investments
    .filter(t => t.type === InvestmentType.BUY)
    .reduce((sum, t) => sum + t.getTotalAmount(), 0);
  const totalRedeemed = investments
    .filter(t => t.type === InvestmentType.SELL)
    .reduce((sum, t) => sum + t.getTotalAmount(), 0);

  return (
    <>
      {showAddTransaction && (
        <InvestmentFormContainer
          open={showAddTransaction}
          asset={asset}
          investmentToEdit={undefined}
          onClose={() => {
            setShowAddTransaction(false);
            refresh();
          }}
        />
      )}
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Transactions - {asset.name}</Typography>
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
          {investments.length === 0 ? (
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
            <Box sx={{ space: 2 }}>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1,
                        }}
                      >
                        <TrendingUp color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="success.main">
                          {totalBuyTransactions}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Buy Orders
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1,
                        }}
                      >
                        <TrendingDown color="error" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="error.main">
                          {totalSellTransactions}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Sell Orders
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" color="success.main">
                        {UIUtils.formatCurrency(totalInvested, asset.currency)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Invested
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" color="error.main">
                        {UIUtils.formatCurrency(totalRedeemed, asset.currency)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Redeemed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Transactions Table */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Quantity
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Unit Price
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Total Amount
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {investments.map(transaction => (
                      <InvestmentViewContainer
                        key={transaction.id}
                        asset={asset}
                        investmentId={transaction.id!}
                        deleteInvestment={deleteInvestment}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
