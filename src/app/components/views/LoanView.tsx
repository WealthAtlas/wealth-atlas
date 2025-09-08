import { UIUtils } from '@/app/utils/UIUtils';
import { Loan } from '@/domain/entities/loans/Loan';
import { LoanSummary } from '@/domain/services/LoanService';
import {
  Delete,
  Edit,
  Payment,
  Schedule,
  TrendingDown,
  TrendingFlat,
  TrendingUp,
} from '@mui/icons-material';
import { Box, Card, CardContent, Chip, Divider, Grid, IconButton, Typography } from '@mui/material';
import { LoanFormContainer } from '../../containers/loan/LoanFormContainer';

export interface LoanViewProps {
  loan: Loan;
  loanSummary: LoanSummary;
  showEditLoan: boolean;
  setShowEditLoan: (show: boolean) => void;
  showEMIList: boolean;
  setShowEMIList: (show: boolean) => void;
  showPaymentList: boolean;
  setShowPaymentList: (show: boolean) => void;
  deleteLoan: (id: number) => void;
  refresh: () => void;
}

export function LoanView({
  loan,
  loanSummary,
  deleteLoan,
  setShowEditLoan,
  showEditLoan,
  setShowEMIList,
  setShowPaymentList,
  refresh,
}: LoanViewProps) {
  // Color coding for loan status
  const getStatusColor = () => {
    if (loanSummary.isFullyPaid) return 'success.main';
    if (loanSummary.overduePayments.length > 0) return 'error.main';
    if (loanSummary.remainingBalance > 0) return 'warning.main';
    return 'text.secondary';
  };

  const getStatusIcon = () => {
    if (loanSummary.isFullyPaid) return <TrendingUp />;
    if (loanSummary.overduePayments.length > 0) return <TrendingDown />;
    return <TrendingFlat />;
  };

  const getStatusText = () => {
    if (loanSummary.isFullyPaid) return 'Fully Paid';
    if (loanSummary.overduePayments.length > 0)
      return `${loanSummary.overduePayments.length} Overdue`;
    return 'Active';
  };

  return (
    <>
      <LoanFormContainer
        loanToEdit={loan}
        onClose={() => {
          setShowEditLoan(false);
          refresh();
        }}
        open={showEditLoan}
      />
      <Grid item xs={12} sm={6} md={4}>
        <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1 }}>
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2,
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h6" gutterBottom noWrap title={loan.name}>
                  {loan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {loan.description}
                </Typography>
                <Chip
                  icon={getStatusIcon()}
                  label={getStatusText()}
                  size="small"
                  sx={{ color: getStatusColor() }}
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <IconButton size="small" onClick={() => setShowEditLoan(true)} title="Edit Loan">
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => deleteLoan(loan.id!)}
                  color="error"
                  title="Delete Loan"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Financial Metrics */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Principal Amount:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {UIUtils.formatCurrency(loan.principalAmount, loan.currency)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Outstanding:
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="medium"
                  color={loanSummary.remainingBalance > 0 ? 'error.main' : 'success.main'}
                >
                  {UIUtils.formatCurrency(loanSummary.remainingBalance, loan.currency)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Total Paid:
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="success.main">
                  {UIUtils.formatCurrency(loanSummary.totalPaid, loan.currency)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Interest Paid:
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="warning.main">
                  {UIUtils.formatCurrency(loanSummary.totalInterestPaid, loan.currency)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  IRR:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {UIUtils.formatPercentage(loan.getIRR())}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Start Date:
                </Typography>
                <Typography variant="body2">{UIUtils.formatDate(loan.startDate)}</Typography>
              </Box>

              {loanSummary.nextPaymentDate && !loanSummary.isFullyPaid && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Next Payment:
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    {UIUtils.formatDate(loanSummary.nextPaymentDate)}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Payment History Summary */}
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Payments Made:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {loan.payments.length}
                  </Typography>
                  <IconButton
                    size="small"
                    title={loan.payments.length > 0 ? 'View Payment History' : 'Manage Payments'}
                    onClick={() => setShowPaymentList(true)}
                  >
                    <Payment fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </>

            {/* EMI Schedule Summary */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                EMI Schedules:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {loan.emis.length}
                </Typography>
                <IconButton
                  size="small"
                  title={loan.emis.length > 0 ? 'View EMI Schedules' : 'Manage EMI Schedules'}
                  onClick={() => setShowEMIList(true)}
                >
                  <Schedule fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </>
  );
}
