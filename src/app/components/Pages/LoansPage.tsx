import { Add, CheckCircle, Warning } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Fab,
  Grid,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';

export function LoansPage() {
  // Mock data - in real implementation, this would come from props
  const loans = [
    {
      id: 1,
      name: 'Home Mortgage',
      type: 'Mortgage',
      remainingBalance: '$245,000',
      originalAmount: '$300,000',
      interestRate: '3.25%',
      monthlyPayment: '$1,340',
      progress: 18.3, // Percentage paid off
      status: 'active',
    },
    {
      id: 2,
      name: 'Car Loan',
      type: 'Auto',
      remainingBalance: '$18,500',
      originalAmount: '$25,000',
      interestRate: '4.5%',
      monthlyPayment: '$465',
      progress: 26.0,
      status: 'active',
    },
    {
      id: 3,
      name: 'Student Loan',
      type: 'Education',
      remainingBalance: '$12,300',
      originalAmount: '$45,000',
      interestRate: '5.8%',
      monthlyPayment: '$320',
      progress: 72.7,
      status: 'active',
    },
  ];

  const totalRemaining = '$275,800';
  const totalMonthlyPayment = '$2,125';

  const getStatusColor = (
    status: string
  ): 'primary' | 'secondary' | 'error' | 'success' | 'default' => {
    switch (status) {
      case 'active':
        return 'primary';
      case 'overdue':
        return 'error';
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Warning />;
      case 'paid':
        return <CheckCircle />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Loans
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Total Remaining: {totalRemaining}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monthly Payments: {totalMonthlyPayment}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {loans.map(loan => (
          <Grid item xs={12} lg={6} key={loan.id}>
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
                  <Box>
                    <Typography variant="h6" component="div" gutterBottom>
                      {loan.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={loan.type} size="small" variant="outlined" />
                      {getStatusIcon(loan.status) ? (
                        <Chip
                          label={loan.status}
                          size="small"
                          color={getStatusColor(loan.status)}
                          icon={getStatusIcon(loan.status)!}
                        />
                      ) : (
                        <Chip
                          label={loan.status}
                          size="small"
                          color={getStatusColor(loan.status)}
                        />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="h5" component="div">
                    {loan.remainingBalance}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {loan.progress.toFixed(1)}% paid off
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={loan.progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Interest Rate
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {loan.interestRate}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Monthly Payment
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {loan.monthlyPayment}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loans.length === 0 && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            No loans found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Track your loans to better manage your debt and payments.
          </Typography>
          <Button variant="contained" startIcon={<Add />}>
            Add Your First Loan
          </Button>
        </Paper>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add loan"
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
