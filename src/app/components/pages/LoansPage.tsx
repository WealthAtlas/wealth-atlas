import { Loan } from '@/domain/entities/loans/Loan';
import { LoanSummary } from '@/domain/services/LoanService';
import { Add } from '@mui/icons-material';
import { Box, Button, Fab, Grid, Paper, Typography } from '@mui/material';
import { UIUtils } from '../../utils/UIUtils';

export interface LoansPageProps {
  loans: Loan[];
  loanSummaries: LoanSummary[];
  showAddLoan: boolean;
  portfolioMetrics: {
    totalOutstanding: number;
    totalPaid: number;
    totalInterestPaid: number;
    totalLoans: number;
  };
  refresh: () => void;
  deleteLoan: (id: number) => void;
  setShowAddLoan: (show: boolean) => void;
}

export function LoansPage({
  loans,
  loanSummaries,
  showAddLoan,
  portfolioMetrics,
  refresh,
  deleteLoan,
  setShowAddLoan,
}: LoansPageProps) {
  return (
    <>
      {/* TODO: Add LoanFormContainer when it's created */}
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
                  {UIUtils.formatCurrency(portfolioMetrics.totalOutstanding, 'INR')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="h6">
                  {UIUtils.formatCurrency(portfolioMetrics.totalPaid, 'INR')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Interest Paid
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {UIUtils.formatCurrency(portfolioMetrics.totalInterestPaid, 'INR')}
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

        <Grid container spacing={3}>
          {loanSummaries.map(summary => (
            <Grid item xs={12} sm={6} md={4} key={summary.loan.id}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {summary.loan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {summary.loan.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Principal:</Typography>
                    <Typography variant="body2">
                      {UIUtils.formatCurrency(summary.loan.principalAmount, summary.loan.currency)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Remaining:</Typography>
                    <Typography
                      variant="body2"
                      color={summary.remainingBalance > 0 ? 'error.main' : 'success.main'}
                    >
                      {UIUtils.formatCurrency(summary.remainingBalance, summary.loan.currency)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Paid:</Typography>
                    <Typography variant="body2" color="success.main">
                      {UIUtils.formatCurrency(summary.totalPaid, summary.loan.currency)}
                    </Typography>
                  </Box>
                  {summary.isFullyPaid && (
                    <Typography
                      variant="body2"
                      color="success.main"
                      sx={{ fontWeight: 'bold', mt: 1 }}
                    >
                      ✓ Fully Paid
                    </Typography>
                  )}
                  {summary.nextPaymentDate && !summary.isFullyPaid && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Next Payment: {UIUtils.formatDate(summary.nextPaymentDate)}
                    </Typography>
                  )}
                  {summary.overduePayments.length > 0 && (
                    <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                      ⚠ {summary.overduePayments.length} overdue payment(s)
                    </Typography>
                  )}
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => deleteLoan(summary.loan.id!)}
                    color="error"
                  >
                    Delete
                  </Button>
                </Box>
              </Paper>
            </Grid>
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
