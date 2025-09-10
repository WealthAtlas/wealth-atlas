import { UIUtils } from '@/app/utils/UIUtils';
import { Loan } from '@/domain/entities/loans/Loan';
import { LoanSummary } from '@/domain/services/LoanService';
import {
  AccessTime,
  CheckCircle,
  CreditCard,
  Delete,
  Edit,
  Payment,
  Schedule,
  TrendingFlat,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
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
  const theme = useTheme();

  // Enhanced status and color logic
  const getStatusConfig = () => {
    if (loanSummary.isFullyPaid) {
      return {
        status: 'Fully Paid',
        color: 'success.main',
        bgColor: alpha(theme.palette.success.main, 0.1),
        icon: <CheckCircle />,
        priority: 'success',
      };
    }
    if (loanSummary.overduePayments.length > 0) {
      return {
        status: `${loanSummary.overduePayments.length} Overdue`,
        color: 'error.main',
        bgColor: alpha(theme.palette.error.main, 0.1),
        icon: <Warning />,
        priority: 'critical',
      };
    }
    if (loanSummary.remainingBalance > 0) {
      return {
        status: 'Active',
        color: 'primary.main',
        bgColor: alpha(theme.palette.primary.main, 0.1),
        icon: <CreditCard />,
        priority: 'normal',
      };
    }
    return {
      status: 'Unknown',
      color: 'grey.600',
      bgColor: alpha(theme.palette.grey[600], 0.1),
      icon: <TrendingFlat />,
      priority: 'normal',
    };
  };

  const statusConfig = getStatusConfig();

  // Calculate repayment progress
  const totalPaid = loanSummary.totalPaid;
  const totalLoanAmount = loan.principalAmount + loanSummary.totalInterestPaid;
  const repaymentProgress = totalLoanAmount > 0 ? (totalPaid / totalLoanAmount) * 100 : 0;

  const getTrendIcon = () => {
    const irr = loan.getIRR();
    if (irr > 15) return <TrendingUp sx={{ color: 'error.main' }} />;
    if (irr > 8) return <TrendingUp sx={{ color: 'warning.main' }} />;
    return <TrendingFlat sx={{ color: 'success.main' }} />;
  };

  // Days until next payment
  const getDaysToNextPayment = () => {
    if (!loanSummary.nextPaymentDate || loanSummary.isFullyPaid) return null;
    const today = new Date();
    const nextPayment = new Date(loanSummary.nextPaymentDate);
    const diffTime = nextPayment.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysToNextPayment = getDaysToNextPayment();

  const getNextPaymentUrgency = () => {
    if (!daysToNextPayment) return null;
    if (daysToNextPayment < 0) return { color: 'error.main', text: 'Overdue' };
    if (daysToNextPayment <= 7) return { color: 'warning.main', text: 'Due Soon' };
    return { color: 'text.secondary', text: 'Upcoming' };
  };

  const nextPaymentUrgency = getNextPaymentUrgency();

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
        <Card
          elevation={3}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            transition: 'all 0.3s ease-in-out',
            overflow: 'hidden',
            '&:hover': {
              elevation: 8,
              transform: 'translateY(-4px)',
              borderColor: statusConfig.color,
              boxShadow: `0 12px 32px ${
                statusConfig.color === 'success.main'
                  ? alpha(theme.palette.success.main, 0.25)
                  : statusConfig.color === 'error.main'
                    ? alpha(theme.palette.error.main, 0.25)
                    : alpha(theme.palette.primary.main, 0.25)
              }`,
            },
          }}
        >
          {/* Status Header Band */}
          <Box
            sx={{
              bgcolor: statusConfig.color,
              color: 'white',
              py: 1,
              px: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {statusConfig.icon}
              <Typography variant="body2" fontWeight={600}>
                {statusConfig.status}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getTrendIcon()}
              <Typography variant="body2" fontWeight={600}>
                {UIUtils.formatPercentage(loan.getIRR())} IRR
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
            {/* Loan Header */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      color: 'text.primary',
                      wordBreak: 'break-word',
                    }}
                  >
                    {loan.name}
                  </Typography>
                  {loan.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {loan.description}
                    </Typography>
                  )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 2 }}>
                  <Tooltip title="Edit Loan">
                    <IconButton
                      size="small"
                      onClick={() => setShowEditLoan(true)}
                      sx={{
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' },
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Loan">
                    <IconButton
                      size="small"
                      onClick={() => deleteLoan(loan.id!)}
                      sx={{
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>

            {/* Debt Progress Visualization */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                border: `1px solid ${
                  statusConfig.color === 'success.main'
                    ? alpha(theme.palette.success.main, 0.2)
                    : statusConfig.color === 'error.main'
                      ? alpha(theme.palette.error.main, 0.2)
                      : alpha(theme.palette.primary.main, 0.2)
                }`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Repayment Progress
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: statusConfig.color }}>
                    {Math.round(repaymentProgress)}% paid
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(repaymentProgress, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: alpha(theme.palette.grey[400], 0.3),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: statusConfig.color,
                    },
                  }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Outstanding Balance
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      color: loanSummary.remainingBalance > 0 ? 'error.main' : 'success.main',
                    }}
                  >
                    {UIUtils.formatCurrency(loanSummary.remainingBalance, loan.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Paid
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {UIUtils.formatCurrency(totalPaid, loan.currency)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Key Financial Metrics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Principal Amount
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {UIUtils.formatCurrency(loan.principalAmount, loan.currency)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Interest Paid
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="warning.main">
                    {UIUtils.formatCurrency(loanSummary.totalInterestPaid, loan.currency)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Start Date
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {UIUtils.formatDate(loan.startDate)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Payments Made
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {loan.payments.length}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Next Payment Alert */}
            {!loanSummary.isFullyPaid && loanSummary.nextPaymentDate && nextPaymentUrgency && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  backgroundColor: alpha(
                    nextPaymentUrgency.color === 'error.main'
                      ? theme.palette.error.main
                      : nextPaymentUrgency.color === 'warning.main'
                        ? theme.palette.warning.main
                        : theme.palette.grey[600],
                    0.1
                  ),
                  border: `1px solid ${alpha(
                    nextPaymentUrgency.color === 'error.main'
                      ? theme.palette.error.main
                      : nextPaymentUrgency.color === 'warning.main'
                        ? theme.palette.warning.main
                        : theme.palette.grey[600],
                    0.3
                  )}`,
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTime sx={{ fontSize: 18, color: nextPaymentUrgency.color }} />
                  <Typography
                    variant="body2"
                    sx={{ color: nextPaymentUrgency.color, fontWeight: 600 }}
                  >
                    Next Payment {nextPaymentUrgency.text}
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={600}>
                  {UIUtils.formatDate(loanSummary.nextPaymentDate)}
                </Typography>
                {daysToNextPayment !== null && (
                  <Typography variant="caption" sx={{ color: nextPaymentUrgency.color }}>
                    {daysToNextPayment > 0
                      ? `in ${daysToNextPayment} day${daysToNextPayment !== 1 ? 's' : ''}`
                      : daysToNextPayment === 0
                        ? 'due today'
                        : `${Math.abs(daysToNextPayment)} day${Math.abs(daysToNextPayment) !== 1 ? 's' : ''} overdue`}
                  </Typography>
                )}
              </Paper>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={1} justifyContent="center">
              <Tooltip title="View Payment History">
                <IconButton
                  onClick={() => setShowPaymentList(true)}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'primary.main', color: 'white' },
                    flex: 1,
                    borderRadius: 2,
                    py: 1,
                  }}
                >
                  <Payment />
                  <Typography variant="caption" sx={{ ml: 1, fontWeight: 600 }}>
                    Payments
                  </Typography>
                </IconButton>
              </Tooltip>

              <Tooltip title="View EMI Schedules">
                <IconButton
                  onClick={() => setShowEMIList(true)}
                  sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    color: 'secondary.main',
                    '&:hover': { bgcolor: 'secondary.main', color: 'white' },
                    flex: 1,
                    borderRadius: 2,
                    py: 1,
                  }}
                >
                  <Schedule />
                  <Typography variant="caption" sx={{ ml: 1, fontWeight: 600 }}>
                    EMI ({loan.emis.length})
                  </Typography>
                </IconButton>
              </Tooltip>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </>
  );
}
