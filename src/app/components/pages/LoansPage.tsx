import { Currency } from '@/domain/entities/shared/Currency';
import { Loan } from '@/domain/entities/loans/Loan';
import { Add } from '@mui/icons-material';
import { Alert, Box, Button, Fab, Grid, Paper, Typography } from '@mui/material';
import { LoanFormContainer } from '../../containers/loan/LoanFormContainer';
import { LoanViewContainer } from '../../containers/loan/LoanViewContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface LoansPageProps {
  loans: Loan[];
  showAddLoan: boolean;
  portfolioMetrics: {
    totalOutstanding: number;
    totalPaid: number;
    totalInterestAmount: number;
    totalLoans: number;
    currency: Currency;
    unratedCurrencies: Currency[];
  };
  refresh: () => void;
  deleteLoan: (id: number) => void;
  setShowAddLoan: (show: boolean) => void;
}

export function LoansPage({
  loans,
  showAddLoan,
  portfolioMetrics,
  refresh,
  deleteLoan,
  setShowAddLoan,
}: LoansPageProps) {
  return (
    <>
      <LoanFormContainer
        loanToEdit={undefined}
        onClose={() => {
          setShowAddLoan(false);
          refresh();
        }}
        open={showAddLoan}
      />
      <Box sx={{ p: 3, pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Loans
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Outstanding
                </Typography>
                <Typography variant="h6">
                  {UIUtils.formatCurrency(
                    portfolioMetrics.totalOutstanding,
                    portfolioMetrics.currency
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="h6">
                  {UIUtils.formatCurrency(portfolioMetrics.totalPaid, portfolioMetrics.currency)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Interest Amount
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {UIUtils.formatCurrency(
                    portfolioMetrics.totalInterestAmount,
                    portfolioMetrics.currency
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Loans
                </Typography>
                <Typography variant="h6">{portfolioMetrics.totalLoans}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {portfolioMetrics.unratedCurrencies.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Totals exclude loans in {portfolioMetrics.unratedCurrencies.join(', ')} — no exchange
            rate set. Add one in Settings.
          </Alert>
        )}

        <Grid container spacing={3}>
          {loans.map(loan => (
            <LoanViewContainer
              key={loan.id}
              loanId={loan.id!}
              deleteLoan={deleteLoan}
              refresh={refresh}
            />
          ))}
        </Grid>

        {loans.length === 0 && (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              No loans found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Track your loans and manage repayments effectively.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setShowAddLoan(true)}>
              Add Your First Loan
            </Button>
          </Paper>
        )}

        <Fab
          color="primary"
          aria-label="add loan"
          onClick={() => setShowAddLoan(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
          }}
        >
          <Add />
        </Fab>
      </Box>
    </>
  );
}
