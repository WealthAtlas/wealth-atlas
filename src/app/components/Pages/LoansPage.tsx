import { Loan } from '@/domain/entities/loans/Loan';
import { IRRAnalysisService } from '@/domain/services/IRRAnalysisService';
import { LoanSummary } from '@/domain/services/LoanService';
import { Add, CheckCircle, Delete, Edit, History, Schedule, Warning } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fab,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';

export interface LoansPageProps {
  loanSummaries: LoanSummary[];
  isLoading: boolean;
  onAddLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (loan: Loan) => void;
  onAddSchedule: (loan: Loan) => void;
  onViewPaymentHistory: (loan: Loan) => void;
  onViewIRRAnalysis: (summary: LoanSummary) => void;
}

export function LoansPage({
  loanSummaries,
  isLoading,
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onAddSchedule,
  onViewPaymentHistory,
  onViewIRRAnalysis,
}: LoansPageProps) {
  const formatCurrency = (amount: number, currency: string): string => {
    // Simple currency formatting - could be enhanced with proper locale support
    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatEnhancedIRR = (
    summary: LoanSummary
  ): {
    primary: string;
    secondary: string;
    tooltip: string;
  } => {
    return IRRAnalysisService.formatIRR(summary.irrAnalysis);
  };

  // Calculate total remaining balance across all loans
  const totalRemainingBalance = loanSummaries.reduce((sum, summary) => {
    return sum + summary.remainingBalance;
  }, 0);

  const totalInterestPaid = loanSummaries.reduce((sum, summary) => {
    return sum + summary.totalInterestPaid;
  }, 0);

  // Use the first loan's currency for totals (could be enhanced for multi-currency)
  const baseCurrency = loanSummaries.length > 0 ? loanSummaries[0].loan.currency : 'USD';

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 200px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Loans
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Total Balance: {formatCurrency(totalRemainingBalance, baseCurrency)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Interest Paid: {formatCurrency(totalInterestPaid, baseCurrency)}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {loanSummaries.map(summary => {
          const { loan } = summary;
          const progress =
            loan.principalAmount > 0
              ? (summary.totalPaid / (summary.totalPaid + summary.remainingBalance)) * 100
              : 0;

          return (
            <Grid item xs={12} md={6} key={loan.id}>
              <Card elevation={2}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" component="div" sx={{ flex: 1 }}>
                          {loan.name}
                        </Typography>
                        <Tooltip title="Add Schedule">
                          <IconButton
                            size="small"
                            onClick={() => onAddSchedule(loan)}
                            aria-label="add schedule"
                          >
                            <Schedule fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Payment History">
                          <IconButton
                            size="small"
                            onClick={() => onViewPaymentHistory(loan)}
                            aria-label="view payment history"
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={() => onEditLoan(loan)}
                          aria-label="edit loan"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <Tooltip title="Delete Loan">
                          <IconButton
                            size="small"
                            onClick={() => onDeleteLoan(loan)}
                            aria-label="delete loan"
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {loan.lenderName}
                        </Typography>

                        {summary.isFullyPaid ? (
                          <Chip
                            icon={<CheckCircle />}
                            label="Paid Off"
                            color="success"
                            size="small"
                          />
                        ) : summary.overduePayments.length > 0 ? (
                          <Chip
                            icon={<Warning />}
                            label={`${summary.overduePayments.length} Overdue`}
                            color="error"
                            size="small"
                          />
                        ) : (
                          <Chip label="Active" color="primary" size="small" variant="outlined" />
                        )}
                      </Box>

                      {loan.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {loan.description}
                        </Typography>
                      )}

                      {/* Progress Bar */}
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {progress.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(progress, 100)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      {/* Next Payment Info */}
                      {summary.nextPaymentDate && !summary.isFullyPaid && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1, display: 'block' }}
                        >
                          Next payment: {summary.nextPaymentDate.toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ textAlign: 'right', ml: 2 }}>
                      <Typography variant="h5" component="div">
                        {formatCurrency(summary.remainingBalance, loan.currency)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        of {formatCurrency(loan.principalAmount, loan.currency)}
                      </Typography>
                      {(() => {
                        const irrFormatted = formatEnhancedIRR(summary);
                        return (
                          <Tooltip
                            title={`${irrFormatted.tooltip}\n\nClick for detailed analysis`}
                            arrow
                          >
                            <Box
                              sx={{
                                display: 'inline-block',
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                  borderRadius: 1,
                                },
                                p: 0.5,
                                borderRadius: 1,
                              }}
                              onClick={() => onViewIRRAnalysis(summary)}
                            >
                              <Typography
                                variant="caption"
                                color="primary"
                                sx={{ display: 'block', fontWeight: 'medium' }}
                              >
                                Interest: {irrFormatted.primary}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {irrFormatted.secondary} • Click for details
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      })()}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        Paid: {formatCurrency(summary.totalInterestPaid, loan.currency)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {loanSummaries.length === 0 && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            No loans found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Start tracking your loans by adding your first loan.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={onAddLoan}>
            Add Your First Loan
          </Button>
        </Paper>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add loan"
        onClick={onAddLoan}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
        }}
      >
        <Add />
      </Fab>
    </Box>
  );
}
